const { createPythonSocketClient, createExpressApp } = require('../server.mjs');
const supertest = require('supertest');
const { getType } = require('jest-get-type');
const db = require('mongoose')

let pysocket, app, request;

// Memory mongo server
require("../db_test_helper/setup.js")

const validBlock = (item) => {
    // valid the block info
    expect(getType(item.hash)).toBe('string');
    expect(getType(item.number)).toBe('string');
    expect(getType(item.previous)).toBe('string');
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
            const blocknum = '1662667389487444992'
            const response = await request.get(`/blocks?start_block=${blocknum}`);
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.statusCode).toBe(200);
            expect(getType(response.body)).toBe('array');

            const item = response.body[0];
            validBlock(item)

            console.log(response.body)
            expect(item.number).toBe(blocknum);
        })

        test('Returns a specified number of blocks info from a specified starting point when both limit and start_block parameters are passed.', async () => {
            const blocknum = '1662667389487444992'
            const response = await request.get(`/blocks?limit=20&&start_block=${blocknum}`);
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.statusCode).toBe(200);
            expect(getType(response.body)).toBe('array');
            expect(response.body.length).toBe(20);

            const item = response.body[0];
            validBlock(item)

            expect(item.number).toBe(blocknum);

        })

        // test('Returns 100(Max Limit) blocks info when passing out of range limit parameter.', async () => {
        //     const response = await request.get('/blocks?limit=99999999999999999999999');
        //     expect(response.headers['content-type']).toMatch(/json/);
        //     expect(response.statusCode).toBe(200);
        //     expect(getType(response.body)).toBe('array');
        //     expect(response.body.length).toBe(100);
        // })

        test('Don\'t return block info when passing out of range start_block parameter.', async () => {
            const response = await request.get('/blocks?start_block=9223372036854775800');
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.statusCode).toBe(200);
            expect(getType(response.body)).toBe('array');
            expect(response.body.length).toBe(0);
        })
    })

    describe('/blocks/:number: It should response the GET with block info by block number', () => {
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
            const blocknumber = '1662667389487444992';
            const response = await request.get(`/blocks/${blocknumber}`);
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.statusCode).toBe(200);
            validBlock(response.body);
        })

    })
})