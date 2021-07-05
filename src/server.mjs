import express from 'express'
import cors from 'cors'
import http from 'http'
import { Server } from 'socket.io'
import { socketService } from './services/socketService.mjs'

export const createServer = (port, db) => {
    const app = express();
    const server = http.createServer(app);
    const io = new Server(server);

    app.use(cors())

    app.get('/ping', (req, res) => {
        res.send('pong');
    });

    app.get('/latest_block', async(req, res) => {
        try {
            let latest_block = await db.queries.getLatestBlock()
            res.send({ latest_block })
        } catch (e) {
            res.send({ error: e })
        }
    });

    app.get('/latest_processed_block', async(req, res) => {
        try {
            let latest_processed_block = await db.queries.getLastestProcessedBlock()
            res.send({ latest_processed_block })
        } catch (e) {
            res.send({ error: e })
        }
    });

    app.get('/latest_synced_block', async(req, res) => {
        try {
            let latest_synced_block = await db.queries.getLastSyncedBlock()
            res.send({ latest_synced_block })
        } catch (e) {
            res.send({ error: e })
        }
    });

    app.get('/synced_stats', async(req, res) => {
        try {
            let latest_processed_block = await db.queries.getLastestProcessedBlock()
            let latest_synced_block = await db.queries.getLatestSyncedBlock()
            let latest_block = await db.queries.getLatestBlock()
            res.send({
                updated: latest_processed_block === latest_block,
                synced: latest_synced_block === latest_block,
                latest_processed_block,
                latest_synced_block,
                latest_block
            })
        } catch (e) {
            res.send({ error: e })
        }
    });

    app.get('/contract_history', async(req, res) => {
        const { contract, last_tx_uid, limit } = req.query

        try {
            let history = await db.queries.getContractHistory(contract, last_tx_uid, limit)
            res.send({ history })
        } catch (e) {
            res.send({ error: e })
        }

    });

    app.get('/variable_history', async(req, res) => {
        const { contract, variable, last_tx_uid, limit } = req.query

        try {
            let history = await db.queries.getVariableHistory(contract, variable, last_tx_uid, limit)
            res.send({ history })
        } catch (e) {
            res.send({ error: e })
        }
    });

    app.get('/rootkey_history', async(req, res) => {
        const { contract, variable, root_key, last_tx_uid, limit } = req.query

        try {
            let history = await db.queries.getRootKeyHistory(contract, variable, root_key, last_tx_uid, limit)
            res.send({ history })
        } catch (e) {
            res.send({ error: e })
        }
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