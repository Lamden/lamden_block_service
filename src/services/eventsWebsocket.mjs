import * as utils from '../utils.mjs'
import util from 'util'

import WebSocket from 'websocket'

const eventWebsockets = (MASTERNODE_URL) => {
    let wsClient = null
    let eventProcessors = {}
    let url = createURL()
    let initialized = false
    let connected = false
    let timer = null

    function start(){
        if (!url) throw new Error("No MASTERNODE_URL provided for websocket connection")

        console.log(`- Connecting to ${url} masternode websocket.`)
        connect()
    }

    function connect(){
        wsClient = new WebSocket.client
        wsClient.on('connect', onConnect)
        wsClient.connect(`${url}`)
    }

    function reconnect(){
        if (connected) {
            clearInterval(timer)
            timer = null
        }

        console.log(`- Reconnecting to ${url} masternode websocket.`)
        wsClient.connect(`${url}`)
    }

    function onConnect(connection){
        connected = true

        console.log(new Date())

        clearInterval(timer)
        timer = null

        connection.on('error', onError);
        connection.on('close', onClose);
        connection.on('message', onMessage);
    

        if (initialized) {
            console.log('WebSocket Client Reconnected');
        }else{
            console.log('WebSocket Client Connected');
            initialized = true
        }

    }

    function onMessage(message){
        console.log(new Date())
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
        connected = false
        if (!timer) timer = setInterval(reconnect, 1000)
    }

    function onClose(){
        console.log('echo-protocol Connection Closed');
        connected = false
        if (!timer) timer = setInterval(reconnect, 1000)
    }

    function setupEventProcessor(eventName, EventProcessor){
        eventProcessors[eventName] = EventProcessor
    }

    function createURL(){
        if (MASTERNODE_URL.includes('ws://') || MASTERNODE_URL.includes('wss://')) return

        if (MASTERNODE_URL.includes('https://')){
            return 'wss://' + MASTERNODE_URL.split('https://')[1]
        }
        if (MASTERNODE_URL.includes('http://')){
            return 'ws://' + MASTERNODE_URL.split('http://')[1]
        }
        return 'ws://' + MASTERNODE_URL
    }

    return {
        start,
        setupEventProcessor
    }
};

export {
    eventWebsockets
}