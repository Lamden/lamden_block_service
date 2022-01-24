

// ARGS
// 1: block_num (int) - The value to set at the repair height. This is where the blockservice will start syncing and repairing blocks from on next reboot.

// Instructions
// 1) Run from project root!
//    node src/database/loaders/setRepairHeight.mjs <block_num>
// 2) when prompted verify intention


import util from 'util'
import readline from 'readline'

import { getDatabase } from "../database.mjs";


const SetRepairHeight = (async () => {
    let db = await getDatabase()

    console.log("-- STARTING LOADER (set repair height) --")

    let [ block_num ] = process.argv.slice(2)

    if (isNaN(parseInt(block_num))){
        console.log("** Must provide a block number (int) as the first argument. **")
        process.exit()
    }

    const input = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    })
    
    console.log("Setting the Repair Height will start reprocessing blocks from this height upto the latest block height.\n")
    input.question(`Are you sure you want to set the repair heigh to block ${block_num}? (y/n)`, async (answer) => {
        if (answer.toLocaleLowerCase() === 'y') {
            await db.queries.setLastRepaired(parseInt(block_num))
            console.log(`--> Repair Height now set to ${await db.queries.getLastRepaired()}`)
        }
        input.close()
        process.exit()
    })
})()
