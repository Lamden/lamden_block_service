const { createPythonSocketClient, createExpressApp } = require('../server.mjs');
const { getDatabase } = require('../database/database.mjs');
const supertest = require('supertest');
const { getType } = require('jest-get-type');

let db, pysocket, app, request;

const validContract = (item) => {
    expect(getType(item.contractName)).toBe('string');
    expect(getType(item.lst001)).toBe('boolean');
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

describe('Test Info Endpoints', () => {
    describe('/contracts: It should response the GET with all contracts info', () => {
        test('Returns all contracts info', async () => {
            const response = await request.get('/contracts');
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.statusCode).toBe(200);
            expect(getType(response.body)).toBe('array');

            const item = response.body[0];
            validContract(item)
        })
    })

    describe('/contracts/:contractName: It should response the GET with contract detail by contract name', () => {

        test('Returns contract info by contract name.', async () => {
            const contractName = 'currency';
            const response = await request.get(`/contracts/${contractName}`);
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.statusCode).toBe(200);
            expect(getType(response.body)).toBe('object');

            const item = response.body;
            expect(getType(item[contractName])).toBe('object');
        }, 15000)
    })

    describe('/tokens: It should response the GET with all contracts info which have token.', () => {

        test('Returns all contracts info which have token', async () => {
            const response = await request.get('/tokens');
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.statusCode).toBe(200);
            expect(getType(response.body)).toBe('array');

            const item = response.body[0];
            validContract(item);
        })
    })

    describe('/tokens/:contractName: It should response the GET with contract detail by contract name', () => {

        test('Returns contract info by contract name.', async () => {
            const contractName = 'con_days';
            const response = await request.get(`/tokens/${contractName}`);
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.statusCode).toBe(200);
            expect(getType(response.body)).toBe('object');

            const item = response.body;
            expect(getType(item)).toBe('object');
            expect(getType(item.__developer__)).toBe('string');
            expect(getType(item.__submitted__)).toBe('object');
        })
    })
})