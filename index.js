const WebSocket = require('ws');
const http = require('http');
const app = require('./app');
const port = 3030;

const server = http.createServer(app);
server.listen(port, () => {
    console.log(`Started express app at http://127.0.0.1:${port};`);
});

const wsServer = new WebSocket.Server({ server });

const clients = [];

wsServer.on('connection', ws => {
    ws.on('message', (msg) => {
        let data = JSON.parse(msg.toString())

        if (data.id) {
            const {id} = data;
            id.ws = ws;
            clients.push(id);
        } else {
            const { user, hubLink, roomName, content, contentType } = data;

            clients.forEach(client => {
                if (client.hubLink == hubLink && client.roomName == roomName) {
                    client.ws.send(JSON.stringify({
                        user: user,
                        content: content,
                        contentType: contentType
                    }));
                }
            });
        }
    });

    ws.on('close', ws => {
        const clientIndex = clients.findIndex(el => el.ws == ws);
        clients.splice(clientIndex, 1);
    })
});



module.exports = { server };