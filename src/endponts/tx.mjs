import { createLogger } from '../logger.mjs'

const logger = createLogger('tx');

export const getTransactionEndpoints = (db) => {
    /**
    * @openapi
    * /tx:
    *   get:
    *     tags: ["State"]
    *     summary: Returns a transaction info.
    *     description: Get Transaction Info by txhash/uid. If both tx hash and tx uid are provided, it will return the tx info by tx hash.
    *     parameters:
    *       - in: query
    *         name: hash
    *         schema: 
    *           type: string
    *         required: false
    *         description: Transaction hash value.
    *       - in: query
    *         name: uid
    *         schema: 
    *           type: string
    *         required: false
    *         description: Transaction unique id.
    *     responses:
    *       200:
    *         description: Success
    */
    async function get_tx(req, res) {

        let { hash, uid } = req.query

        if (hash && uid) uid = null

        let result = null

        try {
            if (hash) result = await db.queries.getTransactionByHash(hash)
            if (uid) result = await db.queries.getTransactionByUID(uid)
            if (result) {
                if (typeof result.state_changes_obj === "string") result.state_changes_obj = JSON.parse(result.state_changes_obj)
            }
            res.send(result)
        } catch (e) {
            logger.error(e)
            res.send({ error: e.message })
        }
    }

    return [
        {
            type: 'get',
            route: '/tx',
            handler: get_tx
        }
    ]
}