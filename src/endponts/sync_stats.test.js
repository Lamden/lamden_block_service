const { createPythonSocketClient, createExpressApp } = require('../server.mjs');
const { getDatabase } = require('../database/database.mjs');
const supertest = require('supertest');
const { getType } = require('jest-get-type');

let db, pysocket, app, request;

beforeAll(async () => {
    db = await getDatabase();
    pysocket = createPythonSocketClient();
    app = createExpressApp(db, pysocket);
    request = supertest(app);
});

afterAll(async () => {
    await db.disconnect();
    await pysocket.disconnect();
});

describe('Test Sync Stats Endpoints', () => {
    test('/latest_block: Returns newest block number.', async () => {
        const response = await request.get('/latest_block');
        expect(response.headers['content-type']).toMatch(/json/);
        expect(response.statusCode).toBe(200);
        expect(getType(response.body)).toBe('object');

        expect(getType(response.body.latest_block)).toBe('number');
    })

    test('/latest_processed_block: Returns latest processed block number.', async () => {
        const response = await request.get('/latest_processed_block');
        expect(response.headers['content-type']).toMatch(/json/);
        expect(response.statusCode).toBe(200);
        expect(getType(response.body)).toBe('object');

        expect(getType(response.body.latest_processed_block)).toBe('number');
    })

    test('/latest_synced_block: Returns latest synced block number.', async () => {
        const response = await request.get('/latest_synced_block');
        expect(response.headers['content-type']).toMatch(/json/);
        expect(response.statusCode).toBe(200);
        expect(getType(response.body)).toBe('object');

        expect(getType(response.body.latest_synced_block)).toBe('number');
    })

    test('/synced_stats: Returns synced stats.', async () => {
        const response = await request.get('/synced_stats');
        expect(response.headers['content-type']).toMatch(/json/);
        expect(response.statusCode).toBe(200);
        expect(getType(response.body)).toBe('object');
        expect(getType(response.body.updated)).toBe('boolean');
        expect(getType(response.body.synced)).toBe('boolean');
        expect(getType(response.body.latest_processed_block)).toBe('number');
        expect(getType(response.body.latest_synced_block)).toBe('number');
        expect(getType(response.body.latest_block)).toBe('number');
    })
})