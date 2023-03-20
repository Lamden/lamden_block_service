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
    createServer(host, port, db).then(s => {
        server = s
        io = server.io
        blockProcessor = getBlockProcessor(server.services, db)
        clientSocket = Client.io(`ws://${host}:${port}`)
        clientSocket.on("connect", done);
    })
  });

  afterAll(() => {
    io.close();
    server.socketClient.close();
    clientSocket.disconnect();
  });

  test("Subscribe to the new-state-changes-by-transaction event in tx hash room ", (done) => {
    let data = newblock[0]
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
    clientSocket.emit('join', data.processed.hash)
    blockProcessor(data).catch((e) => { console.log(e) })
  });


  test("Should get push notifications of new block after a new block was processed.", (done) => {
    let data = newblock[1]
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
    let data = newblock[2]
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


  test("Subscribe to new_reward event in rewards room ", (done) => {
    let data = newblock[3]
    clientSocket.once("new_reward", (msg) => {
      let message = JSON.parse(msg).message
      expect(getType(message)).toBe('object')
      expect(getType(message.blockNum)).toBe('string')
      expect(message.blockNum).toBeDefined()
      expect(message.type).toBeDefined()
      expect(message.amount).toBeDefined()
      done()
    });
    clientSocket.emit('join', "rewards")
    blockProcessor(data).catch((e) => { console.log(e) })
  });

  test("Subscribe to the total_rewards event in rewards room ", (done) => {
    let data = newblock[4]
    clientSocket.once("total_rewards", (msg) => {
      let message = JSON.parse(msg).message
      expect(message.amount).toBeDefined()
      done()
    });
    clientSocket.emit('join', "rewards")
    blockProcessor(data).catch((e) => { console.log(e) })
  });

  test("Subscribe to the new_reward event in recipient rewards room ", (done) => {
    let data = newblock[5]
    clientSocket.once("new_reward", (msg) => {
      let message = JSON.parse(msg).message
      expect(getType(message)).toBe('object')
      expect(getType(message.blockNum)).toBe('string')
      expect(message.blockNum).toBeDefined()
      expect(message.type).toBeDefined()
      expect(message.amount).toBeDefined()
      done()
    });
    clientSocket.emit('join', "rewards-92e45fb91c8f76fbfdc1ff2a58c2e901f3f56ec38d2f10f94ac52fcfa56fce2e")
    blockProcessor(data).catch((e) => { console.log(e) })
  });

  test("Subscribe to the new_reward event in type rewards room ", (done) => {
    let data = newblock[5]
    clientSocket.once("new_reward", (msg) => {
      let message = JSON.parse(msg).message
      expect(getType(message)).toBe('object')
      expect(getType(message.blockNum)).toBe('string')
      expect(message.blockNum).toBeDefined()
      expect(message.type).toBeDefined()
      expect(message.amount).toBeDefined()
      done()
    });
    clientSocket.emit('join', "rewards-masternodes")
    blockProcessor(data).catch((e) => { console.log(e) })
  });

});