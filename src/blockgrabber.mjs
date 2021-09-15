import https from 'https';
import http from 'http';

import * as utils from './utils.mjs'
import util from 'util'

const runBlockGrabber = (config) => {
    const { WIPE, RE_PARSE_BLOCKS, MASTERNODE_URL, START_AT_BLOCK_NUMBER, DEBUG_ON, REPAIR_BLOCKS, RE_PARSE_BLOCK, db, server } = config

    var wipeOnStartup = WIPE;
    var reParseBlocks = RE_PARSE_BLOCKS;

    let stop = false;
    let repairing = true
    let currBlockNum = START_AT_BLOCK_NUMBER;
    let checkNextIn = 0;
    let maxCheckCount = 10;
    let alreadyCheckedCount = 0;
    const route_getBlockNum = "/blocks?num=";
    const route_getLastestBlock = "/latest_block";
    let lastestBlockNum = 0;
    let currBatchMax = 0;
    let batchAmount = 49;
    let timerId;
    let lastCheckTime = new Date();
    let runID = Math.floor(Math.random() * 1000)

    const wipeDB = async(force = false) => {
        console.log("-----WIPING DATABASE-----");
        const toWipe = ['StateChanges', 'App', 'CurrentState']

        if (wipeOnStartup || force) {
            await db.models.Blocks.deleteMany({}).then((res) => {
                console.log("Blocks DB wiped")
                console.log(res)
            });
        }
        toWipe.map(model => {
                return db.models[model].deleteMany({}).then((res) => {
                    console.log(`${model} DB wiped`);
                    console.log(res)
                });
            })
            // currBlockNum = 3100;
        currBlockNum = START_AT_BLOCK_NUMBER
        console.log(`Set currBlockNum = ${START_AT_BLOCK_NUMBER}`);
        timerId = setTimeout(checkForBlocks, 500);
    };

    const sendBlockRequest = (url) => {
        return new Promise((resolve) => {
            let protocol = http;
            if (url.includes("https://")) protocol = https;
            protocol
                .get(url, (resp) => {
                    let data = "";
                    resp.on("data", (chunk) => {
                        data += chunk;
                    });
                    resp.on("end", () => {
                        try {
                            // console.log(data);
                            resolve(JSON.parse(data));
                        } catch (err) {
                            console.error("Error: " + err);
                            resolve({ error: err.message });
                        }
                    });
                })
                .on("error", (err) => {
                    console.error("Error: " + err.message);
                    resolve({ error: err.message });
                });
        });
    };

    const processBlock = async(blockInfo = {}) => {
        if (typeof blockInfo.number !== "undefined") {
            let blockNum = blockInfo.number.__fixed__ ? parseInt(blockInfo.number.__fixed__) : blockInfo.number;
            let block = await db.models.Blocks.findOne({ blockNum })
            if (!block) {
                if (blockInfo.error) {
                    block = new db.models.Blocks({
                        blockInfo: {
                            hash: 'block-does-not-exist',
                            number: blockInfo.number,
                            subblocks: []
                        },
                        blockNum: blockInfo.number
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
                server.services.sockets.emitNewBlock(block.blockInfo)
                await processBlockStateChanges(block.blockInfo)
            }

            if (blockNum === currBatchMax) {
                currBlockNum = currBatchMax;
                checkForBlocks()
            }
        }
    };

    const processBlockStateChanges = async(blockInfo) => {
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

                if (Array.isArray(state)){
                    for (const s of state) {
                        let keyInfo = utils.deconstructKey(s.key)
    
                        const { contractName, variableName, rootKey } = keyInfo
    
                        let currentState = await db.models.CurrentState.findOne({ rawKey: s.key })
                        if (currentState) {
                            if (currentState.lastUpdated < timestamp) {
                                currentState.txHash = txInfo.hash
                                currentState.value = s.value
                                currentState.lastUpdated = timestamp
                                await currentState.save()
                            }
                        } else {
                            await new db.models.CurrentState({
                                rawKey: s.key,
                                txHash: txInfo.hash,
                                value: s.value,
                                lastUpdated: timestamp
                            }).save()
                        }
    
                        let newStateChangeObj = utils.keysToObj(keyInfo, s.value)
    
                        state_changes_obj = utils.mergeObjects([state_changes_obj, newStateChangeObj])
    
                        affectedContractsList.add(contractName)
                        affectedVariablesList.add(`${contractName}.${variableName}`)
                        if (rootKey) affectedRootKeysList.add(`${contractName}.${variableName}:${rootKey}`)
    
                        server.services.sockets.emitStateChange(keyInfo, s.value, newStateChangeObj, txInfo)
                    }
                }

                let blockPadding = "000000000000"
                let regPadding = "00000"

                let blockWithPadding = `${blockPadding.substring(0, blockPadding.length - blockInfo.number.toString().length)}${blockInfo.number}`
                let subBlockWithPadding = `${regPadding.substring(0, regPadding.length - subBlockNum.toString().length)}${subBlockNum}`
                let txIndexPadding = `${regPadding.substring(0, regPadding.length - tx_index.toString().length)}${tx_index}`

                let tx_uid = `${blockWithPadding}.${subBlockWithPadding}.${txIndexPadding}`

                let stateChangesModel = {
                    tx_uid,
                    blockNum: blockInfo.number,
                    subBlockNum,
                    txIndex: tx_index,
                    timestamp,
                    affectedContractsList: Array.from(affectedContractsList),
                    affectedVariablesList: Array.from(affectedVariablesList),
                    affectedRootKeysList: Array.from(affectedRootKeysList),
                    state_changes_obj: utils.cleanObj(state_changes_obj),
                    txHash: txInfo.hash,
                    txInfo
                }

                await db.models.StateChanges.updateOne({ tx_uid }, stateChangesModel, { upsert: true });

                server.services.sockets.emitTxStateChanges(stateChangesModel)
            }
        }
    }

    const getBlock_MN = (blockNum, timedelay = 0) => {
        return new Promise(resolver => {
            setTimeout(async() => {
                const block_res = await sendBlockRequest(`${MASTERNODE_URL}${route_getBlockNum}${blockNum}`);
                if (block_res.error) block_res.number = blockNum
                resolver(block_res);
            }, timedelay)
        })
    };

    const getLatestBlock_MN = () => {
        return new Promise((resolve, reject) => {
            const returnRes = async(res) => {
                if (!res) res = res.error = "Unknown Error Getting Latest Block"
                resolve(res);
            };

            const res = sendBlockRequest(
                `${MASTERNODE_URL}${route_getLastestBlock}`
            );
            returnRes(res);
        });
    };

    const repairBlocks = async(start_block) => {
        if (!start_block) return

        let latest_synced_block = await db.queries.getLatestSyncedBlock()

        if (!latest_synced_block) return

        console.log("Repairing Blocks Database...")

        for (let i = start_block; i <= latest_synced_block; i++) {
            let block = await db.models.Blocks.findOne({ blockNum: i })
            if (!block) {
                console.log(`Don't have data for block number ${i}.. getting now...`)
                let blockData = await getBlock_MN(i, 150)
                if (blockData) {
                    console.log(util.inspect(blockData, false, null, true))
                    console.log(`Got data for block number ${i}.. processing...`)
                    await processBlock(blockData).catch(err => console.log(util.inspect(err, false, null, true)))
                } else {
                    console.log(`Block number ${i} has no data on masternode.`)
                }
            }
        }
    }

    const checkForBlocks = async() => {
        const recheck = (error, delay) => {
            console.log(`${runID}: ${error}`);
            timerId = setTimeout(checkForBlocks, delay);
        }
        if (stop) return
        lastCheckTime = new Date()
        if (DEBUG_ON) {
            console.log(runID + ": checking")
        }

        let response = await getLatestBlock_MN();

        if (!response) {
            recheck("null response from server, checking again in 10 seconds.", 10000)
            return
        }

        if (!response.error) {

            lastestBlockNum = response.number;
            if (lastestBlockNum.__fixed__) lastestBlockNum = parseInt(lastestBlockNum.__fixed__)

            await db.models.App.updateOne({ key: "latest_block" }, {
                key: "latest_block",
                value: lastestBlockNum
            }, { upsert: true })

            if (lastestBlockNum < currBlockNum || wipeOnStartup || reParseBlocks) {
                await wipeDB();
                wipeOnStartup = false;
                reParseBlocks = false;
            } else {
                if (DEBUG_ON) {
                    console.log("lastestBlockNum: " + lastestBlockNum);
                    console.log("currBlockNum: " + currBlockNum);
                }
                if (lastestBlockNum === currBlockNum) {
                    if (alreadyCheckedCount < maxCheckCount)
                        alreadyCheckedCount = alreadyCheckedCount + 1;
                    checkNextIn = 200 * alreadyCheckedCount;
                    timerId = setTimeout(checkForBlocks, checkNextIn);
                }

                let to_fetch = [];
                if (lastestBlockNum > currBlockNum) {
                    currBatchMax = currBlockNum + batchAmount;
                    if (currBatchMax > lastestBlockNum)
                        currBatchMax = lastestBlockNum;
                    if (currBatchMax > batchAmount) currBatchMax + batchAmount;
                    let blocksToGetCount = 1
                    for (let i = currBlockNum + 1; i <= currBatchMax; i++) {
                        let block = await db.models.Blocks.findOne({ blockNum: i })
                        let blockData = null;
                        if (block) {
                            blockData = block.blockInfo
                        } else {
                            const timedelay = blocksToGetCount * 100;
                            if (DEBUG_ON) {
                                //console.log("getting block: " + i + " with delay of " + timedelay + "ms");
                            }

                            blockData = getBlock_MN(i, timedelay)
                            blocksToGetCount = blocksToGetCount + 1
                        }
                        to_fetch.push(blockData);
                    }

                    let to_process = await Promise.all(to_fetch);
                    to_process.sort((a, b) => a.number - b.number);
                    for (let block of to_process) await processBlock(block);
                }

                if (lastestBlockNum < currBlockNum) {
                    await wipeDB(true);
                    timerId = setTimeout(checkForBlocks, 10000);
                }
            }
        } else {
            recheck(`${response.error}. Checking again in 10 seconds.`, 10000)
        }
    };

    async function start() {
        await repairBlocks(REPAIR_BLOCKS)

        if (RE_PARSE_BLOCK) {
            let blockNum = parseInt(RE_PARSE_BLOCK)
            let blockData = await db.models.Blocks.findOne({ blockNum })

            await processBlock(blockData.blockInfo)
        }

        db.queries.getLastestProcessedBlock()
            .then((res) => {
                currBlockNum = res
                console.log("Starting to check for new blocks...")
                timerId = setTimeout(checkForBlocks, 0);
            });

    }

    start()

    return {
        lastCheckedTime: () => lastCheckTime,
        stop: () => {
            clearInterval(timerId)
            timerId = null
            stop = true
        },
        isRepairing: () => repairing
    }
};

export {
    runBlockGrabber
}