import fs from 'fs';
import { getDatabase, databaseInit } from "../database.mjs";

async function open_file(){
    try {
        const data = await fs.promises.readFile('loader_files/missing_hashes.json', 'utf8');
        const array = JSON.parse(data);
        return array;
      } catch (error) {
        return []
      }
};

async function add_hashes(array, db){
    for (let hash of array){
        console.log(hash);
        let exists = db.models.MissingBlocks.find({hash})
        if (!exists) await new db.models.MissingBlocks({hash}).save()
    }
};

databaseInit().then(() => {
    getDatabase().then((db) => {
        open_file().then((hashes) => {
            add_hashes(hashes, db).then(() => {
                console.log(`Done procesingg ${hashes.length} missing hashes!`)
            })
        })
    })
})


