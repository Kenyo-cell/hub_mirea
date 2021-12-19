const asyncHandler = require("express-async-handler");
const express = require('express');
const path = require('path');
const mysql = require("mysql2");
const fs = require('fs');
const multer = require('multer');
const crypto = require("crypto").createHash;
const { User, Hub, Room, Tag, Message } = require('./db');

const upload = multer({
    dest: __dirname + "/uploads/"
});

const db = mysql.createConnection({
    host: "localhost",
    user: "Kenyo",
    database: "multichat_server",
    password: "N!njad3vper"
});

const router = express.Router();

const profilePictureUploadPath = __dirname + '/uploads/profiles_pictures';
const hubPictureUploadPath = __dirname + '/uploads/hub_pictures';
const messageFileUploadPath = __dirname+ '/uploads/message_files';

const constructPath = (pageName) => {
    return path.join(__dirname + '/static/' + pageName);
};

const sha1 = (text) => {
    return crypto('sha1').update(text).digest('hex');
};

const generateToken = async (user) => {
    return Buffer.from(`${user.login}:${user.password}`).toString('base64');
};

const generateLink = (hubName) => {
    return sha1(hubName + Date.now);
}

const saveFile = async (file, newPath) => {
    const ext = path.extname(file.originalname);
    const oldPath = file.path;
    const fileName = sha1(file.originalname + Date.now) + ext;
    const fullname = newPath + '/' + fileName;

    fs.rename(oldPath, fullname, err => {});

    return fileName;
};

const processToken = async (req, res, next) => {
    const token = req.query.token;
    if (token) {
        const [ login, hash ] = Buffer.from(token, 'base64').toString().split(':');
        const user = await User.findOne({
            where: {
                login: login,
                password: hash
            }
        }).then(v => v);
        req.loginedUser = user;
    }
    next();
};

router.use(processToken);

router.get('/', (req, res) => {
    res.redirect('/sign');
});

router.get('/sign', (req, res) => {
    res.sendFile(constructPath('sign.html'));
});

router.post('/auth', async (req, res) => {
    const { login, pass } = req.body;

    const hash = sha1(pass);

    const loginedUser = await User.findOne({
        where: {
            login: login,
            password: hash
        }
    }).then(v => v);

    if (loginedUser == null) {
        res.render('error', { msg: `login ${login} or password was wrong` });
    } else {
        const token = await generateToken(loginedUser);
        res.redirect(`/userpage?token=${token}`);
    }
});

router.get('/register', (req, res) => {
    res.sendFile(constructPath('register.html'));
});

router.post('/register', upload.single("picture"), async (req, res) => {
    const { login, pass } = req.body;
    const user = await User.findOne({ where: { login: login } }).then(v => v);

    if (user == null) {
        const userModel = { login: login, password: sha1(pass) };
        if (req.file) userModel.imagePath = await saveFile(req.file, profilePictureUploadPath);

        const savedUser = await User.create(userModel).then(v => v);
        if (savedUser == null) res.render('error', { msg: `something went wrong`});
        else {
            const token = await generateToken(savedUser);
            res.redirect(`/userpage?token=${token}`);
        }
    } else {
        fs.unlink(req.file.path, err => {
            if (err) console.log(err.message);
        });
        res.render('error', { msg: `user ${login} already exists` });
    }
});

router.get('/userpage', async (req, res) => {
    if (req.loginedUser == null) res.render('error', { msg: 'need auth' });
    else {
        const user = req.loginedUser.dataValues;
        const tags = await (await Tag.findAll({ where: { userLogin: user.login }, include: [Hub]})
            .then(v => v)).map(item => item.dataValues);

        const hubs = [...new Map(tags.map((item) =>  item.hub.dataValues).map(item => [item["id"], item])).values()];
        res.render('userpage', {
            login: user.login,
            picture: user.imagePath,
            hubs: hubs,
            token: req.query.token
        });
    }
});

router.get('/editProfile', (req, res) => {
    if (req.loginedUser == null) res.render('error', { msg: 'need auth' });
    res.render('editProfile', { login: req.loginedUser.login, token: req.query.token })
});

router.post('/editProfile', upload.single("picture"), async (req, res) => {
    if (req.loginedUser == null) res.render('error', { msg: 'need auth' });
    else {
        const user = req.loginedUser;
        const { login, password } = req.body;
        if (req.file) user.imagePath = await saveFile(req.file, profilePictureUploadPath);

        user.login = login;
        if (password == undefined) user.password = sha1(password);

        await user.save();
        const token = await generateToken(user);

        res.redirect(`/userpage?token=${token}`);
    }
});

