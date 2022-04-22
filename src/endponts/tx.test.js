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

describe('Test Tx Endpoints', () => {
    test('/tx: Returns Transaction Info when tx hash is provided.', async () => {
        const hash = "df9c0af0b607c3a94a5c597d597594a4ae3e8636af74a5b0e62964a36e4dccd4"
        const response = await request.get(`/tx?hash=${hash}`);
        expect(response.headers['content-type']).toMatch(/json/);
        expect(response.statusCode).toBe(200);
        expect(getType(response.body)).toBe('object');
        expect(response.body.txHash).toBe(hash);
    })

    test('/tx: Returns Transaction Info when tx uid is provided.', async () => {
        const tx_uid = "000000065445.00000.00000"
        const response = await request.get(`/tx?uid=${tx_uid}`);
        expect(response.headers['content-type']).toMatch(/json/);
        expect(response.statusCode).toBe(200);
        expect(getType(response.body)).toBe('object');
        expect(response.body.tx_uid).toBe(tx_uid);
    })

    test('/tx: Returns Transaction Info when both tx uid and tx hash are provided.', async () => {
        // If both txhash and tx_uid are provided, it will return the tx info by tx hash
        const hash = "df9c0af0b607c3a94a5c597d597594a4ae3e8636af74a5b0e62964a36e4dccd4"
        const tx_uid = "000000000015.00000.00000"
        const response = await request.get(`/tx?hash=${hash}&uid=${tx_uid}`);
        expect(response.headers['content-type']).toMatch(/json/);
        expect(response.statusCode).toBe(200);
        expect(getType(response.body)).toBe('object');
        expect(response.body.txHash).toBe(hash);
        expect(response.body.tx_uid).not.toBe(tx_uid);
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