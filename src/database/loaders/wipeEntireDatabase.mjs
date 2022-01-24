

// ARGS
// 1: db_name (string) - the name of the blockservice database, this is just to confirm intention

// Instructions
// 1) Run from project root!
//    node src/database/loaders/wipeEntireDatabase.mjs <name of block service database>
// 2) when prompted verify intention to wipe


import util from 'util'
import readline from 'readline'

import * as utils from '../../utils.mjs'
import { getDatabase } from "../database.mjs";


const WipeDatabase = (async () => {
    let db = await getDatabase()
    let startTime = null
    
    const wipeDB = async () => {
        console.log("-----WIPING DATABASE-----");
        startTime = new Date()

        for (let model of Object.keys(db.models)){
            await db.models[model].deleteMany({}).then((res) => {
                console.log(`${model} DB wiped`);
                console.log(res)
            });
        }
    };

    function done(){
        console.log(`** DONE ** Run time ${(new Date() - startTime) / 1000} seconds.`)
        process.exit()
    }

    console.log("-- STARTING LOADER (wipe database) --")

    let [ db_name ] = process.argv.slice(2)

    if (db_name !== db.config.DBNAME){
        console.log("** First Argument must match the block service DBNAME. **")
        process.exit()
    }

    const input = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    })
    
    input.question(`Are you sure you want to wipe the ENTIRE ${db.config.DBNAME} database? (type the word "WIPE" in all caps) `, async (answer) => {
        if (answer === 'WIPE') {
            await wipeDB()
        }
        input.close()
        process.exit()
    })
})()
