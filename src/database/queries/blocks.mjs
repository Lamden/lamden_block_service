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
        }, {
            $group: {
                _id: null,
                hashs: {
                    $addToSet: "$hash"
                },
                pre_hashs: {
                    $addToSet: "$blockInfo.previous"
                }
            }
        }, {
            $project: {
                missingBlock: {
                    $setDifference: ["$pre_hashs", "$hashs"]
                }
            }
        }, {
            $unwind: {
                path: "$missingBlock"
            }
        }])
        if (!result) return []
        return result.map(item => {
            return item.missingBlock
        })
    }

    /**
     * @description Get all missing block number
     * @returns number[] 
     */
    async function getMissingBlocks() {
        try {
            const notFoundMissingBlock = await getNotFoundMissingBlockNumber()
            logger.log({notFoundMissingBlock})
            logger.success(`${notFoundMissingBlock.length} previously undiscovered missing blocks was successfully found!`)

            for (const i of notFoundMissingBlock) {
                let mblock = await db.models.MissingBlocks.findOne({ hash: i })
                if (!mblock) {
                    mblock = new db.models.MissingBlocks({
                        hash: i
                    })
                    await mblock.save()
                }
            }
            logger.success(`${notFoundMissingBlock.length} new missing blocks have been recorded in database`)

            let result = await db.models.MissingBlocks.find()

            if (!result) return []
            return result.map(item => {
                return item.hash
            })
            v
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