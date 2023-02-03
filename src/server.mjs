import express from 'express'
import cors from 'cors'
import rateLimit from "express-rate-limit"
import http from 'http'
import { Server } from 'socket.io'
import { io } from "socket.io-client";
import { socketService } from './services/socketService.mjs'
import { startRouter } from './router.mjs'

// Graphql
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { typeDefs, resolvers } from './graphql/schemas/index.mjs'
import DataAPI from './graphql/dataSource.mjs'

import { createLogger } from './logger.mjs'

const logger = createLogger('Server');

export const createPythonSocketClient = () => {
    const conn = process.env.SCRIPT_SOCKET_CONN || "http://localhost:3232";
    const socket = io(conn);
    socket.on("connect", () => {
        logger.success("Success Connecting.");
    });
    return socket;
}

export const createExpressApp = async (db, socketClient) => {
    const app = express();

    const server = new ApolloServer({
        typeDefs,
        resolvers,
        dataSources: () => {
            return {
              moviesAPI: new MoviesAPI(),
            };
        },
    });

    await server.start();

    if (process.env.RATE_LIMIT_ENABLE) {
        const limiter = rateLimit({
            max: process.env.RATE_LIMIT_NUM || 10,
            windowMs: process.env.RATE_LIMIT_PERIOD || 600000, // default 10min
            message: "Too many request from this IP",
            standardHeaders: true, 
            legacyHeaders: true,
            skip: (request, _) => request.url.includes("/graphql"),
        })

        app.use(limiter)
        // Troubleshooting Proxy Issues
        app.set('trust proxy', 2)
    }

    app.use(cors())
    app.use(express.json({ limit: '50mb', extended: true }));
    app.use(express.urlencoded({ limit: '50mb', extended: true }));

    app.use('/graphql',  cors({ origin: '*' }),
        express.json(),
        expressMiddleware(server, {
            context: async () => {
                const dataApi = new DataAPI(db);
                return {
                dataSources: {
                    dataApi,
                },
                };
            },
    }));

    startRouter(app, db, socketClient)

    app.get('/ping', (req, res) => {
        res.send('pong');
    });

    return app
}

export const createServer = async (host, port, db) => {

    const socketClient = createPythonSocketClient();
    const app = await createExpressApp(db, socketClient)
    const server = http.createServer(app);
    const io = new Server(server, {
        cors: {
          origin: '*',
        }
      });

    io.on('connection', (socket) => {
        socket.on('join', (room) => {
            logger.log(" someone joined room " + room)
            socket.join(room)
        });
        socket.on('leave', (room) => {
            logger.log(" someone left room " + room)
            socket.leave(room)
        });

        // send /rewards list when connected
        db.queries.getRewards().then(r => {
            io.emit('rewards', JSON.stringify({ message: r }));
        })

        // Send the latest_block on connect
        db.queries.getLatestBlock().then((latest_block) => {
            socket.emit('latest_block', JSON.stringify({message: latest_block}))
        })
        
    });

    server.listen(port, host, () => {
        logger.success(`Listening on ${host}:${port}`);
    });

    return {
        io,
        app,
        server,
        services: {
            sockets: socketService(io)
        },
        socketClient
    }
}