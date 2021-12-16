export const getBlockEndpoints = (db) => {

    async function get_block_number(req, res) {
        const { number } = req.params

        if (!number) res.send({ error: "no block number provided" })

        try {
            let result = await db.queries.getBlockNumber(number)
            res.send(result)
        } catch (e) {
            console.log(e)
            res.send({ error: e.message })
        }
    }

    async function get_blocks_catchup(req, res) {
        const { start_block, limit } = req.query

        try {
            let results = await db.queries.getBlockCatchup(start_block, limit)
            results = results.map(result => result.blockInfo)
            res.send(results)
        } catch (e) {
            console.log(e)
            res.send({ error: e.message })
        }
    }

    return [
        {
            type: 'get',
            route: '/blocks/:number',
            handler: get_block_number
        },
        {
            type: 'get',
            route: '/blocks',
            handler: get_blocks_catchup
        },
    ]
}