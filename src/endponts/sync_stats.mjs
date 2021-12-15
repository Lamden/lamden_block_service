export const getSyncStatsEndpoints = (db) => {

    async function latest_block(req, res) {
        try {
            let latest_block = await db.queries.getLatestBlock()
            res.send({ latest_block })
        } catch (e) {
            console.log(e)
            res.send({ error: e.message })
        }
    };

    async function latest_processed_block(req, res) {
        try {
            let latest_processed_block = await db.queries.getLastestProcessedBlock()
            res.send({ latest_processed_block })
        } catch (e) {
            console.log(e)
            res.send({ error: e.message })
        }
    };

    async function latest_synced_block(req, res) {
        try {
            let latest_synced_block = await db.queries.getLatestSyncedBlock()
            res.send({ latest_synced_block })
        } catch (e) {
            console.log(e)
            res.send({ error: e.message })
        }
    };

    async function synced_stats(req, res) {
        try {
            let latest_processed_block = await db.queries.getLastestProcessedBlock()
            let latest_synced_block = await db.queries.getLatestSyncedBlock()
            let latest_block = await db.queries.getLatestBlock()
            res.send({
                updated: latest_processed_block === latest_block,
                synced: latest_synced_block === latest_block,
                latest_processed_block,
                latest_synced_block,
                latest_block
            })
        } catch (e) {
            console.log(e)
            res.send({ error: e.message })
        }
    };

    return [{
            type: 'get',
            route: '/latest_block',
            handler: latest_block
        },
        {
            type: 'get',
            route: '/latest_processed_block',
            handler: latest_processed_block
        },
        {
            type: 'get',
            route: '/latest_synced_block',
            handler: latest_synced_block
        },
        {
            type: 'get',
            route: '/synced_stats',
            handler: synced_stats
        }
    ]
}