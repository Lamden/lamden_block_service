export const getHistoryEndpoints = (db) => {
    async function all_history(req, res) {
        const { last_tx_uid, limit } = req.query

        try {
            let history = await db.queries.getAllHistory(last_tx_uid, limit)
            res.send({ history })
        } catch (e) {
            res.send({ error: e })
        }

    }

    async function contract_history(req, res) {
        const { contract, last_tx_uid, limit } = req.query

        try {
            let history = await db.queries.getContractHistory(contract, last_tx_uid, limit)
            res.send({ history })
        } catch (e) {
            res.send({ error: e })
        }

    }

    async function variable_history(req, res) {
        const { contract, variable, last_tx_uid, limit } = req.query

        try {
            let history = await db.queries.getVariableHistory(contract, variable, last_tx_uid, limit)
            res.send({ history })
        } catch (e) {
            res.send({ error: e })
        }
    }

    async function rootkey_history(req, res) {
        const { contract, variable, root_key, last_tx_uid, limit } = req.query

        try {
            let history = await db.queries.getRootKeyHistory(contract, variable, root_key, last_tx_uid, limit)
            res.send({ history })
        } catch (e) {
            res.send({ error: e })
        }
    };
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
        }
    ]
}