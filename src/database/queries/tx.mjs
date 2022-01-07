import * as utils from '../../utils.mjs'

export const getTransactionQueries = (db) => {

    async function getTransactionByHash(txHash) {
        return await db.models.StateChanges.findOne({txHash},{ '_id': 0, '__v': 0 })
    }

    async function getTransactionByUID(tx_uid) {
        return await db.models.StateChanges.findOne({tx_uid},{ '_id': 0, '__v': 0 })
    }

    async function getTxHistory(vk, max_tx_uid = "999999999999.00000.00000", limit=10){
        limit = parseInt(limit) || 10

        let stateChanges = await db.models.StateChanges.find({
                "txInfo.transaction.payload.sender": vk,
                tx_uid: { $lt: max_tx_uid }
            })
            .sort({ "tx_uid": -1 })
            .limit(limit)

        if (!stateChanges) return []
        else return db.utils.hydrate_state_changes_obj(stateChanges)
    }

    return {
        getTransactionByHash,
        getTransactionByUID,
        getTxHistory
    }
}