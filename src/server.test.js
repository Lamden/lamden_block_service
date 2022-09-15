const { createServer } = require("./server.mjs")
const { getBlockProcessor } = require('./blockProcessor.mjs')
const { repairMalformedBlock } = require('./utils.mjs')
const db = require('mongoose')
const Client = require("socket.io-client")
const { getType } = require('jest-get-type');

require("./db_test_helper/setup.js")

const newblock = { "hash": "5660ee4bc17bf4b069051ccc1b0e0fa1a6951e84b704eee1629c3291c122bf07", "number": { "__fixed__": "8533" }, "previous": "ee08379e5641f90284fd7b88ce350ea69d674a50a8b2813d17f1d86a665c98f8", "subblocks": [{ "input_hash": "c72c427154c7fc49313f3267079015ecc7f7d414935a1c32bca186b107937822", "merkle_leaves": ["1df19a1a074eb394d6ea407db9b0b9e3a86b7ae98903237e88d564d69a3e07d7"], "signatures": [{ "signature": "ffe51635e91629ed996ced0ddb595d7217997d80695df819fd0009943ebf896d4248ef6f62e4ccdc38a11b9981cc50e0b961bb73555984c329096ed7b138c40c", "signer": "ee2e928015fd8433c8c6da7234504968a1bde751b0784c3efbe4bc42628d5e9b" }], "subblock": 0, "transactions": [{ "hash": "ec17971389c13b45d63b451d220bf6034c87a0250304f022fc66b0b4809a0382", "result": "None", "stamps_used": { "__fixed__": "14" }, "state": [{ "key": "con_rswp_lst001.balances:de63d90cb1961228a60265f58d7de6b08152be01854a04082453d73048d6d8c9:con_staking_rswp_doug", "value": { "__fixed__": "9999999999999" } }, { "key": "currency.balances:de63d90cb1961228a60265f58d7de6b08152be01854a04082453d73048d6d8c9", "value": { "__fixed__": "122790.74893419167235095520051190344" } }], "status": { "__fixed__": "0" }, "transaction": { "metadata": { "signature": "c09effe9c22463b88de4a2b06b8c6e7c536232ef358536d0e110cc84821543b83e1ff00464b75bd6df142b013b9c4e7ddb8d67b5ef87d2ed49da014519582805", "timestamp": { "__fixed__": "1615682891" } }, "payload": { "contract": "con_rswp_lst001", "function": "approve", "kwargs": { "amount": { "__fixed__": "9999999999999" }, "to": "con_staking_rswp_doug" }, "nonce": { "__fixed__": "466" }, "processor": "89f67bb871351a1629d66676e4bd92bbacb23bd0649b890542ef98f1b664a497", "sender": "de63d90cb1961228a60265f58d7de6b08152be01854a04082453d73048d6d8c9", "stamps_supplied": { "__fixed__": "44" } } } }] }] }

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

  test("Subscribe to the new-state-changes-by-transaction event in tx hash room ", (done) => {
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
      done()
    });
    clientSocket.emit('join', data.processed.hash)
    blockProcessor(data).catch((e) => { console.log(e) })
  });


  test("Should get push notifications of new block after a new block was processed.", (done) => {
    let data = repairMalformedBlock(newblock)
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
      done()
    });
    clientSocket.emit('join', "all-state-changes-by-transaction")
    blockProcessor(data).catch((e) => { })
  });
});