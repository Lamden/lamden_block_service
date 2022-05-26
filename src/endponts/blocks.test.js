const { createPythonSocketClient, createExpressApp } = require('../server.mjs');
const { getDatabase } = require('../database/database.mjs');
const supertest = require('supertest');
const { getType } = require('jest-get-type');

let db, pysocket, app, request;

const validBlock = (item) => {
    // valid the block info
    expect(getType(item.hash)).toBe('string');
    expect(getType(item.id)).toBe('number');
    expect(getType(item.number)).toBe('number');
    expect(getType(item.previous)).toBe('string');
    expect(getType(item.subblocks)).toBe('array');
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

describe('Test Blocks Endpoints', () => {
    describe('/blocks: It should response the GET with blocks info', () => {
        test('Returns 10 blocks info when no payload is passed.', async () => {
            const response = await request.get('/blocks');
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.statusCode).toBe(200);
            expect(getType(response.body)).toBe('array');
            expect(response.body.length).toBe(10);

            const item = response.body[0];
            validBlock(item)
        })

        test('Returns a specified number of blocks info when limit parameter is passed.', async () => {
            const response = await request.get('/blocks?limit=20');
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.statusCode).toBe(200);
            expect(getType(response.body)).toBe('array');
            expect(response.body.length).toBe(20);

            const item = response.body[0];
            validBlock(item)
        })

        test('Returns blocks info from a specified starting point when start_block parameter is passed.', async () => {
            const response = await request.get('/blocks?start_block=6');
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.statusCode).toBe(200);
            expect(getType(response.body)).toBe('array');

            const item = response.body[0];
            validBlock(item)

            expect(item.number).toBe(6);
        })

        test('Returns a specified number of blocks info from a specified starting point when both limit and start_block parameters are passed.', async () => {
            const response = await request.get('/blocks?limit=20&&start_block=6');
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.statusCode).toBe(200);
            expect(getType(response.body)).toBe('array');
            expect(response.body.length).toBe(20);

            const item = response.body[0];
            validBlock(item)

            expect(item.number).toBe(6);

        })

        test('Returns 100(Max Limit) blocks info when passing out of range limit parameter.', async () => {
            const response = await request.get('/blocks?limit=9999999999999999');
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.statusCode).toBe(200);
            expect(getType(response.body)).toBe('array');
            expect(response.body.length).toBe(100);
        })

        test('Don\'t return block info when passing out of range start_block parameter.', async () => {
            const response = await request.get('/blocks?start_block=9999999999999999');
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.statusCode).toBe(200);
            expect(getType(response.body)).toBe('array');
            expect(response.body.length).toBe(0);
        })
    })

    describe('/blocks/:number: It should response the GET with block info by block number', () => {
        test('Returns block info by block number.', async () => {
            const response = await request.get('/blocks/6');
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.statusCode).toBe(200);
            expect(response.body.number).toBe(6);
        })

        test('Returns error when passing string block number.', async () => {
            const response = await request.get('/blocks/a');
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.statusCode).toBe(200);
            expect(response.body.error).toBeTruthy();
        })

        test('Returns error when passing a not existing block number.', async () => {
            const blockNumber = 9999999;
            const response = await request.get(`/blocks/${blockNumber}`);
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.statusCode).toBe(200);
            expect(response.body.error).toBe(`block number ${blockNumber} does not exist.`);
        })

        test('Returns a specified block info when passing block number.', async () => {
            const blockNumber = 6;
            const response = await request.get(`/blocks/${blockNumber}`);
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.statusCode).toBe(200);

            validBlock(response.body);
        })

    })
})