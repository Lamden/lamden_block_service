import { createLogger } from './logger.mjs'
import axios from 'axios'
import { TaskPool } from './blockProcessingQueue.mjs'
import { getBlockProcessor } from './blockProcessor.mjs'
import { getDatabase } from './database/database.mjs'
import * as utils from './utils.mjs'

const logger = createLogger('Repair');

class BlockRepair {
    constructor(nodeurl, services) {
        this.taskPool = new TaskPool()
        this.MASTERNODE_URL = nodeurl
        this.db = getDatabase()
        this.processor = getBlockProcessor(services, this.db)
        this.running = false
    }

    run() {
        if (this.taskPool.queue.isEmpty() && !this.running) {
            this.running = true
            this.repair()
        }
    }

    async repair() {
        logger.start("Starting repairing...")
        try {
            let missingBlocks = await this.db.queries.getMissingBlockNumber()
            logger.log(`${missingBlocks.length} missing blocks found.`)
            for (const i of missingBlocks) {
                let blockData = await this.getBlock_MN(i, 250)
                if (isNaN(parseInt(blockData.number))) {
                    if (!isNaN(parseInt(blockData.id))) {
                        blockData.number = blockData.id
                    } else {
                        this.running = false
                        return
                    }
                }
                this.taskPool.addTask((data) => this.blockProcessor(data), blockData)
                logger.success(`Added block ${i} to repairing queue`)
            }
        } catch (e) {
            this.running = false
            logger.error(e)
        }
        logger.complete("Repairing process ended.")
        this.running = false
    }

    async blockProcessor(blockData) {
        if (blockData.error) {
            logger.error(`Repair block ${blockData.number} failed. Error: ${blockData.error}`)
            return
        }
        // try repair MalformedBlock. ex: {__fix__: '100'} => 100
        blockData = utils.repairMalformedBlock(blockData)
        if (utils.isMalformedBlock(blockData)) {
            logger.error(`Repair block ${blockData.number} failed. Because this is a malformed block`)
            return
        }
        try {
            await this.processor(blockData)
            logger.success(`Repair block ${blockData.number} success.`)
            await this.db.models.MissingBlocks.deleteOne({ blockNum: blockData.number })
            logger.success(`Remove block ${blockData.number} from missingBlocks collection success.`)
        } catch (e) {
            logger.error(blockData)
            logger.error(e)

            // delete error data
            logger.start(`Starting clear error data.`)
            await this.db.models.Blocks.deleteMany({ hash: blockData.hash })
            await this.db.models.StateChanges.deleteMany({ blockNum: blockData.number })
            logger.complete(`Clear error data success.`)
            return
        }
    }

    getBlock_MN(blockNum, timedelay = 0) {
        return new Promise(resolver => {
            setTimeout(async () => {
                await axios(`${this.MASTERNODE_URL}/blocks?num=${blockNum}`)
                    .then(res => {
                        let block_res = res.data
                        block_res.id = blockNum
                        resolver(block_res);
                    })
                    .catch(err => {
                        logger.error(err)
                        resolver({
                            error: "Error: Error contacting maternode.",
                            id: blockNum
                        })
                    })
            }, timedelay)
        })
    };

    setupBlockProcessor(processor) {
        this.blockProcessor = processor
    }
}

// Singleton Mode
export const GetBlockRepair = (function () {
    let instance = null;
    return function (nodeurl, services) {
        if (!instance) {
            instance = new BlockRepair(nodeurl, services);
        }
        return instance;
    };
})();