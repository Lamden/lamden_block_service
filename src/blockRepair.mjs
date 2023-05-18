import { createLogger } from './logger.mjs'
import axios from 'axios'
import { TaskPool } from './blockProcessingQueue.mjs'
import { getBlockProcessor } from './blockProcessor.mjs'
import { getDatabase } from './database/database.mjs'
import { actionsWebsockets } from './services/actionsWebsocket.mjs'
import * as utils from './utils.mjs'

const logger = createLogger('Repair');

class BlockRepair {
    constructor(nodeurl, services) {
        //this.taskPool = new TaskPool()
        this.MASTERNODE_URL = nodeurl
        this.db = getDatabase()
        this.processor = getBlockProcessor(services, this.db)
        this.running = false
        this.processing = new Set()

        this.actionsWS = actionsWebsockets(nodeurl)
        this.actionsWS.setupInit(this.run.bind(this))
        // handle the websocket actions
        this.actionsWS.setupActionsProcessor('prev_block', this.blockProcessor.bind(this))

        this.actionsWS.start()
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
                let block = await this.db.models.Blocks.findOne({ blockNum: i, previousExist: true })
                if (!block) {
                    this.dispatchPrevBlock(i)
                }
                // this.taskPool.addTask(async (data) => {
                //     await this.blockProcessor(data)
                //     this.run()
                // }, blockData)
                // logger.success(`Added block ${blockData.number} to repairing queue`)
            }
        } catch (e) {
            this.running = false
            logger.error(e)
        }
        logger.complete("Repairing process ended.")
        this.running = false
    }

    async blockProcessor(blockData, payload) {
        let nextBlockNum = payload

        if (blockData.error) {
            logger.error(`Repair block ${blockData.number} failed. Error: ${blockData.error}`)
            return
        }

        if (this.processing.has(payload)) {
            return
        }
        
        this.processing.add(payload)
        
        try {
            blockData.repair = true 
            await this.processor(blockData)
            logger.success(`Repair block ${blockData.number} success.`)
            this.processing.delete(payload)
            await this.db.models.Blocks.updateOne({"blockNum": nextBlockNum}, {"previous": blockData.number, previousExist: true})
            await this.db.models.MissingBlocks.deleteOne({ number: nextBlockNum})
            // logger.success(`Remove next block ${nextBlockNum} from missingBlocks collection success.`)

            await this.repair()

        } catch (e) {
            logger.error(blockData)
            logger.error(e)
            return
        }

    }

    dispatchPrevBlock(blockNum) {
        this.actionsWS.dispatchAction("prev_block", blockNum)
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