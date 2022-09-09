const { createServer } = require("./server.mjs")
const { getBlockProcessor } = require('./blockProcessor.mjs')
const db = require('mongoose')
const Client = require("socket.io-client")
const { getType } = require('jest-get-type');

const newblock  = require('../blockV2.json')

// Memory mongo server
require("./db_test_helper/setup.js")

describe("Testing websocket server.", () => {
  let io, server, clientSocket, blockProcessor;
  let host = "127.0.0.1"
  let port = 3535
  beforeAll((done) => {
    server = createServer(host, port, db)
    io = server.io
    blockProcessor = getBlockProcessor(server.services, db)
    clientSocket = Client.io(`ws://${host}:${port}`)
    clientSocket.on("connect", done);
  });

  afterAll(() => {
    io.close();
    server.socketClient.close();
    clientSocket.disconnect();
  });

  test("Should get push notifications of new block after a new block was processed.", (done) => {
    let data = newblock
    clientSocket.once("new-block", (msg) => {
      let message = JSON.parse(msg).message
      expect(message).toEqual(data)
    });
    clientSocket.once("new-state-changes-by-transaction", (msg) => {
      let message = JSON.parse(msg).message
      expect(getType(message)).toBe('object')
      expect(getType(message.hlc_timestamp)).toBe('string')
      expect(getType(message.blockNum)).toBe('string')
      expect(message.blockNum).toBeDefined()
      expect(message.affectedContractsList).toBeDefined()
      expect(message.affectedVariablesList).toBeDefined()
      expect(message.affectedRootKeysList).toBeDefined()
      //expect(message.affectedRawKeysList).toBeDefined()
      expect(message.state_changes_obj).toBeDefined()
      //expect(message.txHash).toBeDefined()
      expect(message.txInfo).toBeDefined()
      done()
    });
    clientSocket.emit('join', "all-state-changes-by-transaction")
    blockProcessor(data).catch((e) => { console.log(e) })
  });

  test("Subscribe to the new-state-changes-by-transaction event in tx hash room ", (done) => {
    let data = newblock
    clientSocket.once("new-block", (msg) => {
      let message = JSON.parse(msg).message
      expect(message).toEqual(data)
    });
    clientSocket.once("new-state-changes-by-transaction", (msg) => {
      let message = JSON.parse(msg).message
      expect(getType(message)).toBe('object')
      expect(getType(message.blockNum)).toBe('string')
      expect(message.blockNum).toBeDefined()
      expect(message.affectedContractsList).toBeDefined()
      expect(message.affectedVariablesList).toBeDefined()
      expect(message.affectedRootKeysList).toBeDefined()
      //expect(message.affectedRawKeysList).toBeDefined()
      expect(message.state_changes_obj).toBeDefined()
      //expect(message.txHash).toBeDefined()
      expect(message.txInfo).toBeDefined()
      done()
    });
    clientSocket.emit('join', data.processed.hash)
    blockProcessor(data).catch((e) => { console.log(e) })
  });
});