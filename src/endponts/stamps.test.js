const { createPythonSocketClient, createExpressApp } = require('../server.mjs');
const supertest = require('supertest');
const { getType } = require('jest-get-type');

const db = require('mongoose')
// Memory mongo server
require("../db_test_helper/setup.js")

let pysocket, app, request;

beforeAll(async () => {
    pysocket = createPythonSocketClient();
    app = createExpressApp(db, pysocket);
    request = supertest(app);
    await new Promise(resolve => setTimeout(resolve, 1000));
});

afterAll(async () => {
    await db.disconnect();
    await pysocket.disconnect();
});

const good_tx = {
    "metadata": {
        "signature": "542195d4a6198fde489d6d20d82701929dafd3fee3bc2f89fe2a35cea39cca8be5990f7a883fc4b0ea88325ba16e2ef37f1f01340a12a8605b059dae6eebbe00"
    },
    "payload": {
        "contract": "currency",
        "function": "transfer",
        "kwargs": {
            "amount": {
                "__fixed__": "499750"
            },
            "to": "22ca1af9e5a92653560df628a59d0127dde28b7d844eb38424c04c8da2534761"
        },
        "nonce": 0,
        "processor": "3cc7090dab1cc57df4d75be68d9f9cdbdbff639095488b68b0f90014f5cd20bc",
        "sender": "54591ae11ea57153bee599b6577c901dc521b42ad69bb18789f9d9f9002b8c54",
        "stamps_supplied": 100
    }
}

const bad_tx = {
    "metadata": {
        "signature": "fa4afe36080b5a79d9cfc8b1207df7d147f1e87e1880384b63ea417967ee1515e0ab9a471bd61d0834cb381f80780dee1eaed85e126e31a2eae732b2b5520c0a"
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
        // test('Returns estimated stamps cost.', async () => {
        //     const response = await request.post(`/stamps/estimation`)
        //         .send(good_tx)
        //         .set('Accept', 'application/json');
        //     expect(response.headers['content-type']).toMatch(/json/);
        //     expect(response.statusCode).toBe(200);
        //     expect(getType(response.body)).toBe('object');
        //     expect(response.body.stamps_used).toBeTruthy();
        //     expect(response.body.status).toBe(0);
        //     expect(response.body.transaction).toEqual(good_tx);
        // })

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

        // test('Not enough stamps supplied: Returns error if stamps_supplied is less than the real stamps cost', async () => {
        //     const tx = JSON.parse(JSON.stringify(good_tx));
        //     tx.payload.stamps_supplied = 0;
        //     const response = await request.post(`/stamps/estimation`)
        //         .send(tx)
        //         .set('Accept', 'application/json');
        //     expect(response.headers['content-type']).toMatch(/json/);
        //     expect(response.statusCode).toBe(200);
        //     expect(getType(response.body)).toBe('object');

        //     expect(response.body.result).toContain('AssertionError');
        //     expect(response.body.result).toContain('The cost has exceeded the stamp supplied!');
        //     expect(response.body.stamps_used).toBe(0);
        //     expect(response.body.status).toBe(1);
        //     expect(response.body.transaction).toEqual(tx);
        // })

    })
})