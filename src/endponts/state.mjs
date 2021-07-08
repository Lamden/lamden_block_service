export const getStateEndpoints = (db) => {
    async function key(req, res) {
        const { contractName, variableName, key } = req.params
        res.send(await db.queries.getKeyFromCurrentState(contractName, variableName, key))
    }

    async function keys(req, res) {
        try {
            res.send(await Promise.all(req.body.map(info => db.queries.getKeyFromCurrentState(info.contractName, info.variableName, info.key))))
        } catch (e) {
            res.send(e)
        }
    }

    return [{
            type: 'get',
            route: '/current/:contractName/:variableName/:key',
            handler: key
        },
        {
            type: 'post',
            route: '/current/keys',
            handler: keys
        }
    ]
}