const { createPythonSocketClient, createExpressApp } = require('../server.mjs');
const { getDatabase } = require('../database/database.mjs');
const supertest = require('supertest');
const { getType } = require('jest-get-type');

let db, pysocket, app, request;

const validHistory = (item) => {
    // valid the block info
    expect(getType(item.blockNum)).toBe('number');
    expect(getType(item.subBlockNum)).toBe('number');
    expect(getType(item.timestamp)).toBe('number');
    expect(getType(item.txHash)).toBe('string');
    expect(getType(item.txIndex)).toBe('number');
    expect(getType(item.txInfo)).toBe('object');
    expect(getType(item.tx_uid)).toBe('string');
    expect(getType(item._id)).toBe('string');
}

beforeAll(async () => {
    db = getDatabase();
    pysocket = createPythonSocketClient();
    app = createExpressApp(db, pysocket);
    request = supertest(app);
    await new Promise(resolve => setTimeout(resolve, 1000));
});

afterAll(async () => {
    await db.disconnect();
    await pysocket.disconnect();
});

describe('Test History Endpoints', () => {
    describe('/all_history: It should response the GET with all history info', () => {
        test('Returns all history info when no payload is passed.', async () => {
            const response = await request.get('/all_history');
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.statusCode).toBe(200);
            expect(getType(response.body.history)).toBe('array');

            const item = response.body.history[0];
            validHistory(item)
        })

        test('Returns a specified number of history info when limit parameter is passed.', async () => {
            const response = await request.get('/all_history?limit=20');
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.statusCode).toBe(200);
            expect(getType(response.body.history)).toBe('array');
            expect(response.body.history.length).toBe(20);

            const item = response.body.history[0];
            validHistory(item)
        })

        test('Returns 10 history info from a specified starting point when last_tx_uid parameter is passed.', async () => {
            const last_tx_uid = '000000000001.00000.00000'
            const new_tx_uid = '000000000002.00000.00000'
            const response = await request.get(`/all_history?last_tx_uid=${last_tx_uid}`);
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.statusCode).toBe(200);
            expect(getType(response.body.history)).toBe('array');
            expect(response.body.history.length).toBe(10);

            const item = response.body.history[0];
            validHistory(item)

            expect(item.tx_uid).toBe(new_tx_uid);
        })

        test('Returns a specified number of history info from a specified starting point when both limit and start_block parameters are passed.', async () => {
            const last_tx_uid = '000000000001.00000.00000'
            const new_tx_uid = '000000000002.00000.00000'
            const response = await request.get(`/all_history?limit=20&last_tx_uid=${last_tx_uid}`);
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.statusCode).toBe(200);
            expect(getType(response.body.history)).toBe('array');
            expect(response.body.history.length).toBe(20);

            const item = response.body.history[0];
            validHistory(item)

            expect(item.tx_uid).toBe(new_tx_uid);
        })
    })

    describe('/contract_history: It should response the GET with contract history info', () => {
        test('Don\'t return contract history info if contract name is not provided.', async () => {
            const response = await request.get('/contract_history');
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.statusCode).toBe(200);
            expect(response.body.history.length).toBe(0);
        })

        test('Returns contract history info by contract name.', async () => {
            const contract = 'currency';
            const response = await request.get(`/contract_history?contract=${contract}`);
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.statusCode).toBe(200);
            expect(getType(response.body.history)).toBe('array');

            // default 10 when not passing limit
            expect(response.body.history.length).toBe(10);

            const item = response.body.history[0];
            validHistory(item)
            expect(item.affectedContractsList).toContain(contract);
        })

        test('Returns a specified number of history info by limit and contract name.', async () => {
            const contract = 'currency';
            const limit = 6;
            const response = await request.get(`/contract_history?contract=${contract}&limit=${limit}`);
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.statusCode).toBe(200);
            expect(getType(response.body.history)).toBe('array');
            expect(response.body.history.length).toBe(6);

            const item = response.body.history[0];
            validHistory(item)
            expect(item.affectedContractsList).toContain(contract);
        })

        test('Returns a specified number of history info by limit ,contract name and last tx uid.', async () => {
            const contract = 'currency';
            const limit = 6;
            const last_tx_uid = '000000000001.00000.00000'
            const new_tx_uid = '000000000002.00000.00000'
            const response = await request.get(`/contract_history?contract=${contract}&limit=${limit}&last_tx_uid=${last_tx_uid}`);
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.statusCode).toBe(200);
            expect(getType(response.body.history)).toBe('array');
            expect(response.body.history.length).toBe(6);

            const item = response.body.history[0];
            validHistory(item)
            expect(item.affectedContractsList).toContain(contract);
            expect(item.tx_uid).toBe(new_tx_uid);
        })
    })

    describe('/variable_history: It should response the GET with variable history info', () => {
        test('Don\'t return variable history info if variable is not provided.', async () => {
            const variable = 'balances';
            const response = await request.get(`/variable_history?variable=${variable}`);
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.statusCode).toBe(200);
            expect(response.body.history.length).toBe(0);
        })

        test('Don\'t return variable history info if contract name is not provided.', async () => {
            const contract = 'currency';
            const response = await request.get(`/variable_history?contract=${contract}`);
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.statusCode).toBe(200);
            expect(response.body.history.length).toBe(0);
        })

        test('Returns variable history info by contract name and variable.', async () => {
            const contract = 'currency';
            const variable = 'balances';
            const response = await request.get(`/variable_history?contract=${contract}&variable=${variable}`);
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.statusCode).toBe(200);
            expect(getType(response.body.history)).toBe('array');

            // default 10 when not passing limit
            expect(response.body.history.length).toBe(10);

            const item = response.body.history[0];
            validHistory(item)
            expect(item.affectedContractsList).toContain(contract);
        })

        test('Returns a specified number of history info by limit, variable and contract name.', async () => {
            const contract = 'currency';
            const variable = 'balances';
            const limit = 6;
            const response = await request.get(`/variable_history?contract=${contract}&variable=${variable}&limit=${limit}`);
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.statusCode).toBe(200);
            expect(getType(response.body.history)).toBe('array');
            expect(response.body.history.length).toBe(6);

            const item = response.body.history[0];
            validHistory(item)
            expect(item.affectedContractsList).toContain(contract);
            expect(item.affectedVariablesList).toContain(`${contract}.${variable}`);
        })

        test('Returns a specified number of history info by limit , variable, contract name and last tx uid.', async () => {
            const contract = 'currency';
            const variable = 'balances';
            const limit = 6;
            const last_tx_uid = '000000000001.00000.00000';
            const new_tx_uid = '000000000002.00000.00000';
            const response = await request.get(`/variable_history?contract=${contract}&variable=${variable}&limit=${limit}&last_tx_uid=${last_tx_uid}`);
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.statusCode).toBe(200);
            expect(getType(response.body.history)).toBe('array');
            expect(response.body.history.length).toBe(6);

            const item = response.body.history[0];
            validHistory(item)
            expect(item.affectedContractsList).toContain(contract);
            expect(item.affectedVariablesList).toContain(`${contract}.${variable}`);
            expect(item.tx_uid).toBe(new_tx_uid);
        })
    })

    describe('/rootkey_history: It should response the GET with history info by rootkey', () => {
        test('Don\'t return history info if contract name is not provided.', async () => {
            const variable = 'balances';
            const root_key = '4a035ff604ffb0a44e5235e2fed8f69666b6df6ff11cbfa347d154d1a5453bba';
            const response = await request.get(`/rootkey_history?variable=${variable}&rootkey=${root_key}`);
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.statusCode).toBe(200);
            expect(response.body.history.length).toBe(0);
        })

        test('Don\'t return history info if variable is not provided.', async () => {
            const contract = 'currency';
            const root_key = '4a035ff604ffb0a44e5235e2fed8f69666b6df6ff11cbfa347d154d1a5453bba';
            const response = await request.get(`/rootkey_history?contract=${contract}&root_key=${root_key}`);
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.statusCode).toBe(200);
            expect(response.body.history.length).toBe(0);
        })

        test('Don\'t return history info if root_key is not provided.', async () => {
            const contract = 'currency';
            const variable = 'balances';
            const response = await request.get(`/rootkey_history?contract=${contract}&variable=${variable}`);
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.statusCode).toBe(200);
            expect(response.body.history.length).toBe(0);
        })


        test('Returns a specified number of history info by limit, variable, root_key and contract name.', async () => {
            const contract = 'currency';
            const variable = 'balances';
            const root_key = '4a035ff604ffb0a44e5235e2fed8f69666b6df6ff11cbfa347d154d1a5453bba';
            const limit = 6;
            const response = await request.get(`/rootkey_history?contract=${contract}&variable=${variable}&root_key=${root_key}&limit=${limit}`);
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.statusCode).toBe(200);
            expect(getType(response.body.history)).toBe('array');
            expect(response.body.history.length).toBe(6);

            const item = response.body.history[0];
            validHistory(item)
            expect(item.affectedContractsList).toContain(contract);
            expect(item.affectedVariablesList).toContain(`${contract}.${variable}`);
            expect(item.affectedRootKeysList).toContain(`${contract}.${variable}:${root_key}`);
        })

        test('Returns a specified number of history info by limit , variable, root_key, contract name and last tx uid.', async () => {
            const contract = 'currency';
            const variable = 'balances';
            const root_key = '4a035ff604ffb0a44e5235e2fed8f69666b6df6ff11cbfa347d154d1a5453bba';
            const limit = 6;
            const last_tx_uid = '000000000001.00000.00000';
            const new_tx_uid = '000000000002.00000.00000';
            const response = await request.get(`/rootkey_history?contract=${contract}&variable=${variable}&root_key=${root_key}&limit=${limit}&last_tx_uid=${last_tx_uid}`);
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.statusCode).toBe(200);
            expect(getType(response.body.history)).toBe('array');
            expect(response.body.history.length).toBe(6);

            const item = response.body.history[0];
            validHistory(item)
            expect(item.affectedContractsList).toContain(contract);
            expect(item.affectedVariablesList).toContain(`${contract}.${variable}`);
            expect(item.affectedRootKeysList).toContain(`${contract}.${variable}:${root_key}`);
            expect(item.tx_uid).toBe(new_tx_uid);
        })
    })

    describe('/tx_history/:vk: It should response the GET with history info by user account vk', () => {
        test('Return history info if vk is provided.', async () => {
            const vk = '4a035ff604ffb0a44e5235e2fed8f69666b6df6ff11cbfa347d154d1a5453bba';
            const response = await request.get(`/tx_history/${vk}`);
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.statusCode).toBe(200);

            // default limit = 10
            expect(response.body.history.length).toBe(10);
            expect(response.body.history[0].txInfo.transaction.payload.sender).toBe(vk);
        })

        test('Returns a specified number of history info by limit', async () => {
            const vk = '4a035ff604ffb0a44e5235e2fed8f69666b6df6ff11cbfa347d154d1a5453bba';
            const limit = 6;
            const response = await request.get(`/tx_history/${vk}?limit=${limit}`);
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.statusCode).toBe(200);

            expect(response.body.history.length).toBe(limit);
            expect(response.body.history[0].txInfo.transaction.payload.sender).toBe(vk);
        })

        test('Returns a specified number of history info by max_tx_uid', async () => {
            const vk = '4a035ff604ffb0a44e5235e2fed8f69666b6df6ff11cbfa347d154d1a5453bba';
            const max_tx_uid = "000000000010.00000.00000"
            const response = await request.get(`/tx_history/${vk}?max_tx_uid=${max_tx_uid}`);
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.statusCode).toBe(200);

            expect(response.body.history.length).toBeLessThan(10);
            expect(response.body.history[0].txInfo.transaction.payload.sender).toBe(vk);
        })
    })
})