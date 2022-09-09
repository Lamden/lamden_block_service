import * as utils from '../../utils.mjs'

export const getTransactionQueries = (db) => {

    async function getTransactionByHash(txHash) {
        return await db.models.StateChanges.findOne({txHash},{ '_id': 0, '__v': 0 })
    }

    async function getTransactionByBlockNum(BlockNum) {
        return await db.models.StateChanges.findOne({BlockNum},{ '_id': 0, '__v': 0 })
    }

    async function getTxHistory(vk, blockNum = "999999999999999999999999999999", limit=10){
        limit = parseInt(limit) || 10

        let stateChanges = await db.models.StateChanges.find({
                senderVk: vk,
                blockNum: { $lt: blockNum }
            })
            .sort({ "blockNum": -1 })
            .limit(limit)

        if (!stateChanges) return []
        else return db.utils.hydrate_state_changes_obj(stateChanges)
    }

    async function getTxHistoryByPage(vk, page=0, page_limit=10){
        try{
            page_limit = parseInt(page_limit) || 10
        }catch(e){
            page_limit = 10
        }
        
        let stateChanges = await db.models.StateChanges.find({
                senderVk: vk
            })
            .sort({ "blockNum": -1 })
            .skip(page_limit * page)
            .limit(page_limit)

        if (!stateChanges) return []
        else return db.utils.hydrate_state_changes_obj(stateChanges)
    }

    return {
        getTransactionByHash,
        getTransactionByBlockNum,
        getTxHistory,
        getTxHistoryByPage
    }
}