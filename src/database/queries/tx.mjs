import * as utils from '../../utils.mjs'

export const getTransactionQueries = (db) => {

    async function getTransactionByHash(txHash) {
        console.log({txHash})
        return await db.models.StateChanges.find({txHash},{ '_id': 0, '__v': 0 })
    }


    return {
        getTransactionByHash
    }
}