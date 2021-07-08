export const getStateQueries = (db) => {

    async function getKeyFromCurrentState(contractName, variableName, key) {
        let result = await db.models.CurrentState.findOne({ rawKey: db.utils.makeKey(contractName, variableName, key) }, { '_id': 0, 'keys': 0, '__v': 0 })
        return {
            ...result._doc,
            contractName,
            variableName,
            key
        }
    }

    return {
        getKeyFromCurrentState
    }
}