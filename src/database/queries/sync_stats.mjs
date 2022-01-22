export const getSyncStatsQueries = (db) => {
    async function getLatestBlock() {
        let res = await db.models.App.findOne({ key: "latest_block" })
        if (!res) return 0
        else return res.value
    }

    async function setLatestBlock(blockNum) {
        let latest_block = await getLatestBlock()

        console.log({latest_block, blockNum})
        console.log(`Should update? ${blockNum > latest_block}`)

        if (latest_block >= blockNum) return

        await db.models.App.updateOne({ key: "latest_block" }, {
            key: "latest_block",
            value: blockNum
        }, { upsert: true })
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

    async function getLastRepaired() {
        let res = await db.models.App.findOne({ key: "last_repaired" })
        if (!res) return 0
        else return res.value
    }

    async function setLastRepaired(blockNum) {
        await db.models.App.updateOne({ key: "last_repaired" }, {
            key: "last_repaired",
            value: blockNum
        }, { upsert: true })
    }

    return {
        getLatestBlock,
        setLatestBlock,
        getLatestSyncedBlock,
        getLastestProcessedBlock,
        getLastRepaired,
        setLastRepaired
    }
}