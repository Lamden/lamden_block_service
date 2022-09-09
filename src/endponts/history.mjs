import { createLogger } from '../logger.mjs'

const logger = createLogger('History');

export const getHistoryEndpoints = (db) => {
    /**
    * @openapi
    * /all_history:
    *   get:
    *     tags: ["History"]
    *     summary: Returns history info.
    *     parameters:
    *       - in: query
    *         name: limit
    *         schema: 
    *           type: integer
    *         required: false
    *         description: Limit number.
    *         default: 10
    *       - in: query
    *         name: start_block_num
    *         schema: 
    *           type: string
    *         required: false
    *         description: start block number.
    *         default: '0'
    *     responses:
    *       200:
    *         description: Success
    */
    async function all_history(req, res) {
        const { start_block_num, limit } = req.query

        try {
            let history = await db.queries.getAllHistory(start_block_num, limit)
            res.send({ history })
        } catch (e) {
            logger.error(e)
            res.send({ error: e.message })
        }

    }

    /**
    * @openapi
    * /contract_history:
    *   get:
    *     tags: ["History"]
    *     summary: Returns history info of state changes of contract.
    *     parameters:
    *       - in: query
    *         name: contract
    *         schema: 
    *           type: string
    *         required: true
    *         description: Contract name.
    *         example: currency
    *       - in: query
    *         name: limit
    *         schema: 
    *           type: integer
    *         required: false
    *         description: Limit number.
    *         default: 10
    *       - in: query
    *         name: start_block_num
    *         schema: 
    *           type: string
    *         required: false
    *         description: start block number.
    *         default: 0
    *     responses:
    *       200:
    *         description: Success
    */
    async function contract_history(req, res) {
        const { contract, start_block_num, limit } = req.query

        try {
            let history = await db.queries.getContractHistory(contract, start_block_num, limit)
            res.send({ history })
        } catch (e) {
            logger.error(e)
            res.send({ error: e.message })
        }

    }

    /**
    * @openapi
    * /variable_history:
    *   get:
    *     tags: ["History"]
    *     summary: Returns history info of state changes of variable.
    *     parameters:
    *       - in: query
    *         name: contract
    *         schema: 
    *           type: string
    *         required: true
    *         description: Contract name.
    *         example: currency
    *       - in: query
    *         name: variable
    *         schema: 
    *           type: string
    *         required: true
    *         description: variable name.
    *         example: balances
    *       - in: query
    *         name: limit
    *         schema: 
    *           type: integer
    *         required: false
    *         description: Limit number.
    *         default: 10
    *       - in: query
    *         name: start_block_num
    *         schema: 
    *           type: string
    *         required: false
    *         description: start block number.
    *         default: 0
    *     responses:
    *       200:
    *         description: Success
    */
    async function variable_history(req, res) {
        const { contract, variable, start_block_num, limit } = req.query

        try {
            let history = await db.queries.getVariableHistory(contract, variable, start_block_num, limit)
            res.send({ history })
        } catch (e) {
            logger.error(e)
            res.send({ error: e.message })
        }
    }

    /**
    * @openapi
    * /rootkey_history:
    *   get:
    *     tags: ["History"]
    *     summary: Returns history info of state changes of rootkey.
    *     parameters:
    *       - in: query
    *         name: contract
    *         schema: 
    *           type: string
    *         required: true
    *         description: Contract name.
    *         example: currency
    *       - in: query
    *         name: variable
    *         schema: 
    *           type: string
    *         required: true
    *         description: variable name.
    *         example: balances
    *       - in: query
    *         name: root_key
    *         schema: 
    *           type: string
    *         required: true
    *         description: Root key.
    *         example: 2341d744f11658d7f1ca1c514a1b76ff07898435c46402b1e4f8b00d4a13f5f9
    *       - in: query
    *         name: limit
    *         schema: 
    *           type: integer
    *         required: false
    *         description: Limit number.
    *         default: 10
    *       - in: query
    *         name: start_block_num
    *         schema: 
    *           type: string
    *         required: false
    *         description: start block number.
    *         default: 0
    *     responses:
    *       200:
    *         description: Success
    */
    async function rootkey_history(req, res) {
        const { contract, variable, root_key, start_block_num, limit } = req.query

        try {
            let history = await db.queries.getRootKeyHistory(contract, variable, root_key, start_block_num, limit)
            res.send({ history })
        } catch (e) {
            logger.error(e)
            res.send({ error: e.message })
        }
    };

    /**
    * @openapi
    * /tx_history/{vk}:
    *   get:
    *     tags: ["History"]
    *     summary: Returns tx history info by account vk.
    *     parameters:
    *       - in: path
    *         name: vk
    *         schema: 
    *           type: string
    *         required: true
    *         description: User account vk.
    *         example: 2341d744f11658d7f1ca1c514a1b76ff07898435c46402b1e4f8b00d4a13f5f9
    *       - in: query
    *         name: limit
    *         schema: 
    *           type: integer
    *         required: false
    *         description: Limit number.
    *         default: 10
    *       - in: query
    *         name: last_block_number
    *         schema: 
    *           type: string
    *         required: false
    *         description: last block number.
    *         default: 8888888888888888888
    *         example: 8888888888888888888
    *     responses:
    *       200:
    *         description: Success
    */
    async function tx_history(req, res) {
        const { vk } = req.params
        const { last_block_number, limit } = req.query

        try {
            let history = await db.queries.getTxHistory(vk, last_block_number, limit)
            res.send({ history })
        } catch (e) {
            logger.error(e)
            res.send({ error: e.message })
        }
    }
    return [
        {
            type: 'get',
            route: '/all_history',
            handler: all_history
        },
        {
            type: 'get',
            route: '/contract_history',
            handler: contract_history
        },
        {
            type: 'get',
            route: '/variable_history',
            handler: variable_history
        },
        {
            type: 'get',
            route: '/rootkey_history',
            handler: rootkey_history
        },
        {
            type: 'get',
            route: '/tx_history/:vk',
            handler: tx_history
        },

    ]
}