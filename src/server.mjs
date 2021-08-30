import express from 'express'
import cors from 'cors'
import http from 'http'
import { Server } from 'socket.io'
import { socketService } from './services/socketService.mjs'
import { startRouter } from './router.mjs'

export const createServer = (port, db) => {
    const app = express();
    app.use(cors())
    app.use(express.json())

    startRouter(app, db)

    const server = http.createServer(app);
    const io = new Server(server);

    app.get('/ping', (req, res) => {
        res.send('pong');
    });

    io.on('connection', (socket) => {
        socket.on('join', (room) => {
            console.log(" someone joined room " + room)
            socket.join(room)
        });
    });

    server.listen(port, () => {
        console.log(`listening on *:${port}`);
    });

    return {
        io,
        app,
        server,
        services: {
            sockets: socketService(io)
        }
    }
}