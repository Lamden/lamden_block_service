import util from 'util'

import { getDatabase } from "../database.mjs";


(async function addAffectedRawKeysList(){
    let db = await getDatabase()

    let startTime = new Date()
    let totalBatchSize = await db.queries.countHistory()
    let batchSize = 20000
    let progress = 0
    let last_tx_uid = "000000000000.00000.00000"
    
    
    async function get_batch(){
        progress = progress + batchSize
        console.log(`-> Getting batch of ${batchSize} transactions`)
        
        process_batch(await db.queries.getAllHistory(last_tx_uid, batchSize))
    }

    async function process_batch(batch){

        if (batch.length > 0){
            for (let change of batch){
                if(change){
                    let { txInfo, affectedRawKeysList, tx_uid } = change

                    try{
                        last_tx_uid = tx_uid

                        if (affectedRawKeysList.length > 0) continue
    
                        affectedRawKeysList = []
                        if (txInfo){
                            try{
                                affectedRawKeysList = txInfo.state.map(sc => sc.key)
                            }catch(e){}
                        }
    
                       await db.models.StateChanges.updateOne({
                            tx_uid: change.tx_uid
                        }, {
                            affectedRawKeysList
                        })
                    }catch(e){
                        console.log(e)
                        console.log(util.inspect({change}, false, null, true))
                        process.exit()
                    }
                }
            }
            console.log(`-> Processed ${progress}/${totalBatchSize}. last_tx_uid: ${last_tx_uid}`)
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
    console.log("-- STARTING LOADER (addAffectedRawKeysList) --")
    get_batch()
    
})()