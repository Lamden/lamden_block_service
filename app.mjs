import { config } from 'dotenv'
config()
import { getDatabase } from "./src/database/database.mjs";

import { runBlockGrabber } from './src/blockgrabber.mjs'
import { blockProcessingQueue } from './src/blockProcessingQueue.mjs'
import { eventWebsockets } from './src/services/eventsWebsocket.mjs'

import { createServer } from './src/server.mjs'

const MASTERNODE_URLS = {
    'testnet': "https://testnet-master-1.lamden.io",
    'mainnet': "https://masternode-01.lamden.io"
}

/******* MONGO DB CONNECTION INFO **/
const NETWORK = process.env.NETWORK || 'testnet'
const MASTERNODE_URL = process.env.MASTERNODE_URL || MASTERNODE_URLS[NETWORK]

/******* SERVER CONNECTION INFO **/
const BLOCKSERVICE_PORT = process.env.BLOCKSERVICE_PORT || 3535

let grabberConfig = {
    DEBUG_ON: process.env.DEBUG_ON || false,
    MASTERNODE_URL
}

const start = async() => {
    grabberConfig.db = await getDatabase()
    grabberConfig.server = await createServer(BLOCKSERVICE_PORT, grabberConfig.db)
    grabberConfig.blockchainEvents = eventWebsockets(grabberConfig.MASTERNODE_URL)
    grabberConfig.blockProcessingQueue = blockProcessingQueue(grabberConfig.db)

    let blockGrabber = runBlockGrabber(grabberConfig)
    blockGrabber.start()
}

start()