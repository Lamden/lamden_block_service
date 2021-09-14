import * as utils from '../utils.mjs'

export const getStateEndpoints = (db) => {
    async function key(req, res) {
        try {
            const { contractName, variableName, key } = req.params
            res.send(await db.queries.getKeyFromCurrentState(contractName, variableName, key))
        } catch (e) {
            res.send(e)
        }
    }

    async function keys(req, res) {
        try {
            let results = await Promise.all(req.body.map(info => db.queries.getKeyFromCurrentState(info.contractName, info.variableName, info.key)))
            results = results.filter(result => !result.notFound)
            res.send(results)
        } catch (e) {
            res.send(e)
        }
    }

    async function all_state(req, res) {
        const { contractName, variableName, rootkey } = req.params

        let stateResults = await db.queries.getAllCurrentState(contractName, variableName, rootkey)
        if (stateResults.length === 0) res.send({})
        else{
            let allStateObjects = stateResults.map(result => utils.keysToObj(utils.deconstructKey(result.rawKey), result.value))
            let merged = utils.mergeObjects(allStateObjects)
            res.send(utils.cleanObj(merged))
        }
    }

    return [{
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