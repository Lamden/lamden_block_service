import util from 'util'

import { getDatabase } from "../database.mjs";
import { deconstructKey } from "../../utils.mjs"

(async function  populatePreviousValue() {
    let db = await getDatabase()

    let startTime = new Date()
    let totalBatchSize = await db.queries.countCurrentState()
    let batchSize = 2500
    let progress = 0

    let lastUpdated = "0001-01-01T00:00:00.000Z"
    
    async function get_batch(){
        progress = progress + batchSize
        console.log(`-> Getting ${batchSize + progress > totalBatchSize ? totalBatchSize - progress : batchSize} current state keys...`)

        process_batch(await db.queries.getAllByLastUpdated(lastUpdated, batchSize))
    }

    async function process_batch(batch){
        if (batch.length > 0){
            await Promise.all(batch.map(async (change) => {
                
                if (typeof change.prev_value === 'undefined' || typeof change.prev_tx_uid === 'undefined'){
                    try{
                        let keyInfo = deconstructKey(change.rawKey)
                        let transactionInfo = await db.queries.getTransactionByHash(change.txHash)

                        let prev_values = await db.queries.getPreviousKeyValue(keyInfo.contractName, keyInfo.variableName, keyInfo.keys, transactionInfo.tx_uid)

                        await db.models.CurrentState.updateOne({
                            rawKey: change.rawKey
                        }, {
                            prev_value: prev_values.value,
                            prev_tx_uid: prev_values.tx_uid,
                        })
                        
                    }catch(e){
                        console.log(e)
                        process.exit()
                    }
                }

            }))

            try{
                lastUpdated = batch[batch.length - 1].lastUpdated
            }catch(e){
                console.log(e)
                process.exit()
            }

            console.log(`-> Processed ${progress}/${totalBatchSize} (${(progress/totalBatchSize * 100).toFixed(2)}%). lastUpdated: ${JSON.stringify(lastUpdated)}`)
            console.log(`-> ${db.utils.estimateTimeLeft(startTime, progress, totalBatchSize)}`)
            
            get_batch()
        }else{
            done()
        }

    }

    function done(){
        console.log(`** DONE ** Processed ${totalBatchSize} in ${(new Date() - startTime) / 1000} seconds.`)
        process.exit()

    }
    console.log("-- STARTING LOADER (populate previous values) --")
    console.log(`-> Processing ${totalBatchSize} documents in batches of ${batchSize}.`)

    get_batch()
    
})()
