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

const good_tx = {
    "metadata": {
        "signature": "fa4afe36080b5a79d9cfc8b1207df7d147f1e87e1880384b63ea417967ee1515e0ab9a471bd61d0834cb381f80780dee1eaed85e126e31a2eae732b2b5520c0a",
        "timestamp": 1601498663
    },
    "payload": {
        "contract": "currency",
        "function": "transfer",
        "kwargs": {
            "amount": { "__fixed__": "10.5" },
            "to": "183533f55e67a1a6e0c3d13ef3a69f4b1b1bcf7c64ef4e0cef6fbf4b6e0eaf95"
        },
        "nonce": 32,
        "processor": "89f67bb871351a1629d66676e4bd92bbacb23bd0649b890542ef98f1b664a497",
        "sender": "f16c130ceb7ed9bcebde301488cfd507717d5d511674bc269c39ad41fc15d780",
        "stamps_supplied": 40
    }
}

const bad_tx = {
    "metadata": {
        "signature": "fa4afe36080b5a79d9cfc8b1207df7d147f1e87e1880384b63ea417967ee1515e0ab9a471bd61d0834cb381f80780dee1eaed85e126e31a2eae732b2b5520c0a",
        "timestamp": 1601498663
    },
    "payload": {
        "contract": "currency",
        "function": "transfer",
        "kwargs": {
            "amount": { "__fixed__": "101111111111111111.5" },
            "to": "183533f55e67a1a6e0c3d13ef3a69f4b1b1bcf7c64ef4e0cef6fbf4b6e0eaf95"
        },
        "nonce": 32,
        "processor": "89f67bb871351a1629d66676e4bd92bbacb23bd0649b890542ef98f1b664a497",
        "sender": "f16c130ceb7ed9bcebde301488cfd507717d5d511674bc269c39ad41fc15d780",
        "stamps_supplied": 40
    }
}

describe('Test Stamps Endpoints', () => {
    describe('/stamps/estimation:', () => {
        test('Returns estimated stamps cost.', async () => {
            const response = await request.post(`/stamps/estimation`)
                .send(good_tx)
                .set('Accept', 'application/json');
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.statusCode).toBe(200);
            expect(getType(response.body)).toBe('object');
            expect(response.body.stamps_used).toBeTruthy();
            expect(response.body.status).toBe(0);
            expect(response.body.transaction).toEqual(good_tx);
        })

        test('AssertionError: Returns error if bad tx is provided.', async () => {
            const response = await request.post(`/stamps/estimation`)
                .send(bad_tx)
                .set('Accept', 'application/json');
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.statusCode).toBe(200);
            expect(getType(response.body)).toBe('object');
            expect(response.body.result).toContain('AssertionError');
            expect(response.body.stamps_used).toBeTruthy();
            expect(response.body.status).toBe(1);
            expect(response.body.transaction).toEqual(bad_tx);
        })

        test('ModuleNotFoundError: Returns error if bad tx is provided.', async () => {
            const tx = JSON.parse(JSON.stringify(good_tx));
            tx.payload.contract = 'not_exist';
            const response = await request.post(`/stamps/estimation`)
                .send(tx)
                .set('Accept', 'application/json');
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.statusCode).toBe(200);
            expect(getType(response.body)).toBe('object');
            expect(response.body.result).toContain('ModuleNotFoundError');
            expect(response.body.stamps_used).toBeTruthy();
            expect(response.body.status).toBe(1);
            expect(response.body.transaction).toEqual(tx);
        })

        test('Not enough stamps supplied: Returns error if stamps_supplied is less than the real stamps cost', async () => {
            const tx = JSON.parse(JSON.stringify(good_tx));
            tx.payload.stamps_supplied = 0;
            const response = await request.post(`/stamps/estimation`)
                .send(tx)
                .set('Accept', 'application/json');
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.statusCode).toBe(200);
            expect(getType(response.body)).toBe('object');

            expect(response.body.result).toContain('AssertionError');
            expect(response.body.result).toContain('The cost has exceeded the stamp supplied!');
            expect(response.body.stamps_used).toBe(0);
            expect(response.body.status).toBe(1);
            expect(response.body.transaction).toEqual(tx);
        })
    })
})