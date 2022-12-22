import { createLogger } from '../logger.mjs'

const logger = createLogger('statics');

export const getStaticsEndpoints = (db) => {
    async function nodeStaticsByVk(req, res) {

        let { vk } = req.params

        let result = null

        try {
            if (vk) result = await db.queries.getNodeStaticsByVk(vk)
            res.send(result)
        } catch (e) {
            logger.error(e)
            res.send({ error: e.message })
        }
    }

    async function nodeStatics(_, res) {
        let result = null

        try {
            result = await db.queries.getNodeStatics()
            res.send(result)
        } catch (e) {
            logger.error(e)
            res.send({ error: e.message })
        }
    }

    async function rewards(req, res) {
        let result

        let { recipient, start, end} = req.query
        if (recipient) {
            result = await db.queries.getRewardsByVk(recipient, start, end)
        } else {
            result = await db.queries.getRewards()
        }
        res.send(result)
    }

    async function rewardsByType(req, res) {
        let { type } = req.params

        let result = {}

        try {
            if (type) {
                if (type === "total") {
                    let {recipient, start, end} = req.query
                    result = await db.queries.getTotalRewards(recipient, start, end)
                } else if (type === "lastdays") {
                    let { recipient, days } = req.query
                    // default 7 days
                    if (!days) days = 7
                    result = await db.queries.getLastDaysRewards(days, recipient)
                } else if (type === "burn") {
                    result = await db.queries.getBurnRewards()
                } else {
                    result = await db.queries.getRewardsByType(type)
                }
            }
            res.send(result)
        } catch (e) {
            logger.error(e)
            res.send({ error: e.message })
        }
    }

    async function rewardsByContract(req, res) {

        let { contract } = req.params

        let result = await db.queries.getRewardsByContract(contract)
        res.send(result)
    }

    async function lastDaysRewards(req, res) {
        let { recipient, days } = req.query

        // default 7 days
        if (!days) days = 7

        let result = await db.queries.getLastDaysRewards(days, recipient)
        res.send(result)
    }

    return [
        {
            type: 'get',
            route: '/nodes/:vk',
            handler: nodeStaticsByVk
        },
        {
            type: 'get',
            route: '/nodes',
            handler: nodeStatics
        },
        {
            type: 'get',
            route: '/rewards',
            handler: rewards
        },
        {
            type: 'get',
            route: '/rewards/:type',
            handler: rewardsByType
        },
        {
            type: 'get',
            route: '/rewards/developer/:contract',
            handler: rewardsByContract
        },
    ]
}