import util from 'util'

export const getHistoryQueries = (db) => {

    async function countHistory() {
        return await db.models.StateChanges.countDocuments()
    }

    async function getAllHistory(last_blockNum = "0", limit = 10) {
        limit = parseInt(limit) || 10

        let stateChanges = await db.models.StateChanges.find({
                "$expr": { 
                    "$gte": [ { "$toLong": "$blockNum" }, { "$toLong": last_blockNum }] 
                } 
            })
            .collation({"locale":"en", "numericOrdering":true})
            .sort({ "blockNum": 1 })
            .limit(limit)

        if (!stateChanges) return []
        else return db.utils.hydrate_state_changes_obj(stateChanges)
    }

    async function getContractHistory(contractName, last_blockNum = "0", limit = 10) {
        limit = parseInt(limit) || 10

        let stateChanges = await db.models.StateChanges.find({
                "affectedContractsList": contractName,
                "$expr": { 
                    "$gt": [ { "$toLong": "$blockNum" }, { "$toLong": last_blockNum }] 
                }
            })
            .collation({"locale":"en", "numericOrdering":true})
            .sort({ "blockNum": 1 })
            .limit(limit)

        if (!stateChanges) return []
        else return db.utils.hydrate_state_changes_obj(stateChanges)
    }

    async function getVariableHistory(contractName, variableName, last_blockNum = "0", limit = 10) {
        limit = parseInt(limit) || 10

        let stateChanges = await db.models.StateChanges.find({
                "affectedVariablesList": `${contractName}.${variableName}`,
                "$expr": { 
                    "$gt": [ { "$toLong": "$blockNum" }, { "$toLong": last_blockNum }] 
                }
            })
            .collation({"locale":"en", "numericOrdering":true})
            .sort({ "blockNum": 1 })
            .limit(limit)

        if (!stateChanges) return []
        else return db.utils.hydrate_state_changes_obj(stateChanges)
    }

    async function getRootKeyHistory(contractName, variableName, rootKey, last_blockNum = "0", limit = 10) {
        limit = parseInt(limit) || 10

        let stateChanges = await db.models.StateChanges.find({
                "affectedRootKeysList": `${contractName}.${variableName}:${rootKey}`,
                "$expr": { 
                    "$gt": [ { "$toLong": "$blockNum" }, { "$toLong": last_blockNum }] 
                }
            })
            .collation({"locale":"en", "numericOrdering":true})
            .sort({ "blockNum": 1 })
            .limit(limit)

        if (!stateChanges) return []
        else return db.utils.hydrate_state_changes_obj(stateChanges)
    }

    async function getPreviousKeyValue(contractName, variableName, keys, blockNum){
        let rawKey = `${contractName}.${variableName}`
        if (keys.length > 0 ) rawKey = `${rawKey}:${keys.join(":")}`

        let result = await db.models.StateChanges.findOne(
            {
                "affectedRawKeysList": rawKey,
                "$expr": { 
                    "$lt": [ { "$toLong": "$blockNum" }, { "$toLong": last_blockNum }] 
                }
            },{ '_id': 0, 'keys': 0, '__v': 0 }).sort({blockNum: -1})

        if (!result) {
            return {
                value: null, 
                blockNum: null
            }
        }

        if(!result.state_changes_obj) result.state_changes_obj = {}
        if (typeof result.state_changes_obj === "string") result.state_changes_obj = JSON.parse(result.state_changes_obj)

        let value = result.state_changes_obj[contractName][variableName]

        if (keys.length === 0) {
            return {
                value, 
                blockNum: result.blockNum
            }
        }

        try{
            for (let key of keys){
                value = value[key]
            }

            let has_self = value !== null && typeof value.__hash_self__ !== 'undefined'

            return {
                value: has_self ? value.__hash_self__ : value, 
                blockNum: result.blockNum
            }
        }catch(e){
            console.log(e)
            return {
                value: null, 
                blockNum: result.blockNum
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