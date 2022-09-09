import * as utils from '../utils.mjs'
import util from 'util'

import WebSocket from 'websocket'

import { createLogger } from '../logger.mjs'

const logger = createLogger('Service', 'Websocket');

const eventWebsockets = (MASTERNODE_URL) => {
    let wsClient = null
    let eventProcessors = {}
    let url = createURL()
    let initialized = false
    let connected = false
    let timer = null

    function start() {
        if (!url) throw new Error("No MASTERNODE_URL provided for websocket connection")

        logger.start(`Connecting to ${url} masternode websocket.`)
        connect()
    }

    function connect() {
        wsClient = new WebSocket.client
        wsClient.on('connect', onConnect)
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

        clearInterval(timer)
        timer = null

        connection.on('error', onError);
        connection.on('close', onClose);
        connection.on('message', onMessage);


        if (initialized) {
            logger.success('WebSocket Client Reconnected');
        } else {
            logger.success('WebSocket Client Connected');
            initialized = true
        }

    }

    function onMessage(message) {
        if (message.type === 'utf8') {
            logger.log("Received: '" + message.utf8Data + "'");
            try {
                let eventData = JSON.parse(message.utf8Data)
                eventProcessors[eventData.event](eventData.data)
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

    function setupEventProcessor(eventName, EventProcessor) {
        eventProcessors[eventName] = EventProcessor
    }

    function createURL() {
        if (MASTERNODE_URL.includes('ws://') || MASTERNODE_URL.includes('wss://')) return

        if (MASTERNODE_URL.includes('https://')) {
            return 'wss://' + MASTERNODE_URL.split('https://')[1]
        }
        if (MASTERNODE_URL.includes('http://')) {
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