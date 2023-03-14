import { createLogger } from '../../logger.mjs'

const logger = createLogger('Blocks');

export const getBlockQueries = (db) => {
    /**
     * @description Get missing block number that not be found
     * @params lastQueryHeight Last query height
     * @returns number[] 
     */
    async function getNotFoundMissingBlockNumber() {
        let result = await db.models.Blocks.aggregate([{
            $match: {
                'previousExist': { "$ne": true }
            }
        }])
        if (!result) return []
        return result
    }

    /**
     * @description Get all next blocks number of missing block
     * @returns number[] 
     */
    async function getMissingBlocks() {
        try {
            const notFoundMissingBlock = await getNotFoundMissingBlockNumber()

            logger.success(`${notFoundMissingBlock.length} previously undiscovered missing blocks was successfully found!`)

            for (const i of notFoundMissingBlock) {
                // do nothing for genesis block
                if (i.blockNum === "0" || i.blockNum === 0) return
                let mblock = await db.models.MissingBlocks.findOne({ hash: i.hash })
                if (!mblock) {
                    mblock = new db.models.MissingBlocks({
                        number: i.blockNum
                    })
                    await mblock.save()
                }
            }
            logger.success(`${notFoundMissingBlock.length} new missing blocks have been recorded in database`)

            let result = await db.models.MissingBlocks.find()

            if (!result) return []
            return result.map(item => {
                return item.number
            })
        } catch (e) {
            return { error: e }
        }
    }

    async function getBlockNumber(blockNum) {
        try {
            let result = await db.models.Blocks.findOne({ blockNum }, { '_id': 0, 'keys': 0, '__v': 0 })
            if (!result) return { error: `block number ${blockNum} does not exist.` }
            if (!result.blockInfo) return { error: `block number ${blockNum} does not exist.` }
            return result.blockInfo
        } catch (e) {
            return { error: e }
        }

    }


    async function getBlockHash(blockHash) {
        try {
            let result = await db.models.Blocks.findOne({ hash: blockHash }, { '_id': 0, 'keys': 0, '__v': 0 })
            if (!result) return { error: `block hash ${blockHash} does not exist.` }
            if (!result.blockInfo) return { error: `block number ${blockHash} does not exist.` }
            return result.blockInfo
        } catch (e) {
            return { error: e }
        }

    }

    async function getBlockCatchup(start_block = 0, limit = 10) {

        if (!limit) limit = 10
        limit = parseInt(limit)
        if (limit > 100) limit = 100
        if (limit < 1) limit = 10

        if (!start_block) start_block = 1
        start_block = start_block
        if (start_block < 1) start_block = 1

        try {
            let blocks = await db.models.Blocks.find({ 
                "$expr": { 
                    "$gte": [ { "$toLong": "$blockNum" }, { "$toLong": start_block }] 
                } 
            })
            .collation({"locale":"en", "numericOrdering":true})
            .sort({ "blockNum": 1 })
            .limit(limit)

            if (!blocks) return []
            else return blocks
        } catch (e) {
            return { error: e }
        }
    }

    async function hasGenesisBlock(){
        const block = await getBlockNumber('0')
        return !block.error
    }

    return {
        getBlockNumber,
        getBlockHash,
        getBlockCatchup,
        getMissingBlocks,
        hasGenesisBlock
    }
}