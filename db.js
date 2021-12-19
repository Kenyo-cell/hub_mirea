const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize('multichat_server', 'Kenyo', 'N!njad3vper', {
    host: 'localhost',
    dialect: 'mysql'
});

const defaultConfig = {
    freezeTableName: true,
    timestamps: false,
    initialAutoIncrement: 10
};

const User = sequelize.define('user', {
    login: {
        type: DataTypes.STRING(128),
        allowNull: false,
        primaryKey: true
    },
    password: {
        field: 'password_hash',
        type: DataTypes.STRING(40),
        allowNull: false
    },
    imagePath: {
        field: 'image_url',
        type: DataTypes.STRING(255),
        allowNull: false,
        defaultValue: '6cc945040f90c0965a3873bf20bd515b847c8aca.png'
    },
    profileStatus: {
        field: 'status',
        type: DataTypes.STRING,
        allowNull: true
    }
}, defaultConfig);

const Hub = sequelize.define('hub', {
    id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
    },
    hubName: {
        field: 'hub_name',
        type: DataTypes.STRING(50),
        allowNull: false
    },
    link: {
        type: DataTypes.STRING,
        allowNull: false
    },
    imagePath: {
        field: 'image_url',
        type: DataTypes.STRING(255),
        allowNull: false,
        defaultValue: 'b99090167c2ee5b65bce871b84e092abcda10002.png'
    }
}, defaultConfig);

const Room = sequelize.define('room', {
    name: {
        type: DataTypes.STRING(128),
        allowNull: false,
        primaryKey: true
    },
    hubId: {
        field: 'hub_id',
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        primaryKey: true,
        references: {
            model: 'hub',
            key: 'id'
        }
    },
    roomType: {
        field: 'room_type',
        type: DataTypes.STRING(64),
        allowNull: false,
        defaultValue: 'TEXT'
    },
    description: DataTypes.STRING,
    maxMembers: {
        field: 'max_members',
        type: DataTypes.BIGINT.UNSIGNED
    }
}, defaultConfig);

const Tag = sequelize.define('tag', {
    name: {
        type: DataTypes.STRING(64),
        allowNull: false,
        primaryKey: true
    },
    hubId: {
        field: 'hub_id',
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        primaryKey: true,
        references: {
            model: 'hub',
            key: 'id'
        }
    },
    userLogin: {
        field: 'user_login',
        type: DataTypes.STRING(128),
        allowNull: false,
        primaryKey: true,
        references: {
            model: 'user',
            key: 'login'
        }
    },
    color: {
        type: DataTypes.STRING(11),
        allowNull: false,
        defaultValue: '255;255;255'
    }
}, defaultConfig);

const Message = sequelize.define('message', {
    uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        primaryKey: true
    },
    tagName: {
        field: 'tag_name',
        type: DataTypes.STRING(64),
        allowNull: false,
        references: {
            model: 'tag',
            key: 'name'
        }
    },
    hubId: {
        field: 'hub_id',
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        references: {
            model: 'hub',
            key: 'id'
        }
    },
    roomName: {
        field: 'room_name',
        type: DataTypes.STRING(128),
        allowNull: false,
        references: {
            model: 'room',
            key: 'name'
        }
    },
    userLogin: {
        field: 'user_login',
        type: DataTypes.STRING(128),
        allowNull: false,
        references: {
            model: 'user',
            key: 'login'
        }
    },
    content: {
        type: DataTypes.STRING,
        allowNull: false
    },
    time: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    wasChanged: {
        field: 'changed',
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: 0
    },
    pinned: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: 0
    },
    datatype: {
        type: DataTypes.STRING(64),
        allowNull: false,
        defaultValue: 'TEXT'
    }
}, defaultConfig);

Message.belongsTo(User, { foreignKey: 'user_login' });
Message.belongsTo(Tag, { foreignKey: 'tag_name' });
Message.belongsTo(Hub, { foreignKey: 'hub_id' });
Message.belongsTo(Room, { foreignKey: 'room_name' });

Tag.hasMany(Message, { foreignKey: 'tag_name' });
Room.hasMany(Message, { foreignKey: 'room_name' });
User.hasMany(Message, { foreignKey: 'user_login' });
Hub.hasMany(Message, { foreignKey: 'hub_id' });

Tag.belongsTo(User, { foreignKey: 'user_login' });
User.hasMany(Tag, { foreignKey: 'user_login' });

Tag.belongsTo(Hub, { foreignKey: 'hub_id' });
Hub.hasMany(Tag, { foreignKey: 'hub_id' });

Room.belongsTo(Hub, { foreignKey: 'hub_id' });
Hub.hasMany(Room, { foreignKey: 'hub_id' });

sequelize.sync();

module.exports = { User, Hub, Room, Tag, Message };