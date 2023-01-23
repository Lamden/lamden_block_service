const { createPythonSocketClient, createExpressApp } = require('../server.mjs');
const supertest = require('supertest');
const { getType } = require('jest-get-type');
const db = require('mongoose')
// Memory mongo server
require("../db_test_helper/setup.js")

let pysocket, app, request;

const validHistory = (item) => {
    // valid the block info
    expect(getType(item.blockNum)).toBe('string');
    expect(getType(item.txHash)).toBe('string');
    expect(getType(item.txInfo)).toBe('object');
    expect(getType(item.hlc_timestamp)).toBe('string');
    expect(getType(item._id)).toBe('string');
}

beforeAll(async () => {
    pysocket = createPythonSocketClient();
    app = await createExpressApp(db, pysocket);
    request = supertest(app);
    await new Promise(resolve => setTimeout(resolve, 1000));
});

afterAll(async () => {
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

        test('Returns 10 history info from a specified starting point when last_block_num parameter is passed.', async () => {
            const last_block_num = '0'
            const new_block_num = '1662667389487444992'
            const response = await request.get(`/all_history?last_block_num=${last_block_num}`);
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.statusCode).toBe(200);
            expect(getType(response.body.history)).toBe('array');
            expect(response.body.history.length).toBe(10);

            const item = response.body.history[0];
            validHistory(item)

            expect(item.blockNum).toBe(new_block_num);
        })

        test('Returns a specified number of history info from a specified starting point when both limit and start_block parameters are passed.', async () => {
            const last_block_num = '0'
            const new_block_num = '1662667389487444992'
            const response = await request.get(`/all_history?limit=20&last_block_num=${last_block_num}`);
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.statusCode).toBe(200);
            expect(getType(response.body.history)).toBe('array');
            expect(response.body.history.length).toBe(20);

            const item = response.body.history[0];
            validHistory(item)

            expect(item.blockNum).toBe(new_block_num);
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
            const last_block_num = '0'
            const new_block_num = '1662667389487444992'
            const response = await request.get(`/contract_history?contract=${contract}&limit=${limit}&last_block_num=${last_block_num}`);
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.statusCode).toBe(200);
            expect(getType(response.body.history)).toBe('array');
            expect(response.body.history.length).toBe(6);

            const item = response.body.history[0];
            validHistory(item)
            expect(item.affectedContractsList).toContain(contract);
            expect(item.blockNum).toBe(new_block_num);
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
            const last_block_num = '0'
            const new_block_num = '1662667389487444992'
            const response = await request.get(`/variable_history?contract=${contract}&variable=${variable}&limit=${limit}&last_block_num=${last_block_num}`);
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.statusCode).toBe(200);
            expect(getType(response.body.history)).toBe('array');
            expect(response.body.history.length).toBe(6);

            const item = response.body.history[0];
            validHistory(item)
            expect(item.affectedContractsList).toContain(contract);
            expect(item.affectedVariablesList).toContain(`${contract}.${variable}`);
            expect(item.blockNum).toBe(new_block_num);
        })
    })

    describe('/rootkey_history: It should response the GET with history info by rootkey', () => {
        test('Don\'t return history info if contract name is not provided.', async () => {
            const variable = 'balances';
            const root_key = '970b9152c7b8afb00bfe072e0777df3ae253c7f34d72cab324ffaf80fa7cd41a';
            const response = await request.get(`/rootkey_history?variable=${variable}&rootkey=${root_key}`);
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.statusCode).toBe(200);
            expect(response.body.history.length).toBe(0);
        })

        test('Don\'t return history info if variable is not provided.', async () => {
            const contract = 'currency';
            const root_key = '970b9152c7b8afb00bfe072e0777df3ae253c7f34d72cab324ffaf80fa7cd41a';
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
    })

    describe('/tx_history/:vk: It should response the GET with history info by user account vk', () => {
        test('Return history info if vk is provided.', async () => {
            const vk = '970b9152c7b8afb00bfe072e0777df3ae253c7f34d72cab324ffaf80fa7cd41a';
            const response = await request.get(`/tx_history/${vk}`);
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.statusCode).toBe(200);

            expect(response.body.history[0].txInfo.transaction.payload.sender).toBe(vk);
        })

        test('Returns a specified number of history info by limit', async () => {
            const vk = '970b9152c7b8afb00bfe072e0777df3ae253c7f34d72cab324ffaf80fa7cd41a';
            const limit = 1;
            const response = await request.get(`/tx_history/${vk}?limit=${limit}`);
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.statusCode).toBe(200);

            expect(response.body.history.length).toBe(limit);
            expect(response.body.history[0].txInfo.transaction.payload.sender).toBe(vk);
        })

        test('Returns a specified number of history info by max_hlc_timestamp', async () => {
            const vk = '970b9152c7b8afb00bfe072e0777df3ae253c7f34d72cab324ffaf80fa7cd41a';
            const last_block_number = "1662667398321946378"
            const response = await request.get(`/tx_history/${vk}?last_block_number=${last_block_number}`);
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.statusCode).toBe(200);

            expect(response.body.history.length).toBeLessThan(10);
            expect(response.body.history[0].txInfo.transaction.payload.sender).toBe(vk);
        })
    })
})