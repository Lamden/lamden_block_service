import axios from 'axios'

import * as utils from './utils.mjs'
import util from 'util'
import { createLogger } from './logger.mjs'

const logger = createLogger('Blocks');

const runBlockGrabber = (config) => {
    const {
        MASTERNODE_URL,
        db,
        server,
        blockchainEvents,
        blockProcessingQueue
    } = config

    const route_getBlockNum = "/blocks?num=";

    const processBlock = async (blockInfo = {}) => {
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
        try {
            validateValue(number, 'number')
            if (Array.isArray(subblocks)) {
                for (let sb of subblocks) {
                    const { transactions, subblock } = sb

                    validateValue(subblock, 'subblock')
                    if (Array.isArray(transactions)) {
                        for (let tx of transactions) {
                            const { stamps_used, status, transaction } = tx
                            const { metadata, payload } = transaction
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
        } catch (e) {
            logger.error({ "Malformed Block": e })
            return true
        }
        return false
    }

    const processBlockStateChanges = async (blockInfo, repairing = false) => {

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
                                await new db.models.CurrentState({
                                    rawKey: s.key,
                                    txHash: txInfo.hash,
                                    tx_uid,
                                    prev_value: null,
                                    prev_tx_uid: null,
                                    value: s.value,
                                    lastUpdated: timestamp
                                }).save((err) => {
                                    if (err) {
                                        logger.error(err)
                                        logger.debug(util.inspect({ blockInfo, txInfo }, false, null, true))
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

                            let foundContractName = await db.models.Contracts.findOne({ contractName })
                            if (!foundContractName) {
                                let code = await db.queries.getKeyFromCurrentState(contractName, "__code__")
                                let lst001 = db.utils.isLst001(code.value)
                                await new db.models.Contracts({
                                    contractName,
                                    lst001
                                }).save((err) => {
                                    logger.error(err)
                                })
                                server.services.sockets.emitNewContract({ contractName, lst001 })
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

                    if (!repairing) server.services.sockets.emitTxStateChanges(stateChangesModel)
                } catch (e) {
                    logger.error(e)
                    logger.debug(util.inspect({ blockInfo }, false, null, true))
                    recheck(e, 30000)
                }
            }
        }
    }

    const getBlock_MN = (blockNum, timedelay = 0) => {
        return new Promise(resolver => {
            setTimeout(async () => {
                await axios(`${MASTERNODE_URL}${route_getBlockNum}${blockNum}`)
                    .then(res => {
                        let block_res = res.data
                        block_res.id = blockNum
                        resolver(block_res);
                    })
                    .catch(err => {
                        logger.error(err)
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

        logger.log(`Syncing Blocks Database starting at block ${start_block} to block ${end_block}`)
        
        // Iterate blocks from start the end from provided block values
        for (let i = start_block; i < end_block; i++) {
            let repairedFrom = ""
            
            const checkDBBlock = async () => {
                // See if we have an entry for this block in teh database
                let blockRes = await db.models.Blocks.findOne({ blockNum: i })
                
                // If blockRes does not exist that mean we need to get this data from the masternode so this routine will skip
                if (blockRes) {
                    let didNotExist = false

                    try {
                        // Set didNotExist to true if we had previously determined this was a malformedBlock which we know because we had stored this block with blockInfo.hash = "block-does-not-exist"
                        if (blockRes.blockInfo.hash === "block-does-not-exist") didNotExist = true
                    } catch (e) { }
                    
                    // Check to see if the block data we have in our database is malformed (or of we had set didNotExist to true previously)
                    // If so, then delete the data which will cause us to get it again from the masternode later
                    if (malformedBlock(blockRes.blockInfo) || didNotExist) {
                        logger.log(`Block ${i}: WAS MALFORMED FROM DATABASE OR DID NOT EXIST`)
                        await db.models.Blocks.deleteOne({ blockNum: i })
                    } else {
                        // If the data was okay then process it again. 
                        // The "processBlock" routine is setup to not reprocess a block that has already been processed.
                        await processBlock(blockRes.blockInfo)
                            .then(() => {
                                repairedFrom = "Database"
                            })
                            .catch(err => {
                                logger.error(err)
                                logger.error(`Block ${i}: ERROR PROCESSING from ${repairedFrom}`)
                            })
                    }
                }
            }

            // Check if we have the block info stored in the mongo DB
            // This prevents calls to teh masternode to get data we already have.
            await checkDBBlock()
            
            // If this block was succeessfully repaired fromt he DB then we will not need to get the data from the masternode.
            if (repairedFrom === "") {
                await new Promise(async (resolver) => {
                    const checkMasterNode = async () => {
                        let blockData = await getBlock_MN(i, 250)
                        blockData.id = i
                        logger.debug(util.inspect(blockData, false, null, true))
                        
                        // Process the blockdata
                        // This this data is still malformed we will end up with a block entry of blockInfo.hash = "block-does-not-exist" again.
                        await processBlock(blockData)
                            .then(() => {
                                repairedFrom = "Masternode"
                                resolver(true)
                            })
                            .catch(err => {
                                logger.error(err)
                                logger.error(`Block ${i}: ERROR PROCESSING from ${repairedFrom}`)
                                setTimeout(checkMasterNode, 30000)
                            })
                    }

                    // Make a masternode call to get the block info
                    checkMasterNode()
                })
            }
            logger.log(`Block ${i}: synced and processed from ${repairedFrom}`)

            // Set this block height as our last repaired height
            await db.queries.setLastRepaired(i)
        }
    }


    async function processLatestBlockFromWebsocket(data) {
        await db.queries.setLatestBlock(data.number)
        let block = await db.models.Blocks.findOne({ blockNum: data.number })

        if (!block) {
            blockProcessingQueue.addBlock(data)
        }

        let lastRepairedBlock = 0
        lastRepairedBlock = await db.queries.getLastRepaired()
        if (!lastRepairedBlock) {
            lastRepairedBlock = await db.queries.getLastestProcessedBlock()
        }
        await syncBlocks(lastRepairedBlock + 1, data.number)
    };

    async function processBlockFromWebsocket(blockData) {
        blockProcessingQueue.addBlock(blockData)
    }

    async function checkForMissingBlocks() {
        /*
            Its possible that when asking the masternode for a block we didn't get the information, or we got an error.  
            In these casese the blockservice will not store any block at all.  Meaning the db could go from block 100 to block 102, skipping block 101 as we didn't get any useful block info to process.
            The 'blocks enpoint' will return { error: `block number 101 does not exist.` } if someone tried to get the info fro block 101 because blocks.find({'blockNum': 101 }) returns null
            The thing is that block 101 might actually exist.  We need a mechinism to automatically check again for this block information.

            All of these situations can prevent is from getting a block:
             1) We fail to get the information from the masternode for a block. These situations arise when the masternode webserver is messing up or under heavy load. 
                These situations are out of our control but we need to handle them and ensure that we followup with these block numbers later to make sure we get the data.
                Some situations that could happen:
                    o we got incorrectly told from the masternode that the block doesn't exists (but might actually)
                      - return of {'error': 'blocks does not exist'} from the masternodes blocks endpoint
                    o the request timed out and we didn't get anyting from the blocks call because the masternode was down or under heavey load
                A follow up to get this block information in X Seconds or X Minutes should get the proper info.
                 o See issue https://github.com/Lamden/lamden/issues/479
             2) Due to some masternode error we get some malformed data from the maternode, where the block data isn't formatted correctly and the blockservice will fail to parse it.
                o This is what the malformedBlock routine attemts to check. If it returns TRUE that the block is malformed it will instead store "blockInfo.hash" = "block-does-not-exist".
                  This allows us to query for these malformed blocks later to repair them once the masternode is fixed.  We have had issues with the masternode webserver returning the block data
                  incorrectly in the past, so that's what this process aims to detect and handle.
             3) We fail to get the block informtaion and the block will NEVER exist on the masternode
               o There are currently missing blocks from the blockchain, due to masternode failures in the past, but we can't assume this won't happen again.

            The logic for how we deal with situation #2 is below and currently all this routine deals with.

            TODO: 
                1) We need logic to deal with situation #1, where we got nothing back from the masternode on a call for block information and as such we didn't store anything in the database. 
                   Not storing anything in the database prevents us from easily repairing later, because we can't query anything to know that we missed a block.
                   o For example, if we are on block 150 how do we know that we skipped block 101 and we should go back and repair it?
                2) The logic we have to deal with #3 is the "repair height" variable.  At some point we will just stop checking the block range for blocks that will never have info. And that's find if they never do.

                Some more info:
                - A block that is being processed off the websocket will always be a block that exists. This means that data will never show up with an error of {'error': 'blocks does not exist'}
                  and since the block is pushed to us we don't need to worry about the masternode not being available (if its not availble the websocket is probably disconnected).
                - The the block data off the websocket COULD be malformed. It's possible the node, due to an upgrade, could provide us data we do not know how to parse. So we should not expect the 
                  websocket to provide perfect data.
                - We may have an issue where the websockets are not providing us all the blocks. This could be why we are missing blocks and like for example why would would have 100 and 102 but for
                  some reason not have 101.  But when we get 102 how do we know we never got 101? This could be the key and maybe where you want to start fixin this logic.
                  - It might be as easy as once we get a blocknumber from a websocker we start checking backwards by 1, getting any missing blocks.
                    o For Example, we get block 102 sent to us off the websocket. So we check to see if we have 101. We don't have it, so we add it to a list and keep checking for block 100,
                    which we have, so we stop checking and call sycnBlock on 101 (which will attempt to get it from the masternode). 
                    o This logic might work except if start a brand new blockservice and we don't have any of the 800,000 blocks in the database then we will start getting blocks backwards as soon as
                    as soon as the next block shows up on the websocket.  Which isn't good. So it's like we only want to this process if we have a "syncd" blockservice.
                    o The blockservice is setup to process blocks out of order, so you can process block 102 as you get it, and then do the checking afterwards which would find we don't have 101 and process it.
                 - Another course of action might be to do a record count of the blocks database and compare it to the latest block.  if you get a miss match then you know you missed a block somewhere.
                   o For Example, you know your latest block is 150, when you do cound on the blocks db records you come up with a cound of 149. This would tell you you're missing a block somewhere.
                   o To find the missing block you could could backwards from 150, doing a find in the db for that blockNumber.  If you get a null return then you can call syncBlock on that block number.
                   o This logic also has the same pitfall as above as we don't want to do this on a new blockservice install
                
                So this is some information.  Maybe take a look at the code and tell me how you think we she handle this.         
        */


        /*
            This routine will attempt to repair blocks that are in situation #2 in the above list.  That is, blocks that may have come in malformed and we created a db entry for that blockNumber with
            "blockInfo.hash" = "block-does-not-exist" so that we can easily look it up later.

            This is the general logic of this routine:
                1) If some blocks are bad, at a certain point they will be bad forever and we shouldn't keep checking for them.  So we set an arbatrary value of 1000 blocks. 
                   So basically we get the current repair hight and minus 1000 blocks.
                   - lastRepairedBlock is a value we store as we repair blocks to know at what height we should be good. This prevents repairing from 0 every time and in general this value should 
                     be the latest block height after this routine finishes. In general it keeps track of where we were last time we repaired.  A brand new blockservice install will start from 0
                     and repair all the way up to current height.
                2) get a batch, which is the result of finding all those blocks that have a "blockInfo.hash" equal to "block-does-not-exist".
                3) iterate through them and check to see if we have the info to process now by calling syncBlocks and passing in the block number for both args (from, to).
                  o syncBlocks is a routine that takes two block numbers, FROM and TO. We pass our block numbers as both args to only sync this 1 block
                    Check out the syncBlocks routine for the comments on how it works.
        */

        // This is a value we store in the database to keep track of the last time we ran a repair
        let lastRepairedBlock = await db.queries.getLastRepaired() - 1000
        if (lastRepairedBlock < 0) lastRepairedBlock = 0

        logger.start(`Repairing missing blocks from block ${lastRepairedBlock}.`)

        // Get all bad blocks in our range of blocks to repair
        let batch = await db.models.Blocks.find({ "blockInfo.hash": "block-does-not-exist", "blockNum": { $gte: lastRepairedBlock } })

        logger.success(`${batch.length} missing blocks found.`)

        // Iterate any results
        for (let block of batch) {
            const { blockNum, blockInfo } = block

            let blockToGet = blockNum || blockInfo.number

            try {
                if (isNaN(parseInt(blockToGet))) throw new Error(`Block has no number.`)
                // Try to process the block again, check this routine for comments on how it works
                await syncBlocks(blockToGet, blockToGet)
            } catch (e) {
                logger.debug({ block })
                logger.error(e)
            }
        }

        logger.complete(`Repair missing blocks completed.`)

        // recheck in 5 minutes
        setTimeout(checkForMissingBlocks, 300000)
    }

    async function start() {
        // Create a block processing queue so we can add new blocks one at a time and process them in order
        blockProcessingQueue.setupBlockProcessor(processBlock)
        // Start the processing queue
        blockProcessingQueue.start()

        // connect to the websocket events we want
        blockchainEvents.setupEventProcessor('new_block', processBlockFromWebsocket)
        blockchainEvents.setupEventProcessor('latest_block', processLatestBlockFromWebsocket)
        blockchainEvents.start()

        // Every 5 minutes for missing blocks
        checkForMissingBlocks()
    }

    return {
        start
    }
};

export {
    runBlockGrabber
}