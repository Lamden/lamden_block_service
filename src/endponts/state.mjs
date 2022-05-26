import * as utils from '../utils.mjs'

export const getStateEndpoints = (db) => {

    /**
    * @openapi
    * /current/one/{contractName}/{variableName}:
    *   get:
    *     tags: ["State"]
    *     summary: Returns current state value of variable.
    *     parameters:
    *       - in: path
    *         name: contractName
    *         schema: 
    *           type: string
    *         required: true
    *         description: Contract name.
    *         example: con_survival_test
    *       - in: path
    *         name: variableName
    *         schema: 
    *           type: string
    *         required: true
    *         description: variable name.
    *         example: operator
    *     responses:
    *       200:
    *         description: Success
    */

    /**
    * @openapi
    * /current/one/{contractName}/{variableName}/{key}:
    *   get:
    *     tags: ["State"]
    *     summary: Returns current state value of key.
    *     parameters:
    *       - in: path
    *         name: contractName
    *         schema: 
    *           type: string
    *         required: true
    *         description: Contract name.
    *         example: con_survival_test
    *       - in: path
    *         name: variableName
    *         schema: 
    *           type: string
    *         required: true
    *         description: variable name.
    *         example: game
    *       - in: path
    *         name: key
    *         schema: 
    *           type: string
    *         required: true
    *         description: Key.
    *         example: boss_enabled
    *     responses:
    *       200:
    *         description: Success
    */
    async function key(req, res) {
        try {
            const { contractName, variableName, key } = req.params
            let result = await db.queries.getKeyFromCurrentState(contractName, variableName, key)
            res.send(result)
        } catch (e) {
            res.send(e)
        }
    }

    /**
    * @openapi
    * /current/keys:
    *   post:
    *     tags: ["State"]
    *     summary: Returns current states value.
    *     requestBody:
    *       description: Payload
    *       content: 
    *           'application/json':
    *               schema:
    *                   type: array
    *                   items: 
    *                       type: object
    *                       properties: 
    *                           contractName: 
    *                               description: Contract name
    *                               type: string
    *                               example: con_survival_test
    *                               required: true      
    *                           variableName: 
    *                               description: Variable name
    *                               type: string
    *                               example: game
    *                               required: true       
    *                           key: 
    *                               description: Variable name
    *                               type: string
    *                               example: amount_boss
    *                               required: false  
    *     responses:
    *       200:
    *         description: Success
    */

    async function keys(req, res) {
        try {
            let results = await Promise.all(req.body.map(info => db.queries.getKeyFromCurrentState(info.contractName, info.variableName, info.key)))
            results = results.filter(result => !result.notFound)
            res.send(results)
        } catch (e) {
            res.send(e)
        }
    }

    /**
    * @openapi
    * /current/all/{contractName}:
    *   get:
    *     tags: ["State"]
    *     summary: Returns all states of contract.
    *     parameters:
    *       - in: path
    *         name: contractName
    *         schema: 
    *           type: string
    *         required: true
    *         description: Contract name.
    *         example: con_survival_test
    *     responses:
    *       200:
    *         description: Success
    */

    /**
    * @openapi
    * /current/all/{contractName}/{variableName}:
    *   get:
    *     tags: ["State"]
    *     summary: Returns all states of variable of contract.
    *     parameters:
    *       - in: path
    *         name: contractName
    *         schema: 
    *           type: string
    *         required: true
    *         description: Contract name.
    *         example: con_survival_test
    *       - in: path
    *         name: variableName
    *         schema: 
    *           type: string
    *         required: true
    *         description: Variable name.
    *         example: game
    *     responses:
    *       200:
    *         description: Success
    */

    /**
    * @openapi
    * /current/all/{contractName}/{variableName}/{rootkey}:
    *   get:
    *     tags: ["State"]
    *     summary: Returns all states of key of variable of contract.
    *     parameters:
    *       - in: path
    *         name: contractName
    *         schema: 
    *           type: string
    *         required: true
    *         description: Contract name.
    *         example: con_survival_test
    *       - in: path
    *         name: variableName
    *         schema: 
    *           type: string
    *         required: true
    *         description: Variable name.
    *         example: game
    *       - in: path
    *         name: rootkey
    *         schema: 
    *           type: string
    *         required: true
    *         description: key name.
    *         example: boss_enabled
    *     responses:
    *       200:
    *         description: Success
    */

    async function all_state(req, res) {
        const { contractName, variableName, rootkey } = req.params

        let stateResults = await db.queries.getAllCurrentState(contractName, variableName, rootkey)
        if (stateResults.length === 0) res.send({})
        else {
            let allStateObjects = stateResults.map(result => utils.keysToObj(utils.deconstructKey(result.rawKey), result.value))
            let merged = utils.mergeObjects(allStateObjects)
            res.send(utils.cleanObj(merged))
        }
    }
    return [
        {
            type: 'get',
            route: '/current/one/:contractName/:variableName',
            handler: key
        },
        {
            type: 'get',
            route: '/current/one/:contractName/:variableName/:key',
            handler: key
        },
        {
            type: 'post',
            route: '/current/keys',
            handler: keys
        },
        {
            type: 'get',
            route: '/current/all/:contractName',
            handler: all_state
        },
        {
            type: 'get',
            route: '/current/all/:contractName/:variableName',
            handler: all_state
        },
        {
            type: 'get',
            route: '/current/all/:contractName/:variableName/:rootkey',
            handler: all_state
        }
    ]
}