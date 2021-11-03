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

    async function getTokens() {
        return await db.models.Contracts.find({lst001: true},{ '_id': 0, '__v': 0 })
    }

    async function getToken(contractName) {
        let token = await getContract(contractName)
        delete token[contractName].__code__
        delete token[contractName].__compiled__

        return token[contractName]
    }

    return {
        getContracts,
        getContract,
        getTokens,
        getToken
    }
}