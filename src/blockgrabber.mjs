import axios from 'axios'

import * as utils from './utils.mjs'
import util from 'util'

const runBlockGrabber = (config) => {
    const { 
        MASTERNODE_URL, 
        db, 
        server, 
        blockchainEvents,
        blockProcessingQueue
     } = config

    const route_getBlockNum = "/blocks?num=";

    const processBlock = async(blockInfo = {}) => {
        let blockNum = blockInfo.number || blockInfo.id;
        let block = await db.models.Blocks.findOne({ blockNum })
        if (!block) {
            if (blockInfo.error || malformedBlock(blockInfo)) {
                block = new db.models.Blocks({
                    blockInfo: {
                        hash: 'block-does-not-exist',
                        number: blockNum,
                        subblocks: []
                    },
                    blockNum
                })
                block.error = true
            } else {
                block = new db.models.Blocks({
                    blockInfo,
                    blockNum,
                    hash: blockInfo.hash
                })
            }
            await block.save()
        }

        if (!block.error) {
            let repairing = false
            let has_processed = await db.models.CurrentState.countDocuments({ blockNum })

            if (has_processed > 0) repairing = true

            if (!repairing) server.services.sockets.emitNewBlock(block.blockInfo)
            await processBlockStateChanges(block.blockInfo, repairing)
            
        }
    };

    const malformedBlock = (blockInfo) => {
        const validateValue = (value, name) => {
            if (isNaN(parseInt(value))) throw new Error(`'${name}' has malformed value ${JSON.stringify(value)}`)
        }

        const { number, subblocks } = blockInfo
        try{
            validateValue(number, 'number')
            if (Array.isArray(subblocks)) {
                for (let sb of subblocks){
                    const { transactions, subblock } = sb
                    
                    validateValue(subblock, 'subblock')
                    if (Array.isArray(transactions)) {
                        for (let tx of transactions){
                            const { stamps_used,  status, transaction } = tx
                            const { metadata,  payload } = transaction
                            const { timestamp } = metadata
                            const { nonce, stamps_supplied } = payload
                            validateValue(stamps_used, 'stamps_used')
                            validateValue(status, 'status')
                            validateValue(timestamp, 'timestamp')
                            validateValue(nonce, 'nonce')
                            validateValue(stamps_supplied, 'stamps_supplied')
                        }
                    }
                }
            }
        }catch(e){
            console.log({"Malformed Block":e})
            return true
        }
        return false
    }

    const processBlockStateChanges = async(blockInfo, repairing = false) => {

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

                if (Array.isArray(state)){
                    for (const s of state) {
                        let keyInfo = utils.deconstructKey(s.key)
    
                        const { contractName, variableName, rootKey } = keyInfo

                        let keyOk = true

                        if (rootKey){
                            if (rootKey.charAt(0) === "$") keyOk = false
                        }

                        if (keyOk){
                            
                            let currentState = await db.models.CurrentState.findOne({ rawKey: s.key })
                            // console.log(currentState)
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
                                await new db.models.CurrentState({
                                    rawKey: s.key,
                                    txHash: txInfo.hash,
                                    tx_uid,
                                    prev_value: null,
                                    prev_tx_uid: null,
                                    value: s.value,
                                    lastUpdated: timestamp
                                }).save((err) => {
                                    if (err){
                                        console.log(err)
                                        console.log(util.inspect({blockInfo, txInfo}, false, null, true))
                                        recheck(err, 30000)
                                    }
                                })
                            }
        
                            let newStateChangeObj = utils.keysToObj(keyInfo, s.value)
        
                            state_changes_obj = utils.mergeObjects([state_changes_obj, newStateChangeObj])
        
                            affectedContractsList.add(contractName)
                            affectedVariablesList.add(`${contractName}.${variableName}`)
                            if (rootKey) affectedRootKeysList.add(`${contractName}.${variableName}:${rootKey}`)
        
                            if (!repairing) server.services.sockets.emitStateChange(keyInfo, s.value, newStateChangeObj, txInfo)

                            let foundContractName = await db.models.Contracts.findOne({contractName})
                            if (!foundContractName) {
                                let code = await db.queries.getKeyFromCurrentState(contractName, "__code__")
                                let lst001 = db.utils.isLst001(code.value)
                                await new db.models.Contracts({
                                    contractName,
                                    lst001
                                }).save((err) => {
                                    console.log(err)                                    
                                })
                                server.services.sockets.emitNewContract({contractName, lst001})
                            }
                        }
                    }
                }

                try{
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

                    if (!repairing) server.services.sockets.emitTxStateChanges(stateChangesModel)
                }catch(e){
                    console.log(e)
                    console.log(util.inspect({blockInfo}, false, null, true))
                    recheck(e, 30000)
                }
            }
        }
    }

    const getBlock_MN = (blockNum, timedelay = 0) => {
        return new Promise(resolver => {
            setTimeout(async() => {
                await axios(`${MASTERNODE_URL}${route_getBlockNum}${blockNum}`)
                    .then(res => {
                        let block_res = res.data
                        block_res.id = blockNum
                        resolver(block_res);
                    })
                    .catch(err => {
                        console.error(new Date())
                        console.error(err)
                        resolver({
                            error: "Error: Error contacting maternode.",
                            id: blockNum
                        })
                    })
            }, timedelay)
        })
    };

    const syncBlocks = async (start_block, end_block) => {
        if (!start_block) return

        let latest_synced_block = await db.queries.getLatestSyncedBlock()

        if (!latest_synced_block) return

        console.log(`Syncing Blocks Database starting at block ${start_block} to block ${end_block}`)

        for (let i = start_block; i < end_block; i++) {
            let repairedFrom = ""

            const checkDBBlock = async () => {
                let blockRes = await db.models.Blocks.findOne({ blockNum: i })

                if (blockRes){
                    let didNotExist = false

                    try{
                        if (blockRes.blockInfo.hash === "block-does-not-exist") didNotExist = true
                    }catch(e){}

                    if (malformedBlock(blockRes.blockInfo) || didNotExist) {
                        console.log(`Block ${i}: WAS MALFORMED FROM DATABASE OR DID NOT EXIST`)
                        await db.models.Blocks.deleteOne({ blockNum: i })
                    }else{
                        await processBlock(blockRes.blockInfo)
                        .then(() => {
                            repairedFrom = "Database"
                        })
                        .catch(err => {
                            console.log(err)
                            console.log(`Block ${i}: ERROR PROCESSING from ${repairedFrom}`)
                        })
                    }
                }
            }

            await checkDBBlock()

            if (repairedFrom === ""){
                await new Promise(async (resolver) => {
                    const checkMasterNode = async () => {
                        let blockData = await getBlock_MN(i, 250)
                        blockData.id = i
                        console.log(util.inspect(blockData, false, null, true))

                        await processBlock(blockData)
                        .then(() => {
                            repairedFrom = "Masternode"
                            resolver(true)
                        })
                        .catch(err => {
                            console.log(err)
                            console.log(`Block ${i}: ERROR PROCESSING from ${repairedFrom}`)
                            setTimeout(checkMasterNode, 30000)
                        })
                    }
                    checkMasterNode()
                })
            }
            console.log(`Block ${i}: synced and processed from ${repairedFrom}`)

            await db.queries.setLastRepaired(i)
        }
    }


    async function processLatestBlockFromWebsocket(data) {
        await db.queries.setLatestBlock(data.number)
        let block = await db.models.Blocks.findOne({ blockNum: data.number })

        if (!block){
            blockProcessingQueue.addBlock(data)
        }

        let lastRepairedBlock = 0
        lastRepairedBlock = await db.queries.getLastRepaired()
        if (!lastRepairedBlock){
            lastRepairedBlock = await db.queries.getLastestProcessedBlock()
        }
        await syncBlocks(lastRepairedBlock + 1, data.number)
    };

    async function processBlockFromWebsocket(blockData){
        blockProcessingQueue.addBlock(blockData)
    }

    async function checkForMissingBlocks(){
        let lastRepairedBlock = await db.queries.getLastRepaired() - 1000
        if (lastRepairedBlock < 0 ) lastRepairedBlock = 0

        console.log(`-> Repairing missing blocks from block ${lastRepairedBlock}.`)

        let batch = await db.models.Blocks.find({"blockInfo.hash": "block-does-not-exist", "blockNum":{ $gte: lastRepairedBlock}})

        console.log(`-> ${batch.length} missing blocks found.`)

        for (let block of batch){
            const { blockNum, blockInfo } = block

            let blockToGet = blockNum || blockInfo.number

            try{
                if (isNaN(parseInt(blockToGet))) throw new Error(`Block has no number.`)
                await syncBlocks(blockToGet, blockToGet)
            }catch(e){
                console.error({ blockNum, blockInfo })
                console.error({ block })
                console.error(e)
            }
        }

        // recheck in 5 minutes
        setTimeout(checkForMissingBlocks, 300000)
    }

    async function start() {
        blockProcessingQueue.setupBlockProcessor(processBlock)
        blockProcessingQueue.start()

        blockchainEvents.setupEventProcessor('new_block', processBlockFromWebsocket)
        blockchainEvents.setupEventProcessor('latest_block', processLatestBlockFromWebsocket)
        blockchainEvents.start()

        // Every 5 minutes
        checkForMissingBlocks()
    }

    return {
        start
    }
};

export {
    runBlockGrabber
}