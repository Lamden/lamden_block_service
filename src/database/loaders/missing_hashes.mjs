import fs from 'fs';

export const load_missing_hashes = async (db) => {
    async function open_file(){
        try {
            const data = await fs.promises.readFile('./src/database/loaders/loader_files/missing_hashes.json', 'utf8');
            const array = JSON.parse(data);
            return array;
          } catch (error) {
            return []
          }
    };
    
    async function add_hashes(array){
        for (let hash of array){
            console.log(hash);
            let exists = db.models.MissingBlocks.find({hash})
            if (!exists) await new db.models.MissingBlocks({hash}).save()
        }
    };
    
    open_file().then((hashes) => {
        add_hashes(hashes).then(() => {
            console.log(`Done procesingg ${hashes.length} missing hashes!`)
        })
    })
}



