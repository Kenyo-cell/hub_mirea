"use strict";

const getHubLink = () => {
    const url = document.URL;
    const splitted = url.split('/');
    const index = splitted.indexOf('hub') + 1;
    return splitted[index].split('?')[0];
}

const ws = new WebSocket('ws://localhost:3030');
let messageBox = document.getElementById('message-box');
const emptyMessageBox = messageBox.cloneNode(true);
const sendButton = document.getElementById('send-button');
const login =  document.getElementById('login').innerHTML;
const hubLink = getHubLink();
const selector = document.getElementById('datatype-selector');
const filterButton = document.getElementById('filter-button');
const restoreButton = document.getElementById('restore-button');
let fileInput = document.getElementById('file-input');
const emptyFileInput = fileInput.cloneNode(true);
const roomName = document.getElementsByClassName('room-example')[0].innerHTML;
const datatypes = [];
const { token } = Object.fromEntries(new URLSearchParams(window.location.search).entries());

const initMessages = async () => {
    const messages = JSON.parse(await (await fetch(`/hub/${hubLink}/room/${roomName}?token=${token}`)).json());
    messages.forEach(message => {
        if (datatypes.indexOf(message.datatype) == -1) {
            datatypes.push(message.datatype);
        }

        messageBox.appendChild(createMessage(message.content, message.user.imagePath, message.datatype));
    });

    updateTypes();

    messageBox.scrollTo(0, 99999999999999);
};

const updateTypes = () => {
    selector.innerHTML = '';
    datatypes.forEach(el => {
        const option = document.createElement('option');
        option.innerHTML = el;
        selector.appendChild(option);
    });
};

const onFilter = async () => {
    const type = selector.value;
    let messages = JSON.parse(await (await fetch(`/hub/${hubLink}/room/${roomName}?token=${token}`)).json());
    messages = messages.filter(message => message.datatype == type);
    console.log(messages);
    messageBox.innerHTML = emptyMessageBox.innerHTML;
    messages.forEach(message => {
        messageBox.appendChild(createMessage(message.content, message.user.imagePath, message.datatype))
    });
    messageBox.scrollTo(0, 99999999999999);
};

const onDefault = async () => {
    messageBox.innerHTML = emptyMessageBox.innerHTML;
    initMessages();
}

let pageUser = {};

let query = fetch(`http://localhost:3030/user/${login}`);

query.then(function(response) {
  response.json().then(function(data) {
    pageUser = data;
  });
});


const createMessage = (text, imagePath, type) => {
    const div = document.createElement('div');
    const imageBox = document.createElement('div');
    imageBox.classList = 'image-box';
    const image = document.createElement('img');
    imageBox.appendChild(image);
    image.src = `http://localhost:3030/profilePictures/${imagePath}`;
    image.classList = 'message-profile-picture';

    const textBox = document.createElement('div');
    textBox.classList = 'text-box';
    if (type == 'TEXT') {
        textBox.innerHTML = text;
    } else {
        const link = document.createElement('a');
        link.href = `http://localhost:3030/messageFiles/${text}`;
        link.innerHTML = text;
        textBox.appendChild(link);
    }
    div.appendChild(imageBox);
    div.appendChild(textBox);
    div.classList = 'message';
    updateTypes();
    return div;
};

ws.onopen = (e) => {
    ws.send(JSON.stringify({ id: {
        hubLink: hubLink,
        roomName: roomName,
        userLogin: login
    } }));
};

ws.onmessage = (e) => {
    const { user, content, contentType } = JSON.parse(e.data);
    messageBox.appendChild(createMessage(content, user.imagePath, contentType));
};

ws.onclose = (e) => {
    console.log("connection refused");
};

sendButton.addEventListener('click', async () => {
    const textInput = document.getElementById('text-input');
    const message = textInput.value;

    if (fileInput.files.length != 0) {
        let file = fileInput.files[0];

        let fd = new FormData();
        fd.append('file', file);

        let fresponse = await fetch(`http://localhost:3030/hub/${hubLink}/room/${roomName}/file?token=${token}`, {
            method: 'POST',
            body: fd
        });
        fileInput = emptyFileInput;

        ws.send(JSON.stringify({
            user: pageUser,
            hubLink: hubLink,
            roomName: roomName,
            content: file.name,
            contentType: 'FILE'
        }));
    }

    if (textInput.value && textInput.value != '') {
        let response = await fetch(`http://localhost:3030/hub/${hubLink}/room/${roomName}?token=${token}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json;charset=utf-8'
            },
            body: JSON.stringify({ msg: message })
        });

        ws.send(JSON.stringify({
            user: pageUser,
            hubLink: hubLink,
            roomName: roomName,
            content: message,
            contentType: 'TEXT'
        }));

        textInput.value = '';
    }
});

initMessages();
filterButton.onclick = onFilter;
restoreButton.onclick = onDefault;

