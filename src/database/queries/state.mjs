export const getStateQueries = (db) => {

    async function getKeyFromCurrentState(contractName, variableName, key) {
        let result = await db.models.CurrentState.findOne({ rawKey: db.utils.makeKey(contractName, variableName, key) }, { '_id': 0, 'keys': 0, '__v': 0 })
        if (!result){
            result = {
                notFound: true,
                value: null
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

    return {
        getKeyFromCurrentState,
        getAllCurrentState
    }
}