export const getQueries = (db) => {
    async function getLatestBlock() {
        let res = await db.models.App.findOne({ key: "latest_block" })
        if (!res) return 0
        else return res.value
    }

    async function getLatestSyncedBlock() {
        let block = await db.models.Blocks.findOne({}).sort({ blockNum: -1 })
        if (!block) return 0
        else return block.blockNum
    }

    async function getLastestProcessedBlock() {
        let stateChange = await db.models.StateChanges.findOne({}).sort({ blockNum: -1 })
        if (!stateChange) return 0
        else return stateChange.blockNum
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
        getLatestBlock,
        getLatestSyncedBlock,
        getLastestProcessedBlock,
        getContractHistory,
        getVariableHistory,
        getRootKeyHistory
    }
}