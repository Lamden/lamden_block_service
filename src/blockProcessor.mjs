import * as utils from './utils.mjs'
import util from 'util'
import { createLogger } from './logger.mjs'
import BigNumber from 'bignumber.js';

const logger = createLogger('Block Processor');

export const getBlockProcessor = (services, db) => {
    const processRewards = getRewarsProcessor(services, db)

    const processBlock = async (blockInfo = {}, fix = false) => {
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
                await processRewards(block.blockInfo)
            }
        }

        if (fix) {
            await processBlockStateChanges(blockInfo)
            await processRewards(block.blockInfo)
        }
    };

    const processBlockStateChanges = async (blockInfo) => {
        const { processed, hlc_timestamp, number, rewards } = blockInfo
        if (!processed){
            logger.error("Malformed BLock")
            logger.debug(util.inspect({ blockInfo }, false, null, true))
            return
        }
        const { transaction, state, hash } = processed
        const senderVk = transaction.payload.sender

        let state_changes_obj = {}
        let affectedContractsList = new Set()
        let affectedVariablesList = new Set()
        let affectedRootKeysList = new Set()

        let stateList = [] 
        if (Array.isArray(state)) stateList = [...state]

        for (let i=0;i < rewards.length;i++) {
            let index = stateList.findIndex(t => t.key === rewards[i].key)
            if (index > -1) {
                stateList[index].value = rewards[i].value
            } else {
                stateList.push(rewards[i])
            }
        }

        for (const s of stateList) {
            let keyInfo = utils.deconstructKey(s.key)

            const { contractName, variableName, rootKey, keys, key } = keyInfo

            let keyOk = true

            if (rootKey) {
                if (rootKey.charAt(0) === "$") keyOk = false
            }

            if (keyOk) {

                // check whether there is a reward value
                // if (contractName === "currency" && variableName === "balances") {
                //     let rew = rewards.find(x => x.key === s.key)
                //     if (rew) {
                //         s.value = rew.value
                //     }
                // }

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
        


        try {
            let stateChangesModel = {
                hlc_timestamp,
                blockNum: number,
                affectedContractsList: Array.from(affectedContractsList),
                affectedVariablesList: Array.from(affectedVariablesList),
                affectedRootKeysList: Array.from(affectedRootKeysList),
                affectedRawKeysList: Array.isArray(stateList) ? stateList.map(change => change.key) : [],
                state_changes_obj: utils.stringify(utils.cleanObj(state_changes_obj)),
                txHash: hash,
                txInfo: processed,
                senderVk,
                rewards
            }

            await db.models.StateChanges.updateOne({ blockNum: number }, stateChangesModel, { upsert: true });

            services.sockets.emitTxStateChanges(stateChangesModel)
        } catch (e) {
            logger.error(e)
            logger.debug(util.inspect({ blockInfo }, false, null, true))
        }
    }

    return processBlock
}


export const getRewarsProcessor = (services, db) => {
    const processRewards = async (blockInfo) => {
        const NUM_LENGTH = 30
    
        // check if transaction exists
        if (!blockInfo.processed) return
    
        const foundationKey = "foundation.owner"
        const membersKey = "masternodes.S:members"
        const args = [foundationKey, membersKey]
        // contract name
        let contract = blockInfo.processed.transaction.payload.contract
        args.push(`${contract}.__developer__`)
    
        let developer
    
        const [master_ratio, burn_ratio, foundation_ratio, developer_ratio] = await db.models.CurrentState.findOne({
            rawKey: "rewards.S:value"
        }).then(r => r.value.map(m => utils.parseValue(m)))
        
        let res = await db.models.CurrentState.find({
            rawKey: { $in: args }
        })
    
        const foudnation = res.find(r => r.rawKey === foundationKey).value
        const masternodes = res.find(r => r.rawKey === membersKey).value 
    
        let dev = res.find(r => r.rawKey === `${contract}.__developer__`)
        if (dev) {
            developer = dev.value
        }
    
        try { 
            if (blockInfo.rewards && Array.isArray(blockInfo.rewards)) {
                let totalRewards = new BigNumber(0)
                let stamps = utils.parseValue(blockInfo.processed.stamps_used)
    
    
                const tasks = blockInfo.rewards.map(async r => {
    
                    let amount = utils.parseValue(r.reward)
                    let k = r.key.replace("currency.balances:", "")
                    let isMasternode = masternodes.findIndex(m => m === k) > -1
    
                    // foundation, masternodes, developer, none(developer not exists)
                    totalRewards = totalRewards.plus(amount)
    
                    if (k === foudnation) {
                        await saveRewards(foudnation, "foundation", blockInfo.number, amount.toFixed(NUM_LENGTH))
                    } else if (isMasternode) {
                        // check if it is developer and masternode
                        if (k === developer) {
                            // first calc developer rewards
                            let developerReward = developer_ratio.plus(stamps) 
                            // then get maternode rewards
                            let masternodeReward = amount.minus(developerReward)
                            await saveRewards(k, "developer", blockInfo.number, developerReward.toFixed(NUM_LENGTH), contract)
                            await saveRewards(k, "masternodes", blockInfo.number, masternodeReward.toFixed(NUM_LENGTH))
                        } else {
                            await saveRewards(k, "masternodes", blockInfo.number, amount.toFixed(NUM_LENGTH))
                        }
                    } else if (k === developer) {
                        await saveRewards(k, "developer", blockInfo.number, amount.toFixed(NUM_LENGTH), contract)
                    }
                })
                
                await Promise.all(tasks)
                // recipient is burnt_rewards
                await saveRewards("burnt_rewards", "burn", blockInfo.number, stamps.minus(totalRewards).toFixed(NUM_LENGTH))
                // emit total rewards
                let total = await db.queries.getTotalRewards()
                services.sockets.emitTotalRewards(total.amount)
            }
        } catch(e) {
            logger.error(e)
        }
    }
    
    /**
    * @param {string} recipient 
    * @param {string} type 
    * @param {Bignumber} amount 
    * @param {string} contract 
    **/
    
    const saveRewards = async (recipient, type, blocknumber, amount, contract) => {
        
        // check type
        const types = ["masternodes", "developer", "foundation", "burn"]
        if (types.findIndex(t => t === type) === -1) return
    
        let reward = {
            type,
            recipient,
            blockNum: blocknumber,
            amount: amount
        }
    
        // if type is developer, contract can not be populated
        if (type === "developer") {
            if (!contract) return
            reward.contract = contract
        }

        await db.models.Rewards.updateOne({
            type,
            recipient,
            blockNum: blocknumber
        }, {...reward}, { upsert: true })
    
        services.sockets.emitNewReward(reward)
    }

    return processRewards
}
