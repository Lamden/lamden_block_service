import { getDatabase } from "../database.mjs";
import { isLst001 } from "../processors/lst001.mjs"
import { createLogger } from '../../logger.mjs'

const logger = createLogger('Database');

const loadContracts = async (drop) => {
    let batchSize = 20000
    let progress = 0
    let db = await getDatabase()
    let contracts = new Set()

    async function get_batch(last_tx_uid) {
        progress = progress + batchSize
        logger.start(`Getting batch of ${batchSize} transactions`)

        process_batch(await db.queries.getAllHistory(last_tx_uid, batchSize))
    }

    async function process_batch(batch) {
        if (batch.length > 0) {
            logger.await("Processing batch...")
            for (let change of batch) {
                if (change) {
                    for (let contractName of change.affectedContractsList) {
                        contracts.add(contractName)
                    }
                }
            }

            for (let contractName of contracts) {
                let found = await db.models.Contracts.findOne({ contractName })
                if (!found) {
                    let code = await db.queries.getKeyFromCurrentState(contractName, "__code__")
                    let lst001 = isLst001(code.value)

                    await new db.models.Contracts({
                        contractName,
                        lst001
                    }).save()
                    logger.success(`Saved "${contractName}" ${lst001 ? " found LST001 token" : ""}`)
                }
            }
            let last_tx_uid = batch[batch.length - 1].tx_uid
            logger.success(`Processed ${progress} txs`)
            get_batch(last_tx_uid)

        } else {
            process.exit()
        }

    }

    if (drop) {
        logger.start("DROPPING CONTRACTS COLLECTION...")
        let res = await db.models.Contracts.deleteMany()
        logger.complete(res)
    }

    get_batch("000000000000")

}

let [drop] = process.argv.slice(2)

if (drop === "drop") drop = true
else drop = false

loadContracts(drop)