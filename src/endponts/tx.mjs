export const getTransactionEndpoints = (db) => {

    async function get_tx_hash(req, res) {

        const { hash } = req.query

        console.log({hash})

        try {
            let result = await db.queries.getTransactionByHash(hash)
            console.log({result})
            res.send(result)
        } catch (e) {
            console.log(e)
            res.send({ error: e })
        }
    }

    return [
        {
            type: 'get',
            route: '/tx',
            handler: get_tx_hash
        }
    ]
}