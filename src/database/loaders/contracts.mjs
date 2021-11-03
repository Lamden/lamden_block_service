import { getDatabase } from "../database.mjs";

const loadContracts = async (drop) => {
    let db = await getDatabase()
    let contracts = new Set()

    console.log("\n-> DROPPING CONTRACTS COLLECTION...")

    if (drop){
        let res = await db.models.Contracts.deleteMany()
        console.log(res)
    }

    console.log("\n-> FINDING CONTACTS...")

    let stateChanges = await db.models.StateChanges.find()

    for (let change of stateChanges){
        if(change){
            for (let contractName of change.affectedContractsList){
                contracts.add(contractName)
            }
        }
    }

    console.log("\n-> SAVING CONTACTS...")

    for (let contractName of contracts){
        let found = await db.models.Contracts.findOne({contractName})
        if (!found) {
            await new db.models.Contracts({contractName}).save()
            console.log(`    o Saved "${contractName}"`)
        }
    }
    process.exit()
}

let [drop] = process.argv.slice(2)

if (drop === "drop") drop = true
else drop = false

loadContracts(drop)