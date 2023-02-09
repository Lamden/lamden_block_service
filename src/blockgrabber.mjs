import { createLogger } from './logger.mjs'
import { getBlockProcessor } from './blockProcessor.mjs'
import { getGenesisBlockProcessor } from './blockProcessor_genesis.mjs'
import { GetBlockRepair } from './blockRepair.mjs'
import { BlockProcessingQueue } from './blockProcessingQueue.mjs'
import { getDatabase } from './database/database.mjs'

import axios from 'axios'

const logger = createLogger('Blocks');
const blockProcessingQueue = new BlockProcessingQueue()
const db = getDatabase()

const runBlockGrabber = (config) => {
    const {
        blockchainEvents,
        server,
        MASTERNODE_URL,
        GENESIS_BLOCK_URL
    } = config

    const blockRepair = GetBlockRepair(MASTERNODE_URL, server.services)

    async function processLatestBlockFromWebsocket(data) {
        if (!data) return
        
        await db.queries.setLatestBlock(data.number)
        let block = await db.models.Blocks.findOne({ blockNum: data.number })

        if (!block) {
            // will auto start repair process when block is added.
            blockProcessingQueue.addBlock(data)
        } else {
            await blockRepair.run()
        }
    };

    async function processBlockFromWebsocket(blockData) {
        await db.queries.setLatestBlock(blockData.number)
        blockProcessingQueue.addBlock(blockData)
    }

    async function start() {
        const processor = getBlockProcessor(server.services, db)
        // Create a block processing queue so we can add new blocks one at a time and process them in order
        blockProcessingQueue.setupBlockProcessor(async (data)=>{
            await processor(data)
            await blockRepair.run()
        })

        // connect to the websocket events we want
        blockchainEvents.setupEventProcessor('new_block', processBlockFromWebsocket)
        blockchainEvents.setupEventProcessor('latest_block', processLatestBlockFromWebsocket)
        
        if (await db.queries.hasGenesisBlock()){
            logger.success(`Genesis Block Loaded.`)
        }else{
            logger.log("No Genesis Block detected.")
            //await load_genesis_block()
        }

        blockchainEvents.start()
    }

    async function load_genesis_block(){
        logger.log(`Downloading Genesis Block from Github. (${GENESIS_BLOCK_URL}/genesis_block.json)`)
        const genesis_block = await axios.get(`${GENESIS_BLOCK_URL}/genesis_block.json`).then(res => {
            return res.data
        })
        // load gensis_state
        let flag = true
        let i = 1
        while (flag) {
            let state_url = `${GENESIS_BLOCK_URL}/state_changes_${i}.json`
            logger.log(`Downloading Genesis States from Github. (${state_url})`)
            const genesis_state = await axios.get(state_url)
            .then(res => {
                i = i + 1
                return Array.isArray(res.data) ? res.data : []
            })
            .catch(e => {
                // stop the loop
                flag = false
                if (e.response && e.response.status === 404) {
                    logger.log(`Genesis States Not Exist: (${state_url})`)
                    logger.log(`Genesis States Json Files Founded: ${i -1 } Files.`)
                    logger.log(`Genesis States Download Finished.`)
                    return []
                } else {
                    console.log(e)
                    logger.error(`Load genesis state failed, the link is ${state_url}`)
                    throw new Error("load")
                }
            })   
            genesis_block.genesis = [...genesis_block.genesis, ...genesis_state]
        }
        
        if (genesis_block.genesis){
            logger.success(`Genesis Block Downloaded and contains ${genesis_block.genesis.length} initial state entries.`)
        }

        const genesisBlockProcessor = getGenesisBlockProcessor(db)
        await genesisBlockProcessor(genesis_block)
    }   

    return {
        start
    }
};

export {
    runBlockGrabber
}