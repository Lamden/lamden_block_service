export const getSyncStatsQueries = (db) => {
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
    return {
        getLatestBlock,
        getLatestSyncedBlock,
        getLastestProcessedBlock
    }
}