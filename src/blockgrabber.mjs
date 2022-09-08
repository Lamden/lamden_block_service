import { createLogger } from './logger.mjs'
import { getBlockProcessor } from './blockProcessor.mjs'
import { getGenesisBlockProcessor } from './blockProcessor_genesis.mjs'
import { GetBlockRepair } from './blockRepair.mjs'
import { BlockProcessingQueue } from './blockProcessingQueue.mjs'
import { getDatabase } from './database/database.mjs'

import axios from 'axios'

const logger = createLogger('Blocks');
const blockProcessingQueue = new BlockProcessingQueue()
const db = getDatabase()

const runBlockGrabber = (config) => {
    const {
        blockchainEvents,
        server,
        MASTERNODE_URL,
        GENESIS_BLOCK_URL
    } = config

    const blockRepair = GetBlockRepair(MASTERNODE_URL, server.services)

    async function processLatestBlockFromWebsocket(data) {
        if (!data) return
        
        await db.queries.setLatestBlock(data.number)
        let block = await db.models.Blocks.findOne({ blockNum: data.number })

        if (!block) {
            blockProcessingQueue.addBlock(data)
        }

        await blockRepair.run()
    };

    async function processBlockFromWebsocket(blockData) {
        await db.queries.setLatestBlock(blockData.number)
        blockProcessingQueue.addBlock(blockData)
        await blockRepair.run()
    }

    async function start() {
        const processor = getBlockProcessor(server.services, db)
        // Create a block processing queue so we can add new blocks one at a time and process them in order
        blockProcessingQueue.setupBlockProcessor(processor)

        // connect to the websocket events we want
        blockchainEvents.setupEventProcessor('new_block', processBlockFromWebsocket)
        blockchainEvents.setupEventProcessor('latest_block', processLatestBlockFromWebsocket)
        
        if (await db.queries.hasGenesisBlock()){
            logger.success(`Genesis Block Loaded.`)
        }else{
            logger.log("No Genesis Block detected.")
            await load_genesis_block()
        }

        blockchainEvents.start()
    }

    async function load_genesis_block(){
        logger.log(`Downloading Genesis Block from Github. (${GENESIS_BLOCK_URL})`)
        const genesis_block = await axios.get(GENESIS_BLOCK_URL).then(res => {
            return res.data
        })
        if (genesis_block.genesis){
            logger.success(`Genesis Block Downloaded and contains ${genesis_block.genesis.length} initial state entries.`)
        }

        const genesisBlockProcessor = getGenesisBlockProcessor(db)
        await genesisBlockProcessor(genesis_block)
    }   

    return {
        start
    }
};

export {
    runBlockGrabber
}