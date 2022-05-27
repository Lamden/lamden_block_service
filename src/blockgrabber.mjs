import { createLogger } from './logger.mjs'
import { getBlockProcessor } from './blockProcessor.mjs'
import { GetBlockRepair } from './blockRepair.mjs'
import { BlockProcessingQueue } from './blockProcessingQueue.mjs'
import { getDatabase } from './database/database.mjs'

const logger = createLogger('Blocks');
const blockProcessingQueue = new BlockProcessingQueue()
const db = getDatabase()

const runBlockGrabber = (config) => {
    const {
        blockchainEvents,
        server,
        MASTERNODE_URL
    } = config

    const blockRepair = GetBlockRepair(MASTERNODE_URL, server.services)

    async function processLatestBlockFromWebsocket(data) {
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
        blockchainEvents.start()
    }

    return {
        start
    }
};

export {
    runBlockGrabber
}