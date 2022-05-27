import { config } from 'dotenv'
config()

import { runBlockGrabber } from './src/blockgrabber.mjs'
import { eventWebsockets } from './src/services/eventsWebsocket.mjs'

import { createServer } from './src/server.mjs'

import { getDatabase } from './src/database/database.mjs'

const MASTERNODE_URLS = {
    'testnet': "https://testnet-master-1.lamden.io",
    'mainnet': "https://masternode-01.lamden.io"
}

/******* MONGO DB CONNECTION INFO **/
const NETWORK = process.env.NETWORK || 'testnet'
const MASTERNODE_URL = process.env.MASTERNODE_URL || MASTERNODE_URLS[NETWORK]

/******* SERVER CONNECTION INFO **/
const BLOCKSERVICE_PORT = process.env.BLOCKSERVICE_PORT || 3535
const BLOCKSERVICE_HOST = process.env.BLOCKSERVICE_HOST || 'localhost'

let grabberConfig = {
    DEBUG_ON: process.env.DEBUG_ON || false,
    MASTERNODE_URL
}

export const start = async () => {
    const db = getDatabase()
    // ensure backward compatibility 
    await db.models.Blocks.deleteMany({ hash: "block-does-not-exist" })

    grabberConfig.server = createServer(BLOCKSERVICE_HOST, BLOCKSERVICE_PORT, db)
    grabberConfig.blockchainEvents = eventWebsockets(grabberConfig.MASTERNODE_URL)

    let blockGrabber = runBlockGrabber(grabberConfig)
    blockGrabber.start()
    return grabberConfig
}

start()