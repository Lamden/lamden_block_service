export const getInfoEndpoints = (db) => {

    async function get_contracts(req, res) {
        try {
            let result = await db.queries.getContracts()
            console.log(result)
            res.send(result)
        } catch (e) {
            res.send({ error: e })
        }
    }

    async function get_contract(req, res) {
        const { contractName } = req.params
        try {
            let result = await db.queries.getContract(contractName)
            res.send(result)
        } catch (e) {
            console.log(e)
            res.send({ error: e })
        }
    }

    async function get_tokens(req, res) {
        try {
            let result = await db.queries.getTokens()
            console.log(result)
            res.send(result)
        } catch (e) {
            res.send({ error: e })
        }
    }

    async function get_token(req, res) {
        const { contractName } = req.params
        try {
            let result = await db.queries.getToken(contractName)
            res.send(result)
        } catch (e) {
            console.log(e)
            res.send({ error: e })
        }
    }

    return [
        {
            type: 'get',
            route: '/contracts',
            handler: get_contracts
        },
        {
            type: 'get',
            route: '/contracts/:contractName',
            handler: get_contract
        },
        {
            type: 'get',
            route: '/tokens/',
            handler: get_tokens
        },
        {
            type: 'get',
            route: '/tokens/:contractName',
            handler: get_token
        }
    ]
}