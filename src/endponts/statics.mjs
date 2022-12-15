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

        let { recipient } = req.query

        if (recipient) {
            result = await db.queries.getRewardsByVk(recipient)
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
                if (type === "burn") {
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