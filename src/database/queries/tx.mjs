import * as utils from '../../utils.mjs'

export const getTransactionQueries = (db) => {

    async function getTransactionByHash(txHash) {
        return await db.models.StateChanges.findOne({txHash},{ '_id': 0, '__v': 0 })
    }

    async function getTransactionByUID(tx_uid) {
        return await db.models.StateChanges.findOne({tx_uid},{ '_id': 0, '__v': 0 })
    }


    return {
        getTransactionByHash,
        getTransactionByUID
    }
}