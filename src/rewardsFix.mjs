import { getRewarsProcessor } from './blockProcessor.mjs'
import { createLogger } from './logger.mjs'

const logger = createLogger('Fix Rewards');

export const fixRewardsRecord = async (services, db) => {
    const processor = getRewarsProcessor(services, db)

    // check if need to fix
    logger.log("Checking if need to parse rewards")
    let blockNums = await db.models.Rewards.distinct("blockNum")
    let res = await db.models.Blocks.find()
    let blocks = res.filter(r => blockNums.findIndex(b => r.blockInfo.number === b) === -1)

    if (blocks.length === 0) {
        logger.log("No need to parse rewards")
        return
    }

    // Just load all blocks info. Because only v2 testnet network is aviliable and the quantity of blocks are few 
    logger.start("Starting load rewards for old blocks data")
    for (let i = 0; i < blocks.length; i++) {
        let block = blocks[i].blockInfo
        logger.await(`${i + 1} / ${blocks.length}: Parsing block ${block.number}`)
        await processor(block)
    }
    logger.complete(`** DONE ** Parse rewards done`)
}   