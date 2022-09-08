import util from 'util'

import { getDatabase } from "../database.mjs";
import { deconstructKey } from "../../utils.mjs"
import { createLogger } from '../logger.mjs'

const logger = createLogger('Database');

(async function populatePreviousValue() {
    let db = await getDatabase()
    await new Promise(r => setTimeout(r, 5000));

    let startTime = new Date()
    let totalBatchSize = await db.queries.countCurrentState()
    let batchSize = 2500
    let progress = 0

    let lastUpdated = "0001-01-01T00:00:00.000Z"

    async function get_batch() {
        progress = progress + batchSize
        logger.await(`Getting ${batchSize + progress > totalBatchSize ? totalBatchSize - progress : batchSize} current state keys...`)

        process_batch(await db.queries.getAllByLastUpdated(lastUpdated, batchSize))
    }

    async function process_batch(batch) {
        if (batch.length > 0) {
            await Promise.all(batch.map(async (change) => {

                if (typeof change.prev_value === 'undefined' || typeof change.prev_blockNum === 'undefined') {
                    try {
                        let keyInfo = deconstructKey(change.rawKey)
                        let transactionInfo = await db.queries.getTransactionByHash(change.txHash)

                        let prev_values = await db.queries.getPreviousKeyValue(keyInfo.contractName, keyInfo.variableName, keyInfo.keys, transactionInfo.blockNum)

                        await db.models.CurrentState.updateOne({
                            rawKey: change.rawKey
                        }, {
                            prev_value: prev_values.value,
                            prev_blockNum: prev_values.blockNum,
                        })

                    } catch (e) {
                        logger.error(e)
                        process.exit()
                    }
                }

            }))

            try {
                lastUpdated = batch[batch.length - 1].lastUpdated
            } catch (e) {
                logger.error(e)
                process.exit()
            }

            logger.success(`Processed ${progress}/${totalBatchSize} (${(progress / totalBatchSize * 100).toFixed(2)}%). lastUpdated: ${JSON.stringify(lastUpdated)}`)
            logger.log(`${db.utils.estimateTimeLeft(startTime, progress, totalBatchSize)}`)

            get_batch()
        } else {
            done()
        }

    }

    function done() {
        logger.complete(`** DONE ** Processed ${totalBatchSize} in ${(new Date() - startTime) / 1000} seconds.`)
        process.exit()

    }
    logger.start("STARTING LOADER (populate previous values) --")
    logger.await(`Processing ${totalBatchSize} documents in batches of ${batchSize}.`)

    get_batch()

})()
