import * as utils from '../../utils.mjs'

export const getInfoQueries = (db) => {

    async function getContracts() {
        return await db.models.Contracts.find({},{ '_id': 0, '__v': 0 })
    }

    async function getContract(contractName) {
        let stateResults = await db.models.CurrentState.find({ rawKey: { $regex: "^" + db.utils.makeKey(contractName) } })
        let allStateObjects = stateResults.map(result => utils.keysToObj(utils.deconstructKey(result.rawKey), result.value))
        let merged = utils.mergeObjects(allStateObjects)

        return utils.cleanObj(merged)
    }

    return {
        getContracts,
        getContract
    }
}