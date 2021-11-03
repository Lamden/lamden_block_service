import { getDatabase } from "../database.mjs";
import { isLst001 } from "../processors/lst001.mjs"

const loadContracts = async (drop) => {
    let batchSize = 20000
    let progress = 0
    let db = await getDatabase()
    let contracts = new Set()
    
    async function get_batch(last_tx_uid){
        progress = progress + batchSize
        console.log(`-> Getting batch of ${batchSize} transactions`)

        process_batch(await db.queries.getAllHistory(last_tx_uid, batchSize))
    }

    async function process_batch(batch){
        if (batch.length > 0){
            console.log("    o processing batch...")
            for (let change of batch){
                if(change){
                    for (let contractName of change.affectedContractsList){
                        contracts.add(contractName)
                    }
                }
            }
        
            for (let contractName of contracts){
                let found = await db.models.Contracts.findOne({contractName})
                if (!found) {
                    let code = await db.queries.getKeyFromCurrentState(contractName, "__code__")
                    let lst001 = isLst001(code.value)
                    
                    await new db.models.Contracts({
                        contractName, 
                        lst001
                    }).save()
                    console.log(`    o saved "${contractName}" ${lst001 ? " found LST001 token": ""}`)
                }
            }
            let last_tx_uid = batch[batch.length - 1].tx_uid
            console.log(`    o processed ${progress} txs`)
            get_batch(last_tx_uid)

        }else{
            process.exit()
        }

    }

    if (drop){
        console.log("\n-> DROPPING CONTRACTS COLLECTION...")
        let res = await db.models.Contracts.deleteMany()
        console.log(res)
    }

    get_batch("000000000000.00000.00000")
    
}

let [drop] = process.argv.slice(2)

if (drop === "drop") drop = true
else drop = false

loadContracts(drop)