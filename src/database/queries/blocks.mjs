import { createLogger } from '../../logger.mjs'

const logger = createLogger('Blocks');

export const getBlockQueries = (db) => {
    /**
     * @description Get missing block number that not be found
     * @params lastQueryHeight Last query height
     * @returns number[] 
     */
    async function getNotFoundMissingBlockNumber(start, end) {
        let result = await db.models.Blocks.aggregate([{
            $facet: {
                data: [
                    {
                        $sort: {
                            blockNum: 1
                        }
                    },
                    {
                        $match: {
                            blockNum: {
                                $gte: start,
                                $lte: end
                            }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            seq: {
                                $addToSet: "$blockNum"
                            }
                        }
                    }
                ]
            }
        }, {
            $project: {
                data: {
                    $cond: [{
                        $gt: [{
                            $size: "$data"
                        }, 0]
                    }, "$data", [{
                        "_id": null,
                        seq: []
                    }]]
                }
            }
        }, {
            $unwind: "$data"
        }, {
            $replaceRoot: {
                newRoot: "$data"
            }
        }, {
            $project: {
                missingBlock: {
                    $setDifference: [{
                        $range: [start, {
                            $cond: [{
                                $gt: [{
                                    $size: "$seq"
                                }, 0]
                            }, {
                                $max: "$seq"
                            }, end]
                        }]
                    }, "$seq"]
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
    async function getMissingBlockNumber() {
        try {
            let latestBlock = await db.queries.getLatestBlock()
            let lastQueryHeight = await db.queries.getLastQueryHeight()
            if (!lastQueryHeight) {
                lastQueryHeight = 1
            }
            // default step = 1000
            let notFoundMissingBlock, maxheight
            let step = 1000, i = 0, minheight = lastQueryHeight
            while (lastQueryHeight + step * i <= latestBlock) {
                minheight = lastQueryHeight + i * step
                let j = lastQueryHeight + (i + 1) * step
                maxheight = j < latestBlock ? j : latestBlock
                notFoundMissingBlock = await getNotFoundMissingBlockNumber(minheight, maxheight)
                logger.success(`${notFoundMissingBlock.length} previously undiscovered missing blocks was successfully found!`)

                for (const i of notFoundMissingBlock) {
                    let mblock = await db.models.MissingBlocks.findOne({ blockNum: i })
                    if (!mblock) {
                        mblock = new db.models.MissingBlocks({
                            blockNum: i
                        })
                        await mblock.save()
                    }
                }
                logger.success(`${notFoundMissingBlock.length} new missing blocks have been recorded in mongo`)

                await db.models.App.updateOne({ key: "last_query_height" }, {
                    key: "last_query_height",
                    value: maxheight
                }, { upsert: true })
                logger.success(`Update last query height success. Current query height is ${maxheight}`)

                i++
            }

            // const session = await db.startSession()
            // await session.withTransaction(async () => {
            //     for (const i of arr) {
            //         let mblock = await db.models.MissingBlocks.updateOne({ blockNum: i }).session(session)
            //         if (!mblock) {
            //             mblock.blockNum = i
            //             await mblock.save({ session })
            //         }
            //     }
            //     await db.models.App.updateOne({ key: "last_query_height" }, {
            //         key: "last_query_height",
            //         value: height
            //     }, { upsert: true }).session(session)
            // })
            // // End session
            // await session.endSession();

            let result = await db.models.MissingBlocks.find().sort({ blockNum: 1 })
            if (!result) return []
            return result.map(item => {
                return item.blockNum
            })
        } catch (e) {
            return { error: e }
        }
    }

    async function getBlockNumber(blockNum) {
        try {
            blockNum = parseInt(blockNum)
            let result = await db.models.Blocks.findOne({ blockNum }, { '_id': 0, 'keys': 0, '__v': 0 })
            if (!result) return { error: `block number ${blockNum} does not exist.` }
            if (!result.blockInfo) return { error: `block number ${blockNum} does not exist.` }
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
        start_block = parseInt(start_block)
        if (start_block < 1) start_block = 1

        // console.log({start_block, limit})

        try {
            let blocks = await db.models.Blocks.find({ blockNum: { "$gte": start_block } })
                .sort({ "blockNum": 1 })
                .limit(limit)

            if (!blocks) return []
            else return blocks
        } catch (e) {
            return { error: e }
        }
    }

    return {
        getBlockNumber,
        getBlockCatchup,
        getMissingBlockNumber
    }
}