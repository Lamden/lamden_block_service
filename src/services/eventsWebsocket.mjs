import * as utils from '../utils.mjs'
import util from 'util'

import WebSocket from 'websocket'



const eventWebsockets = (MASTERNODE_URL) => {
    const wsClient = new WebSocket.client

    let eventProcessors = {}

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
            try{
                let eventData = JSON.parse(message.utf8Data)
                eventProcessors[eventData.event](eventData.data)
            }catch (e){
                console.error(`\n${new Date()}`)
                console.error("Error processing event off websocket.")
                console.error(e)
            }
            
        }
    }

    function onError(error){
        console.log("Connection Error: " + error.toString());

    }

    function onClose(){
        console.log('echo-protocol Connection Closed');
    }

    function setupEventProcessor(eventName, EventProcessor){
        eventProcessors[eventName] = EventProcessor
    }

    return {
        start,
        setupEventProcessor
    }
};

export {
    eventWebsockets
}