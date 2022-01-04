// ARGS
// 1: start_block (int, optional, default 0) - block to start pulling "block-does-not-exist" hashes from
// 2: just_one (true, optional, default false) - enter true to only get one block

// Instructions
// 1) Run from project root!
//    node src/database/loaders/repair_missing.mjs
// 2) when prompted verify the masternode

import https from 'https';
import http from 'http';
import util from 'util'
import readline from 'readline'

import * as utils from '../../utils.mjs'
import { getDatabase } from "../database.mjs";

const repairMissingBlocks = (async () => {
    let db = await getDatabase()

    let startTime = new Date()
    
    async function get_batch(start_block = 0, just_one=false){
        console.log(`-> Getting all missing blocks...`)

        if (just_one) process_batch(await db.models.Blocks.find({"blockInfo.hash": "block-does-not-exist", "blockNum":{ $eq: start_block}}))
        else process_batch(await db.models.Blocks.find({"blockInfo.hash": "block-does-not-exist", "blockNum":{ $gte: start_block}}))
    }

    async function process_batch(batch){
        for (let change of batch){
            const { blockNum, blockInfo } = change

            if (!blockNum || !blockInfo.number) continue

            try{
                let blockData = await getBlock_MN(blockNum)
                console.log(util.inspect({blockData}, false, null, true))

                if (!blockData.error && blockData.hash) await processBlock(db, blockData)

            }catch(e){
                console.log(e)
                process.exit()
            }
        }
        done()
    }

    function getBlock_MN (blockNum, timedelay = 250){
        return new Promise(resolver => {
            setTimeout(async() => {
                const block_res = await sendBlockRequest(`${MASTERNODE_URL}/blocks?num=${blockNum}`);
                block_res.id = blockNum
                resolver(block_res);
            }, timedelay)
        })
    };

    function done(){
        console.log(`** DONE ** Run time ${(new Date() - startTime) / 1000} seconds.`)
        process.exit()
    }

    console.log("-- STARTING LOADER (repair missing blocks) --")

    let [ start_block, just_one ] = process.argv.slice(2)

    const MASTERNODE_URLS = {
        'testnet': "https://testnet-master-1.lamden.io",
        'mainnet': "https://masternode-01.lamden.io"
    }
    
    const MASTERNODE_URL = MASTERNODE_URLS[db.config.NETWORK]
    
    const input = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    })
    
    console.log(`MASTERNODE_URL: ${MASTERNODE_URL}`)
    input.question(`Is this the correct masternode? (y/n) `, answer => {
        if (answer.toLocaleLowerCase() === 'y') {
            try {
                get_batch(parseInt(start_block || 0), just_one === "true")
            }catch(e){
                throw new Error(`Invalid start block of ${start_block} provided`)
            }
        }
        input.close()
    })
})()

async function processBlock(db, blockInfo = {}){
    let blockNum = blockInfo.id

    try{
        await processBlockStateChanges(db, blockInfo)
    }catch(e){
        console.log(e)
        process.exit()
    }
    
    await db.models.Blocks.updateOne({ blockNum }, {
        blockNum,
        blockInfo,
        hash: blockInfo.hash
    })

};


async function processBlockStateChanges(db, blockInfo) {

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

                        if (currentState) {
                            if (new Date(timestamp) > new Date(currentState.lastUpdated)) {
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
                                    process.exit()
                                }
                            })
                        }
    
                        let newStateChangeObj = utils.keysToObj(keyInfo, s.value)
    
                        state_changes_obj = utils.mergeObjects([state_changes_obj, newStateChangeObj])
    
                        affectedContractsList.add(contractName)
                        affectedVariablesList.add(`${contractName}.${variableName}`)
                        if (rootKey) affectedRootKeysList.add(`${contractName}.${variableName}:${rootKey}`)

                        let foundContractName = await db.models.Contracts.findOne({contractName})
                        if (!foundContractName) {
                            let code = await db.queries.getKeyFromCurrentState(contractName, "__code__")
                            let lst001 = db.utils.isLst001(code.value)
                            await new db.models.Contracts({
                                contractName,
                                lst001
                            }).save((err) => {
                                console.log(err)  
                                process.exit()                                  
                            })
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

            }catch(e){
                console.log(e)
                console.log(util.inspect({blockInfo}, false, null, true))
                process.exit()
            }
        }
    }
}

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
                        console.log(new Date())
                        console.log(err)
                        console.error("Error in https resp.on.end: " + err);
                        console.log(data)
                        resolve({ error: err.message });
                    }
                });
            })
            .on("error", (err) => {
                console.log(new Date())
                console.log(err)
                console.error("Error in https protocol.on.error: " + err);
                resolve({ error: err.message });
            });
    });
};