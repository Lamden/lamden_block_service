import * as utils from './utils.mjs'
import util from 'util'
import { createLogger, createInteractiveLogger } from './logger.mjs'

const logger = createLogger('Genesis Block Processor');

const GENESIS_BLOCK_TX_HASH = String('').padStart(64, '0')

export const getGenesisBlockProcessor = (db) => {
    const processBlock = async (blockInfo = {}) => {
        // Return if a genesis block has already been processed
        if (await db.queries.hasGenesisBlock()){
            logger.error("Blockservice already has a Genesis Block (Block 0).")
            return
        }

        const { genesis: genesis_state } = blockInfo

        delete blockInfo.genesis

        const block = new db.models.Blocks({
            blockInfo,
            blockNum: blockInfo.number,
            hash: blockInfo.hash
        })
        
        try{
            await processBlockStateChanges(blockInfo, genesis_state)
        }catch(e){
            logger.error(`Error setting current state from genesis block. ${e}`)
            await db.models.CurrentState.deleteMany({txHash: GENESIS_BLOCK_TX_HASH})
        }

        await block.save()
    };

    const processBlockStateChanges = async (blockInfo, state) => {
        const { origin } = blockInfo

        if (Array.isArray(state)) {
            logger.log(`Loading ${state.length} initial state values`)
            
            const progress = createInteractiveLogger("Loading Initial State...")
            for (const [i, s] of state.entries()) {
                progress.await(`${i + 1} / ${state.length}: Saving ${s.key}`)
                let keyInfo = utils.deconstructKey(s.key)

                const { contractName, variableName, rootKey, keys, key } = keyInfo
                
                let keyOk = true

                if (rootKey) {
                    if (rootKey.charAt(0) === "$") keyOk = false
                }

                if (keyOk) {
                    try {
                        const new_current_state_document = {
                            rawKey: s.key,
                            txHash: GENESIS_BLOCK_TX_HASH,
                            hlc_timestamp,
                            blockNum: '0',
                            prev_value: null,
                            prev_blockNum: null,
                            value: s.value,
                            senderVk: origin.sender,
                            contractName,
                            variableName,
                            keys,
                            key,
                            rootKey
                        }

                        await new db.models.CurrentState(new_current_state_document).save()
                    } catch (err) {
                        logger.error(err)
                        logger.debug(util.inspect({ blockInfo, txInfo }, false, null, true))
                    }

                    if (variableName === "__code__"){
                        let foundContractName = await db.models.Contracts.findOne({ contractName })
                        if (!foundContractName) {
                            let lst001 = db.utils.isLst001(s.value)
                            try {
                                const new_contract_document = {
                                    contractName,
                                    lst001
                                }
                                await new db.models.Contracts(new_contract_document).save()
                            } catch (e) {
                                logger.error(e)
                            }
                        }
                    }
                }
            }

            progress.success(`${state.length} / ${state.length}: Done saving initial state values!`)
        }
    }

    return processBlock
}