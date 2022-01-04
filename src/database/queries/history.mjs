import util from 'util'

export const getHistoryQueries = (db) => {

    async function countHistory() {
        return await db.models.StateChanges.countDocuments()
    }

    async function getAllHistory(last_tx_uid = "000000000000.00000.00000", limit = 10) {
        limit = parseInt(limit) || 10

        let stateChanges = await db.models.StateChanges.find({
                tx_uid: { $gt: last_tx_uid }
            })
            .sort({ "tx_uid": 1 })
            .limit(limit)

        if (!stateChanges) return []
        else return db.utils.hydrate_state_changes_obj(stateChanges)
    }

    async function getContractHistory(contractName, last_tx_uid = "000000000000.00000.00000", limit = 10) {
        limit = parseInt(limit) || 10

        let stateChanges = await db.models.StateChanges.find({
                "affectedContractsList": contractName,
                tx_uid: { $gt: last_tx_uid }
            })
            .sort({ "tx_uid": 1 })
            .limit(limit)

        if (!stateChanges) return []
        else return db.utils.hydrate_state_changes_obj(stateChanges)
    }

    async function getVariableHistory(contractName, variableName, last_tx_uid = "000000000000.00000.00000", limit = 10) {
        limit = parseInt(limit) || 10

        let stateChanges = await db.models.StateChanges.find({
                "affectedVariablesList": `${contractName}.${variableName}`,
                tx_uid: { $gt: last_tx_uid }
            })
            .sort({ "tx_uid": 1 })
            .limit(limit)

        if (!stateChanges) return []
        else return db.utils.hydrate_state_changes_obj(stateChanges)
    }

    async function getRootKeyHistory(contractName, variableName, rootKey, last_tx_uid = "000000000000.00000.00000", limit = 10) {
        limit = parseInt(limit) || 10

        let stateChanges = await db.models.StateChanges.find({
                "affectedRootKeysList": `${contractName}.${variableName}:${rootKey}`,
                tx_uid: { $gt: last_tx_uid }
            })
            .sort({ "tx_uid": 1 })
            .limit(limit)

        if (!stateChanges) return []
        else return db.utils.hydrate_state_changes_obj(stateChanges)
    }

    async function getPreviousKeyValue(contractName, variableName, keys, tx_uid){
        let rawKey = `${contractName}.${variableName}`
        if (keys.length > 0 ) rawKey = `${rawKey}:${keys.join(":")}`

        let result = await db.models.StateChanges.findOne(
            {
                "affectedRawKeysList": rawKey,
                tx_uid: { $lt: tx_uid }
            },{ '_id': 0, 'keys': 0, '__v': 0 }).sort({tx_uid: -1})

        if (!result) {
            return {
                value: null, 
                tx_uid: null
            }
        }

        if(!result.state_changes_obj) result.state_changes_obj = {}
        if (typeof result.state_changes_obj === "string") result.state_changes_obj = JSON.parse(result.state_changes_obj)

        let value = result.state_changes_obj[contractName][variableName]

        if (keys.length === 0) {
            return {
                value, 
                tx_uid: result.tx_uid
            }
        }

        try{
            for (let key of keys){
                value = value[key]
            }

            let has_self = value !== null && typeof value.__hash_self__ !== 'undefined'

            return {
                value: has_self ? value.__hash_self__ : value, 
                tx_uid: result.tx_uid
            }
        }catch(e){
            console.log(e)
            return {
                value: null, 
                tx_uid: result.tx_uid
            }
        }

    }

    return {
        getAllHistory,
        getContractHistory,
        getVariableHistory,
        getRootKeyHistory,
        getPreviousKeyValue,
        countHistory
    }
}