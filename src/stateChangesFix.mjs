import { getBlockProcessor } from './blockProcessor.mjs'
import { createLogger } from './logger.mjs'

const logger = createLogger('Fix StateChanges');

export const fixStateChanges = async (services, db) => {
    const processor = getBlockProcessor(services, db)

    // check if need to fix
    logger.log("Checking if need to fix stateChanges")
    let needFix = await db.models.App.findOne({ key: "need_fix_stateChanges" }).then(r => r ? r.value : true)

    if (needFix) {
        logger.start("Starting fix stateChanges")

        let cursor = await db.models.Blocks.find().cursor()
        for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
            let block = doc.blockInfo
            logger.await(`${i + 1} / ${blocks.length}: Fixing block ${block.number}`)
            await processor(block)
        }
        await db.models.App.updateOne({ key: "latest_block" }, {
            key: "need_fix_stateChanges",
            value: false
        }, { upsert: true })
        logger.complete(`** DONE ** Fix state changes done`)

    } else {
        logger.log("No need to fix stateChanges")
        return
    }
}   