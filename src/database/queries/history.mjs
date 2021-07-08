export const getHistoryQueries = (db) => {
    async function getContractHistory(contractName, last_tx_uid = "000000000000.00000.00000", limit = 10) {
        limit = parseInt(limit) || 10

        let stateChanges = await db.models.StateChanges.find({
                "affectedContractsList": contractName,
                tx_uid: { $gt: last_tx_uid }
            })
            .sort({ "tx_uid": 1 })
            .limit(limit)

        if (!stateChanges) return []
        else return stateChanges
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
        else return stateChanges
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
        else return stateChanges
    }
    return {
        getContractHistory,
        getVariableHistory,
        getRootKeyHistory
    }
}