router.get('/enterHub', (req, res) => {
    if (req.loginedUser == null) res.render('error', { msg: 'need auth' });
    res.render('enterHub', { token: req.query.token });
});

router.post('/enterHub', async (req, res) => {
    if (req.loginedUser == null) res.render('error', { msg: 'need auth' });
    else {
        const user = req.loginedUser;
        const { link } = req.body;
        const hub = await Hub.findOne({ where: { link: link} });
        
        if (hub == null) res.render('error', { msg: 'unknown hub link'});
        const tag = await Tag.findOrCreate({ where: { hubId: hub.id, userLogin: user.login, name: 'user' } });

        res.redirect(`/hub/${link}?token=${req.query.token}`);
    }
});

router.get('/createHub', (req, res) => {
    res.render('createHub', { token: req.query.token });
});

router.post('/createHub', upload.single('picture'), async (req, res) => {
    if (req.loginedUser == null) res.render('error', { msg: 'need auth' });
    else {
        const user = req.loginedUser;
        const { hubName } = req.body;
        const hub = Hub.build({
            hubName: hubName,
            link: generateLink(hubName)
        });
        if (req.file) hub.imagePath = await saveFile(req.file, hubPictureUploadPath);
        const savedHub = (await hub.save()).dataValues;

        const initTag = await Tag.create({
            name: 'user',
            hubId: savedHub.id,
            userLogin: user.login
        });

        const initRoom = await Room.create({
            name: 'Chat',
            hubId: savedHub.id
        });

        res.redirect(`/hub/${hub.link}?token=${req.query.token}`);        
    }
});

router.get('/hub/:link', async (req, res) => {
    if (req.loginedUser == null) res.render('error', { msg: 'need auth' });
    else {
        const user = req.loginedUser;
        const { link } = req.params;

        const hub = (await Hub.findOne({ where: { link: link }})).dataValues;
        const tags = (await Tag.findAll(
            {
                where: {
                    hubId: hub.id,
                    userLogin: user.login                        
                }
            }
        )).dataValues;

        const room = (await Room.findOne({ where: { hubId: hub.id }})).dataValues;
        
        res.render('hub', {
           token: req.query.token,
           user: user,
           hub: hub,
           room: room
        });
    }
});

router.get('/user/:login', async (req, res) => {
    const { login } = req.params;
    const user = (await User.findOne({ where: { login: login } })).dataValues;
    res.json(user);
});

router.get('/hub/:hubLink/room/:roomName', async (req, res) => {
    if (req.loginedUser == null) res.render('error', { msg: 'need auth' });
    else {
        const user = req.loginedUser;
        const { hubLink, roomName } = req.params;
        const hub = await (await Hub.findOne({ where: { link: hubLink } })).dataValues;
        let messages = await Message.findAll({
            where: {
                roomName: roomName,
                hubId: hub.id
            },
            include: [User],
            order: ['time']
        });

        messages = messages.map(message => message.dataValues);

        res.json(JSON.stringify(messages));
    }
});

router.post('/hub/:hubLink/room/:roomName', async (req, res) => {
    if (req.loginedUser == null) res.render('error', { msg: 'need auth' });
    else {
        const { hubLink, roomName } = req.params;
        const { msg } = req.body;

        const hub = await Hub.findOne({
            where: { link: hubLink }
        });

        const tag = await Tag.findOne({
            where: {
                hubId: hub.id,
                userLogin: req.loginedUser.login
            }
        })

        const message = Message.build({
            tagName: tag.name,
            hubId: hub.id,
            roomName: roomName,
            userLogin: req.loginedUser.login,
            content: msg
        });

        await message.save()

        res.status(200).send();
    }
});

router.post('/hub/:hubLink/room/:roomName/file', upload.single('file'), async (req, res) => {
    if (req.loginedUser == null) res.render('error', { msg: 'need auth' });
    else {
        const { hubLink, roomName } = req.params;
        
        const imagePath = await saveFile(req.file, messageFileUploadPath);

        const hub = await Hub.findOne({
            where: { link: hubLink }
        });

        const tag = await Tag.findOne({
            where: {
                hubId: hub.id,
                userLogin: req.loginedUser.login
            }
        })

        const message = Message.build({
            tagName: tag.name,
            hubId: hub.id,
            roomName: roomName,
            userLogin: req.loginedUser.login,
            content: imagePath,
            datatype: imagePath.split('.').pop().toUpperCase()
        });

        await message.save()

        res.status(200).send();
    }
});

module.exports = router;