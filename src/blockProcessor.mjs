import * as utils from './utils.mjs'
import util from 'util'
import { createLogger } from './logger.mjs'

const logger = createLogger('Block Processor');

export const getBlockProcessor = (services, db) => {
    const processBlock = async (blockInfo = {}) => {
        let blockNum = blockInfo.number;
        let block = await db.models.Blocks.findOne({ blockNum })
        if (!block) {
            if (!blockInfo.error) {
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
        const { processed, hlc_timestamp, number } = blockInfo
        const { transaction, state, hash } = processed
        const senderVk = transaction.payload.sender

        let state_changes_obj = {}
        let affectedContractsList = new Set()
        let affectedVariablesList = new Set()
        let affectedRootKeysList = new Set()

        if (Array.isArray(state)) {
            for (const s of state) {
                let keyInfo = utils.deconstructKey(s.key)

                const { contractName, variableName, rootKey, keys, key } = keyInfo

                let keyOk = true

                if (rootKey) {
                    if (rootKey.charAt(0) === "$") keyOk = false
                }

                if (keyOk) {

                    let currentState = await db.models.CurrentState.findOne({ rawKey: s.key })
                    if (currentState) {
                        if (currentState.blockNum < number) {
                            currentState.txHash = hash
                            currentState.prev_value = currentState.value
                            currentState.prev_blockNum = currentState.blockNum
                            currentState.value = s.value
                            currentState.hlc_timestamp = hlc_timestamp
                            currentState.senderVk = senderVk
                            currentState.blockNum = number
                            await currentState.save()
                        }
                    } else {
                        try {
                            const new_current_state_document = {
                                rawKey: s.key,
                                txHash: hash,
                                hlc_timestamp,
                                blockNum: '0',
                                prev_value: null,
                                prev_blockNum: null,
                                value: s.value,
                                senderVk,
                                contractName,
                                variableName,
                                keys,
                                key,
                                rootKey
                            }
                            await new db.models.CurrentState(new_current_state_document).save()
                        } catch (e) {
                            logger.error(err)
                            logger.debug(util.inspect({ blockInfo, txInfo: processed }, false, null, true))
                        }
                    }

                    let newStateChangeObj = utils.keysToObj(keyInfo, s.value)

                    state_changes_obj = utils.mergeObjects([state_changes_obj, newStateChangeObj])

                    affectedContractsList.add(contractName)
                    affectedVariablesList.add(`${contractName}.${variableName}`)
                    if (rootKey) affectedRootKeysList.add(`${contractName}.${variableName}:${rootKey}`)
                    services.sockets.emitStateChange(keyInfo, s.value, newStateChangeObj, processed)

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
                hlc_timestamp,
                blockNum: number,
                affectedContractsList: Array.from(affectedContractsList),
                affectedVariablesList: Array.from(affectedVariablesList),
                affectedRootKeysList: Array.from(affectedRootKeysList),
                affectedRawKeysList: Array.isArray(state) ? state.map(change => change.key) : [],
                state_changes_obj: utils.stringify(utils.cleanObj(state_changes_obj)),
                txHash: hash,
                txInfo: processed,
                senderVk
            }

            await db.models.StateChanges.updateOne({ blockNum }, stateChangesModel, { upsert: true });

            services.sockets.emitTxStateChanges(stateChangesModel)
        } catch (e) {
            logger.error(e)
            logger.debug(util.inspect({ blockInfo }, false, null, true))
        }
    }

    return processBlock
}