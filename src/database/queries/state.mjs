export const getStateQueries = (db) => {

    async function countCurrentState() {
        return await db.models.CurrentState.countDocuments()
    }

    async function getKeyFromCurrentState(contractName, variableName, key) {
        let result = await db.models.CurrentState.findOne({ rawKey: db.utils.makeKey(contractName, variableName, key) }, { '_id': 0, 'keys': 0, '__v': 0 })

        if (!result){
            result = {
                notFound: true,
                value: null,
                prev_value: null
            }
        }else{
            result = {...result._doc}
        }
        return {
            ...result,
            contractName,
            variableName,
            key
        }
    }

    async function getAllCurrentState(contractName, variableName = undefined, rootKey = undefined) {
        return await db.models.CurrentState.find({ rawKey: { $regex: "^" + db.utils.makeKey(contractName, variableName, rootKey) } }, { '_id': 0, 'keys': 0, '__v': 0 })
    }

    async function getAllByLastUpdated(lastUpdated, limit = 10){
        let stateChanges = await db.models.CurrentState.find({
            lastUpdated: {$gt: lastUpdated }
        })
        .sort({ lastUpdated: 1 })
        .limit(limit)

        if (!stateChanges) return []
        else return stateChanges
    }

    async function findStateChangeById(_id){
        return await db.models.CurrentState.findOne({_id})
    }

    return {
        getKeyFromCurrentState,
        getAllCurrentState,
        getAllByLastUpdated,
        findStateChangeById,
        countCurrentState
    }
}