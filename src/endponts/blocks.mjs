import { createLogger } from '../logger.mjs';

const logger = createLogger('Blocks');

export const getBlockEndpoints = (db) => {

    /**
    * @openapi
    * /blocks/{item}:
    *   get: /
    *     tags: ["Blocks"]
    *     summary: Returns block info from a specified block number or block hash.
    *     parameters:
    *       - in: path
    *         name: item
    *         schema: 
    *           type: string
    *         required: true
    *         description: Block number or block hash.
    *     responses:
    *       200:
    *         description: Success
    *       Not Exists:
    *         description: Block number or block hash does not exist.
    *         content: 
    *           'application/json':
    *               schema:
    *                   properties: 
    *                       error:
    *                           description: Error message
    *                           type: string
    *                           default: block number 9999999999 does not exist.
    *                   required: ["error"]
    */
    async function get_block(req, res) {
        const { item } = req.params

        if (!item) res.send({ error: "no block number or block hash number provided" })

        try {
            let result = null
            if (item.length === 64){
                result = await db.queries.getBlockHash(item)
            }else{
                result = await db.queries.getBlockNumber(item)
            }
            res.send(result)
        } catch (e) {
            logger.error(e)
            res.send({ error: e.message })
        }
    }

    /**
    * @openapi
    * /blocks:
    *   get:
    *     tags: ["Blocks"]
    *     summary: Returns a number of blocks info.
    *     description: Get a number of blocks info. Max number is 100 and  default number is 10.
    *     parameters:
    *       - in: query
    *         name: limit
    *         schema: 
    *           type: number
    *         required: false
    *         description: Limit the number of the returned blocks info.
    *       - in: query
    *         name: start_block
    *         schema: 
    *           type: number
    *         required: false
    *         description: Block number.
    *     responses:
    *       200:
    *         description: Success
    */
    async function get_blocks_catchup(req, res) {
        const { start_block, limit } = req.query

        try {
            let results = await db.queries.getBlockCatchup(start_block, limit)
            results = results.map(result => result.blockInfo)
            res.send(results)
        } catch (e) {
            logger.error(e)
            res.send({ error: e.message })
        }
    }

    return [
        {
            type: 'get',
            route: '/blocks/:item',
            handler: get_block
        },
        {
            type: 'get',
            route: '/blocks',
            handler: get_blocks_catchup
        },
    ]
}