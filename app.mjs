import { config } from 'dotenv'
config()
import { getDatabase } from "./src/database/database.mjs";
//import { runBlockGrabber } from './blockgrabber.mjs'
import { runBlockGrabber } from './src/blockgrabber.mjs'
import { createServer } from './src/server.mjs'

const MASTERNODE_URLS = {
    'testnet': "https://testnet-master-1.lamden.io",
    'mainnet': "https://masternode-01.lamden.io"
}

/******* MONGO DB CONNECTION INFO **/
const NETWORK = process.env.NETWORK || 'testnet'
const START_AT_BLOCK_NUMBER = parseInt(process.env.START_AT_BLOCK_NUMBER) || 0
const RE_PARSE_BLOCKS = process.env.RE_PARSE_BLOCKS || false
const WIPE = process.env.WIPE || false
const MASTERNODE_URL = process.env.MASTERNODE_URL || MASTERNODE_URLS[NETWORK]

/******* SERVER CONNECTION INFO **/
const BLOCKSERVICE_PORT = process.env.BLOCKSERVICE_PORT || 3535

let grabberConfig = {
    DEBUG_ON: process.env.DEBUG_ON || false,
    REPAIR_BLOCKS: process.env.REPAIR_BLOCKS || undefined,
    START_AT_BLOCK_NUMBER,
    MASTERNODE_URL,
    WIPE,
    RE_PARSE_BLOCKS
}

const start = async() => {
    grabberConfig.db = await getDatabase()
    grabberConfig.server = await createServer(BLOCKSERVICE_PORT, grabberConfig.db)

    let blockGrabber = runBlockGrabber(grabberConfig)
    let nextCheck = 15000
    setInterval(async() => {
        console.log(blockGrabber.lastCheckedTime())
        console.log(new Date() - blockGrabber.lastCheckedTime())

        if (blockGrabber.isRepairing()) {
            nextCheck = 60000
        } else {
            if ((new Date() - blockGrabber.lastCheckedTime()) > 30000) {
                console.log('restarting blockgrabber')
                if (grabberConfig.WIPE === 'yes') grabberConfig.WIPE = undefined
                if (grabberConfig.RE_PARSE_BLOCKS === 'yes') grabberConfig.RE_PARSE_BLOCKS = undefined
                blockGrabber.stop()
                blockGrabber = runBlockGrabber(grabberConfig)
                nextCheck = 30000
            } else {
                nextCheck = 15000
            }
        }
    }, nextCheck)
}

start()