import { config } from 'dotenv'
config()

import { runBlockGrabber } from './src/blockgrabber.mjs'
import { eventWebsockets } from './src/services/eventsWebsocket.mjs'

import { createServer } from './src/server.mjs'

import { getDatabase, databaseInit } from './src/database/database.mjs'

import { createLogger } from './src/logger.mjs'

import { fixRewardsRecord } from './src/rewardsFix.mjs'

const logger = createLogger('App');

const MASTERNODE_URLS = {
    'testnet_v2': "https://testnet-v2-master-lon.lamden.io",
    'mainnet': "https://masternode-01.lamden.io"
}

const GENESIS_BLOCKS = {
    "testnet_v2": "https://raw.githubusercontent.com/Lamden/genesis_block/main/testnet/genesis_block.json",
    "staging_v2": "https://raw.githubusercontent.com/Lamden/genesis_block/main/staging/genesis_block.json"
} 


/******* MONGO DB CONNECTION INFO **/
const NETWORK = process.env.NETWORK || 'testnet_v2'
const MASTERNODE_URL = process.env.MASTERNODE_URL || MASTERNODE_URLS[NETWORK]

/******* SERVER CONNECTION INFO **/
const BLOCKSERVICE_PORT = process.env.BLOCKSERVICE_PORT || 3535
const BLOCKSERVICE_HOST = process.env.BLOCKSERVICE_HOST || 'localhost'
const GENESIS_BLOCK_URL = process.env.GENESIS_BLOCK_URL || GENESIS_BLOCKS[NETWORK]

let grabberConfig = {
    DEBUG_ON: process.env.DEBUG_ON || false,
    MASTERNODE_URL,
    GENESIS_BLOCK_URL
}

export const start = async () => {
    // Init database
    await databaseInit()
    
    const db = getDatabase()
    const server = await createServer(BLOCKSERVICE_HOST, BLOCKSERVICE_PORT, db)

    // ensure backward compatibility 
    await db.models.Blocks.deleteMany({ hash: "block-does-not-exist" })

    // parse rewards for old block data in database
    await fixRewardsRecord(server.services, db)

    logger.info("Syncing Indexes...");
    //console.log( db.models)
    for (let model_name of Object.keys(db.models)){
        await db.models[model_name].syncIndexes()
            .catch(err => logger.error(err))
            .then(() => logger.success(`DONE Syncing Indexes for ${db.models[model_name].collection.collectionName}...`))
    }
    
    grabberConfig.server = server
    grabberConfig.blockchainEvents = eventWebsockets(grabberConfig.MASTERNODE_URL)

    let blockGrabber = runBlockGrabber(grabberConfig)
    blockGrabber.start()
    return grabberConfig
}

start()