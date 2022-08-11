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
      expect(getType(message.tx_uid)).toBe('string')
      expect(getType(message.blockNum)).toBe('number')
      expect(message.blockNum).toBeDefined()
      expect(message.timestamp).toBeDefined()
      expect(message.affectedContractsList).toBeDefined()
      expect(message.affectedVariablesList).toBeDefined()
      expect(message.affectedRootKeysList).toBeDefined()
      //expect(message.affectedRawKeysList).toBeDefined()
      expect(message.state_changes_obj).toBeDefined()
      //expect(message.txHash).toBeDefined()
      expect(message.txInfo).toBeDefined()
      console.log(message)
      done()
    });
    clientSocket.emit('join', "all-state-changes-by-transaction")
    blockProcessor(data).catch((e) => { console.log(e) })
  });

  test("Should parse genesis block correctly", (done) => {
      let data = {
        'hash': '2bb4e112aca11805538842bd993470f18f337797ec3f2f6ab02c47385caf088e',
        'number': 0,
        'hlc_timestamp': '0000-00-00T00:00:00.000000000Z_0',
        'previous': '0000000000000000000000000000000000000000000000000000000000000000',
        'genesis': [
            {'key': 'currency.balances:9fb2b57b1740e8d86ecebe5bb1d059628df02236b69ed74de38b5e9d71230286', 'value': 100000000}
        ],
        'origin': {
            'sender': '9fb2b57b1740e8d86ecebe5bb1d059628df02236b69ed74de38b5e9d71230286',
            'signature': '82beb173f13ecc239ac108789b45428110ff56a84a3d999c0a1251a22974ea9b426ef61b13e04819d19556657448ba49a2f37230b8450b4de28a1a3cc85a3504'
        }
    }
    clientSocket.once("new-state-changes-by-transaction", (msg) => {
      let message = JSON.parse(msg).message
      expect(getType(message)).toBe('object')
      expect(getType(message.tx_uid)).toBe('string')
      expect(getType(message.blockNum)).toBe('number')
      expect(message.blockNum).toBeDefined()
      expect(message.timestamp).toBeDefined()
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
});