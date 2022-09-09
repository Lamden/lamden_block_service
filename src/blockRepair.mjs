import { createLogger } from './logger.mjs'
import axios from 'axios'
import { TaskPool } from './blockProcessingQueue.mjs'
import { getBlockProcessor } from './blockProcessor.mjs'
import { getDatabase } from './database/database.mjs'
import * as utils from './utils.mjs'

const logger = createLogger('Repair');

class BlockRepair {
    constructor(nodeurl, services) {
        //this.taskPool = new TaskPool()
        this.MASTERNODE_URL = nodeurl
        this.db = getDatabase()
        this.processor = getBlockProcessor(services, this.db)
    }

    run() {
        // if (this.taskPool.queue.isEmpty()) {
        //     this.repair()
        // }
        this.repair()
    }

    async repair() {
        logger.start("Starting repairing...")
        try {
            let missingBlocks = await this.db.queries.getMissingBlocks()
            logger.log(`${missingBlocks.length} missing blocks found.`)
            for (const i of missingBlocks) {
                // 10s => 25 blocks
                let blockData = await this.getBlock_MN(i, 450)
                await this.blockProcessor(blockData)
                // this.taskPool.addTask(async (data) => {
                //     await this.blockProcessor(data)
                //     this.run()
                // }, blockData)
                // logger.success(`Added block ${blockData.number} to repairing queue`)
            }
            if (missingBlocks.length>0) {
                this.run()
            }
        } catch (e) {
            logger.error(e)
        }
        logger.complete("Repairing process ended.")
    }

    async blockProcessor(blockData) {
        if (blockData.error) {
            logger.error(`Repair block ${blockData.number} failed. Error: ${blockData.error}`)
            return
        }
        
        try {
            await this.processor(blockData)
            logger.success(`Repair block ${blockData.hash} success.`)
            await this.db.models.Blocks.updateOne({"blockInfo.previous": blockData.hash}, {previousExist: true})
            await this.db.models.MissingBlocks.deleteOne({ hash: blockData.hash })
            logger.success(`Remove block ${blockData.hash} from missingBlocks collection success.`)
        } catch (e) {
            logger.error(blockData)
            logger.error(e)

            // delete error data
            logger.start(`Starting clear error data.`)
            await this.db.models.Blocks.updateOne({"blockInfo.previous": blockData.hash}, {previousExist: false})
            await this.db.models.Blocks.deleteMany({ hash: blockData.hash })
            await this.db.models.StateChanges.deleteMany({ blockNum: blockData.number })
            logger.complete(`Clear error data success.`)
            return
        }
    }

    getBlock_MN(blockHash, timedelay = 0) {
        return new Promise(resolver => {
            setTimeout(async () => {
                await axios(`${this.MASTERNODE_URL}/blocks?hash=${blockHash}`)
                    .then(res => {
                        let block_res = res.data
                        resolver(block_res);
                    })
                    .catch(err => {
                        logger.error(err)
                        resolver({
                            error: "Error: Error contacting maternode.",
                            hash: blockHash
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