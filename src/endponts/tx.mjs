export const getTransactionEndpoints = (db) => {

    async function get_tx(req, res) {

        let { hash, uid } = req.query

        if (hash && uid) uid = null

        let result = null

        try {
            if (hash) result = await db.queries.getTransactionByHash(hash)
            if (uid) result = await db.queries.getTransactionByUID(uid)
            res.send(result)
        } catch (e) {
            console.log(e)
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