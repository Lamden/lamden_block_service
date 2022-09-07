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
        const hash = "f0b137b2435e46a660cd7179538d722387c417074c378fe38515f91f470c2821"
        const response = await request.get(`/tx?hash=${hash}`);
        expect(response.headers['content-type']).toMatch(/json/);
        expect(response.statusCode).toBe(200);
        expect(getType(response.body)).toBe('object');
        expect(response.body.txHash).toBe(hash);
    })

    test('/tx: Returns Transaction Info when tx uid is provided.', async () => {
        const hlc_timestamp = "000000000001.00000.00000"
        const response = await request.get(`/tx?uid=${hlc_timestamp}`);
        expect(response.headers['content-type']).toMatch(/json/);
        expect(response.statusCode).toBe(200);
        expect(getType(response.body)).toBe('object');
        expect(response.body.hlc_timestamp).toBe(hlc_timestamp);
    })

    test('/tx: Returns Transaction Info when both tx uid and tx hash are provided.', async () => {
        // If both txhash and hlc_timestamp are provided, it will return the tx info by tx hash
        const hash = "f0b137b2435e46a660cd7179538d722387c417074c378fe38515f91f470c2821"
        const hlc_timestamp = "000000000015.00000.00000"
        const response = await request.get(`/tx?hash=${hash}&uid=${hlc_timestamp}`);
        expect(response.headers['content-type']).toMatch(/json/);
        expect(response.statusCode).toBe(200);
        expect(getType(response.body)).toBe('object');
        expect(response.body.txHash).toBe(hash);
        expect(response.body.hlc_timestamp).not.toBe(hlc_timestamp);
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