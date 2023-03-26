import WebSocket from 'websocket'

import { createLogger } from '../logger.mjs'

const logger = createLogger('Service', 'Websocket');

const actionsWebsockets = (MASTERNODE_URL) => {
    let wsClient = null
    let eventProcessors = {}
    let url = createURL()
    let initialized = false
    let connected = false
    let timer = null
    let wsconnection = null
    let init = null

    function start() {
        if (!url) throw new Error("No MASTERNODE_URL provided for websocket connection")

        logger.start(`Connecting to ${url} masternode websocket.`)
        connect()
    }

    function connect() {
        wsClient = new WebSocket.client({
            maxReceivedFrameSize: 0x10000000
        })
        wsClient.on('connect', onConnect)
        wsClient.on('connectFailed', function(error) {
            console.log('Connect Error: ' + error.toString());
        });
        wsClient.connect(`${url}`)
    }

    function reconnect() {
        if (connected) {
            clearInterval(timer)
            timer = null
        }

        logger.pending(`Reconnecting to ${url} masternode websocket.`)
        wsClient.connect(`${url}`)
    }

    function onConnect(connection) {
        connected = true

        wsconnection = connection

        clearInterval(timer)
        timer = null

        connection.on('error', onError);
        connection.on('close', onClose);
        connection.on('message', onMessage);

        if (initialized) {
            logger.success('Actions WebSocket Client Reconnected');
        } else {
            logger.success('Actions WebSocket Client Connected');
            initialized = true
        }
        if(init) init()
    }

    function onMessage(message) {
        if (message.type === 'utf8') {
            logger.log("Received: '" + message.utf8Data + "'");
            try {
                let eventData = JSON.parse(message.utf8Data)
                eventProcessors[eventData.action](eventData.result, eventData.payload)
            } catch (e) {
                logger.error("Error processing event off websocket.")
                logger.error(e)
            }

        }
    }

    function onError(error) {
        logger.error("Connection Error: " + error.toString());
        connected = false
        if (!timer) timer = setInterval(reconnect, 1000)
    }

    function onClose() {
        logger.log('echo-protocol Connection Closed');
        connected = false
        if (!timer) timer = setInterval(reconnect, 1000)
    }

    function setupActionsProcessor(eventName, EventProcessor) {
        eventProcessors[eventName] = EventProcessor
    }

    function createURL() {
        if (MASTERNODE_URL.includes('ws://') || MASTERNODE_URL.includes('wss://')) return

        if (MASTERNODE_URL.includes('https://')) {
            return 'wss://' + MASTERNODE_URL.split('https://')[1] + '/actions'
        }
        if (MASTERNODE_URL.includes('http://')) {
            return 'ws://' + MASTERNODE_URL.split('http://')[1] + '/actions'
        }
        return 'ws://' + MASTERNODE_URL + '/actions'
    }

    function dispatchAction(action, payload) {
        try {
            let msg = JSON.stringify({
                action,
                payload
            })
            wsconnection.send(msg)
        } catch(e) {
            console.log(e)
        }
    }

    function setupInit(func) {
        init = func
    }

    return {
        start,
        setupActionsProcessor,
        dispatchAction,
        setupInit
    }
};

export {
    actionsWebsockets
}