import util from 'util'

import { getDatabase, databaseInit } from "../database.mjs";


(async function addAffectedRawKeysList(){
    await databaseInit()
    let db = await getDatabase()
    await new Promise(r => setTimeout(r, 5000));
    
    let startTime = new Date()
    let totalBatchSize = await db.queries.countHistory()
    let batchSize = 20000
    let progress = 0
    let last_blockNum = "0"
    
    
    async function get_batch(){
        progress = progress + batchSize
        console.log(`-> Getting batch of ${batchSize} transactions`)
        
        process_batch(await db.queries.getAllHistory(last_blockNum, batchSize))
    }

    async function process_batch(batch){

        if (batch.length > 0){
            for (let change of batch){
                if(change){
                    let { txInfo, affectedRawKeysList, blockNum } = change

                    try{
                        last_blockNum = blockNum

                        if (affectedRawKeysList.length > 0) continue
    
                        affectedRawKeysList = []
                        if (txInfo){
                            try{
                                affectedRawKeysList = txInfo.state.map(sc => sc.key)
                            }catch(e){}
                        }
    
                       await db.models.StateChanges.updateOne({
                            blockNum: change.blockNum
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
            console.log(`-> Processed ${progress}/${totalBatchSize}. last_blockNum: ${last_blockNum}`)
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