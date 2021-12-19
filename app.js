const express = require("express");
const router = require("./routes");
const app = express();

app.use(express.static(__dirname + '/static/'));
app.use(express.static(__dirname + '/uploads/'));
app.use('/profilePictures', express.static(__dirname + '/uploads/profiles_pictures'));
app.use('/hubPictures', express.static(__dirname + '/uploads/hub_pictures'));
app.use('/messageFiles', express.static(__dirname + '/uploads/message_files'))
app.use('/styles', express.static(__dirname + '/static/styles'));
app.use('/scripts', express.static(__dirname + '/static/scripts'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(router);

app.set('views', __dirname + '/static/');
app.set('view engine', 'pug');

module.exports = app;
