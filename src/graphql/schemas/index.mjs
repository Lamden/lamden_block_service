import GraphQLJSON, { GraphQLJSONObject } from 'graphql-type-json';
import typeDefs from './types.mjs';

const resolvers = {
    JSON: GraphQLJSON,
    JSONObject: GraphQLJSONObject,
    RewardsType: {
        MASTERNODES: "masternodes",
        FOUNDATION: "foundation",
        DEVELOPER: "developer",
        BURN: "burn"
    },
    Query: {
        blockByHash: async (_, { hash }, { dataSources }) => {
            return await dataSources.dataApi.queries.getBlockHash(hash) 
        },
        blockByBlocknum: async (_, { blocknum }, { dataSources }) => {
            return await dataSources.dataApi.queries.getBlockNumber(blocknum) 
        },
        blocks: async (_, { start_block, limit }, { dataSources }) => {
            let results = await dataSources.dataApi.queries.getBlockCatchup(start_block, limit)
            if (!results || !Array.isArray(results)) return []
            return results.map(result => result.blockInfo)
        },
        nodes: async (_, { vk }, { dataSources }) => {
            if (vk) {
                let res = await dataSources.dataApi.queries.getNodeStaticsByVk(vk)
                if (!res.txs_received || !res.used_in_consensus) return []
                return [res]
            } else {
                return await dataSources.dataApi.queries.getNodeStatics()
            }
        },
        rewards: async (_, { type }, { dataSources }) => {
            if (type) {
                return await dataSources.dataApi.queries.getRewardsByType(type)
            }
            return await dataSources.dataApi.queries.getRewards()
        },
        totalRewards: async (_, { vk, start, end }, { dataSources }) => {
            return await dataSources.dataApi.queries.getTotalRewards(vk, start, end)
        },
        totalContractRewards: async (_, { contract }, { dataSources }) => {
            return await dataSources.dataApi.queries.getRewardsByContract(contract)
        },
        totalBurns: async (_, __, { dataSources }) => {
            return await dataSources.dataApi.queries.getBurnRewards()
        },
        lastdaysRewards: async (_, {vk, days}, { dataSources }) => {
            return await dataSources.dataApi.queries.getLastDaysRewards(days, vk)
        },
        contracts: async (_, __, { dataSources }) => {
            return await dataSources.dataApi.queries.getContracts()
        },
        contractDetail: async (_, { contract }, { dataSources }) => {
            return await dataSources.dataApi.queries.getContract(contract)
        },
        tokens: async (_, __, { dataSources }) => {
            return await dataSources.dataApi.queries.getTokens()
        },
        tokenDetail: async (_, { contract }, { dataSources }) => {
            return await dataSources.dataApi.queries.getToken(contract)
        },
        stats: async (_, __, { dataSources }) => {
            let latest_processed_block = await dataSources.dataApi.queries.getLastestProcessedBlock()
            let latest_synced_block = await dataSources.dataApi.queries.getLatestSyncedBlock()
            let latest_block = await dataSources.dataApi.queries.getLatestBlock()
            return ({
                updated: latest_processed_block === latest_block,
                synced: latest_synced_block === latest_block,
                latest_processed_block,
                latest_synced_block,
                latest_block
            })
        },
        historys:  async (_, { contract, variable, root_key, start_block_num, limit }, { dataSources }) => {
            if (contract) {
                if (variable) {
                    if (root_key) {
                        return  await dataSources.dataApi.queries.getRootKeyHistory(contract, variable, root_key, start_block_num, limit)
                    } else {
                        return  await dataSources.dataApi.queries.getVariableHistory(contract, variable, start_block_num, limit)
                    }
                } else {
                    return await dataSources.dataApi.queries.getContractHistory(contract, start_block_num, limit)
                }
            } else {
                return await dataSources.dataApi.queries.getAllHistory(start_block_num, limit)
            }
        },
        transaction: async (_, { hash }, { dataSources }) => {
            return await dataSources.dataApi.queries.getTransactionByHash(hash)
        },
        States: async (_, { content }, { dataSources }) => {
            if (content.length === 0) return []
            let results = await Promise.all(content.map(info => dataSources.dataApi.queries.getKeyFromCurrentState(info.contractName, info.variableName, info.key)))
            results = results.filter(result => !result.notFound)
            return results
        },
    },
};

export { typeDefs, resolvers }