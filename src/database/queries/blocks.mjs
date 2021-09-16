export const getBlockQueries = (db) => {
    async function getBlockNumber(blockNum) {
        try{
            blockNum = parseInt(blockNum)
            let result =  await db.models.Blocks.findOne({blockNum}, { '_id': 0, 'keys': 0, '__v': 0 })
            if (!result) return { error: `block number ${blockNum} does not exist.` }
            if (!result.blockInfo) return { error: `block number ${blockNum} does not exist.` }
            return result.blockInfo
        }catch(e){
            return { error: e }
        }
        
    }

    async function getBlockCatchup(start_block = 0, limit = 10) {
        
        if (!limit) limit = 10
        limit = parseInt(limit)
        if (limit > 100) limit = 100
        if (limit < 1) limit = 10

        if (!start_block) start_block = 1
        start_block = parseInt(start_block)
        if (start_block < 1) start_block = 1

        // console.log({start_block, limit})

        try{
            let blocks = await db.models.Blocks.find({blockNum: {"$gte": start_block}})
            .sort({ "blockNum": 1 })
            .limit(limit)

            if (!blocks) return []
            else return blocks
        }catch(e){
            return { error: e }
        }
    }

    return {
        getBlockNumber,
        getBlockCatchup
    }
}