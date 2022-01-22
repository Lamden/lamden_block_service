import * as utils from './utils.mjs'
import util from 'util'

import WebSocket from 'websocket'

const runBlockLoader = (config) => {
    const { MASTERNODE_URL, db } = config
    const wsClient = new WebSocket.client

    function start(){
        if (!MASTERNODE_URL) throw new Error("No MASTERNODE_URL provided for websocket connection")

        console.log(`- Connecting to ${MASTERNODE_URL} masternode websocket.`)

        wsClient.on('connect', onConnect)
        // wsClient.connect(MASTERNODE_URL, 'echo-protocol')
        // testnet-master-1.lamden.io/
        wsClient.connect('wss://testnet-master-1.lamden.io')
    }

    function onConnect(connection){
        console.log('WebSocket Client Connected');
        connection.on('error', onError);
        connection.on('close', onClose);
        connection.on('message', onMessage);
    }

    function onMessage(message){
        console.log({message})
        if (message.type === 'utf8') {
            console.log("Received: '" + message.utf8Data + "'");
        }
    }

    function onError(error){
        console.log("Connection Error: " + error.toString());

    }

    function onClose(){
        console.log('echo-protocol Connection Closed');
    }

    return {
        start
    }
};

export {
    runBlockLoader
}