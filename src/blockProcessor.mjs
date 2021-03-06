import * as utils from './utils.mjs'
import util from 'util'
import { createLogger } from './logger.mjs'

const logger = createLogger('Block Processor');

export const getBlockProcessor = (services, db) => {
    const processBlock = async (blockInfo = {}) => {
        let blockNum = blockInfo.number || blockInfo.id;
        let block = await db.models.Blocks.findOne({ blockNum })
        if (!block) {
            if (!blockInfo.error && !utils.isMalformedBlock(blockInfo)) {
                block = new db.models.Blocks({
                    blockInfo,
                    blockNum,
                    hash: blockInfo.hash
                })
                await block.save()
                services.sockets.emitNewBlock(block.blockInfo)
                await processBlockStateChanges(block.blockInfo)
            }
        }
    };

    const processBlockStateChanges = async (blockInfo) => {

        blockInfo.subblocks.sort((a, b) => a.subblock > b.subblock ? 1 : -1)

        for (const subblock of blockInfo.subblocks) {
            let subBlockNum = subblock.subblock
            subblock.transactions.sort((a, b) => a.transaction.metadata.timestamp > b.transaction.metadata.timestamp ? 1 : -1)

            for (const [tx_index, txInfo] of subblock.transactions.entries()) {
                const { state } = txInfo

                let timestamp = txInfo.transaction.metadata.timestamp * 1000
                let state_changes_obj = {}
                let affectedContractsList = new Set()
                let affectedVariablesList = new Set()
                let affectedRootKeysList = new Set()
                let tx_uid = utils.make_tx_uid(blockInfo.number, subBlockNum, tx_index)

                if (Array.isArray(state)) {
                    for (const s of state) {
                        let keyInfo = utils.deconstructKey(s.key)

                        const { contractName, variableName, rootKey } = keyInfo

                        let keyOk = true

                        if (rootKey) {
                            if (rootKey.charAt(0) === "$") keyOk = false
                        }

                        if (keyOk) {

                            let currentState = await db.models.CurrentState.findOne({ rawKey: s.key })
                            if (currentState) {
                                if (currentState.lastUpdated < timestamp) {
                                    currentState.txHash = txInfo.hash
                                    currentState.prev_value = currentState.value
                                    currentState.prev_tx_uid = currentState.tx_uid
                                    currentState.value = s.value
                                    currentState.lastUpdated = timestamp
                                    currentState.tx_uid = tx_uid
                                    await currentState.save()
                                }
                            } else {
                                try {
                                    await new db.models.CurrentState({
                                        rawKey: s.key,
                                        txHash: txInfo.hash,
                                        tx_uid,
                                        prev_value: null,
                                        prev_tx_uid: null,
                                        value: s.value,
                                        lastUpdated: timestamp
                                    }).save()
                                } catch (e) {
                                    logger.error(err)
                                    logger.debug(util.inspect({ blockInfo, txInfo }, false, null, true))
                                }
                            }

                            let newStateChangeObj = utils.keysToObj(keyInfo, s.value)

                            state_changes_obj = utils.mergeObjects([state_changes_obj, newStateChangeObj])

                            affectedContractsList.add(contractName)
                            affectedVariablesList.add(`${contractName}.${variableName}`)
                            if (rootKey) affectedRootKeysList.add(`${contractName}.${variableName}:${rootKey}`)
                            services.sockets.emitStateChange(keyInfo, s.value, newStateChangeObj, txInfo)

                            let foundContractName = await db.models.Contracts.findOne({ contractName })
                            if (!foundContractName) {
                                let code = await db.queries.getKeyFromCurrentState(contractName, "__code__")
                                let lst001 = db.utils.isLst001(code.value)
                                try {
                                    await new db.models.Contracts({
                                        contractName,
                                        lst001
                                    }).save()
                                } catch (e) {
                                    logger.error(e)
                                }
                                services.sockets.emitNewContract({ contractName, lst001 })
                            }
                        }
                    }
                }

                try {
                    let stateChangesModel = {
                        tx_uid,
                        blockNum: blockInfo.number,
                        subBlockNum,
                        txIndex: tx_index,
                        timestamp,
                        affectedContractsList: Array.from(affectedContractsList),
                        affectedVariablesList: Array.from(affectedVariablesList),
                        affectedRootKeysList: Array.from(affectedRootKeysList),
                        affectedRawKeysList: Array.isArray(state) ? txInfo.state.map(change => change.key) : [],
                        state_changes_obj: utils.stringify(utils.cleanObj(state_changes_obj)),
                        txHash: txInfo.hash,
                        txInfo
                    }
                    await db.models.StateChanges.updateOne({ tx_uid }, stateChangesModel, { upsert: true });

                    services.sockets.emitTxStateChanges(stateChangesModel)
                } catch (e) {
                    logger.error(e)
                    logger.debug(util.inspect({ blockInfo }, false, null, true))
                }
            }
        }
    }

    return processBlock
}