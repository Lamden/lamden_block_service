import { createLogger } from '../logger.mjs';

const logger = createLogger('Stats');

export const getSyncStatsEndpoints = (db) => {
    /**
    * @openapi
    * /latest_block:
    *   get:
    *     tags: ["Sync Stats"]
    *     summary: Get the lastest block number..
    *     description: Get the lastest block number.
    *     responses:
    *       200:
    *         description: Success
    */
    async function latest_block(req, res) {
        try {
            let latest_block = await db.queries.getLatestBlock()
            res.send({ latest_block })
        } catch (e) {
            logger.error(e)
            res.send({ error: e.message })
        }
    };

    /**
    * @openapi
    * /latest_processed_block:
    *   get:
    *     tags: ["Sync Stats"]
    *     summary: Get the processed block number.
    *     description: Get the processed block number.
    *     responses:
    *       200:
    *         description: Success
    */
    async function latest_processed_block(req, res) {
        try {
            let latest_processed_block = await db.queries.getLastestProcessedBlock()
            res.send({ latest_processed_block })
        } catch (e) {
            logger.error(e)
            res.send({ error: e.message })
        }
    };

    /**
    * @openapi
    * /latest_synced_block:
    *   get:
    *     tags: ["Sync Stats"]
    *     summary: Get the synced block number.
    *     description: Get the synced block number.
    *     responses:
    *       200:
    *         description: Success
    */
    async function latest_synced_block(req, res) {
        try {
            let latest_synced_block = await db.queries.getLatestSyncedBlock()
            res.send({ latest_synced_block })
        } catch (e) {
            logger.error(e)
            res.send({ error: e.message })
        }
    };

    /**
    * @openapi
    * /synced_stats:
    *   get:
    *     tags: ["Sync Stats"]
    *     summary: Get the synced stats.
    *     description: Get the synced stats.
    *     responses:
    *       200:
    *         description: Success
    */
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
            logger.error(e)
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