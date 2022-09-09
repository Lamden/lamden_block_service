const { createPythonSocketClient, createExpressApp } = require('../server.mjs');
const { getDatabase } = require('../database/database.mjs');
const supertest = require('supertest');
const { getType } = require('jest-get-type');

let db, pysocket, app, request;

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

describe('Test Tx Endpoints', () => {
    test('/tx: Returns Transaction Info when tx hash is provided.', async () => {
        const hash = "d5a4de02b473265042a574d0a17710b3c9de67b11282cd9f95cd6d943436e9e2"
        const response = await request.get(`/tx?hash=${hash}`);
        expect(response.headers['content-type']).toMatch(/json/);
        expect(response.statusCode).toBe(200);
        expect(getType(response.body)).toBe('object');
        expect(response.body.txHash).toBe(hash);
    })


    test('/latest_processed_block: Returns latest processed block number.', async () => {
        const response = await request.get('/latest_processed_block');
        expect(response.headers['content-type']).toMatch(/json/);
        expect(response.statusCode).toBe(200);
        expect(getType(response.body)).toBe('object');

        expect(getType(response.body.latest_processed_block)).toBe('string');
    })

    test('/latest_synced_block: Returns latest synced block number.', async () => {
        const response = await request.get('/latest_synced_block');
        expect(response.headers['content-type']).toMatch(/json/);
        expect(response.statusCode).toBe(200);
        expect(getType(response.body)).toBe('object');

        expect(getType(response.body.latest_synced_block)).toBe('string');
    })

    test('/synced_stats: Returns synced stats.', async () => {
        const response = await request.get('/synced_stats');
        expect(response.headers['content-type']).toMatch(/json/);
        expect(response.statusCode).toBe(200);
        expect(getType(response.body)).toBe('object');
        expect(getType(response.body.updated)).toBe('boolean');
        expect(getType(response.body.synced)).toBe('boolean');
        expect(getType(response.body.latest_processed_block)).toBe('string');
        expect(getType(response.body.latest_synced_block)).toBe('string');
        expect(getType(response.body.latest_block)).toBe('string');
    })
})