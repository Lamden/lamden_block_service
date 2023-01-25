const { createPythonSocketClient, createExpressApp } = require('../server.mjs');
const supertest = require('supertest');
const { getType } = require('jest-get-type');

const db = require('mongoose')
// Memory mongo server
require("../db_test_helper/setup.js")

let pysocket, app, request;

beforeAll(async () => {
    pysocket = createPythonSocketClient();
    app = await createExpressApp(db, pysocket);
    request = supertest(app);
    await new Promise(resolve => setTimeout(resolve, 1000));
});

afterAll(async () => {
    await pysocket.disconnect();
});

describe('Test Nodes Endpoints', () => {
    describe('/nodes: It should response the GET with all nodes statics info', () => {
        test('Returns all nodes statics info', async () => {
            const response = await request.get(`/nodes`);
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.statusCode).toBe(200);
            expect(getType(response.body)).toBe('array');
        })
    })

    describe('/nodes/:vk: It should response the GET with one node statics info by vk', () => {
        test('Returns node info by vk', async () => {
            let vk = "92e45fb91c8f76fbfdc1ff2a58c2e901f3f56ec38d2f10f94ac52fcfa56fce2e"
            const response = await request.get(`/nodes/${vk}`);
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.statusCode).toBe(200);
            expect(getType(response.body)).toBe('object');
            expect(response.body.vk).toBe("92e45fb91c8f76fbfdc1ff2a58c2e901f3f56ec38d2f10f94ac52fcfa56fce2e");
            expect(response.body.txs_received).toBeTruthy();
            expect(response.body.used_in_consensus).toBeTruthy();
        })
    })

    describe('/rewards', () => {
        test('/rewards: Returns a list of the top rewards', async () => {
            const response = await request.get(`/rewards`);
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.statusCode).toBe(200);
            expect(getType(response.body)).toBe('array');
            expect(getType(response.body[0].recipient)).toBe('string');
            expect(getType(response.body[0].type)).toBe('string');
            expect(getType(response.body[0].amount)).toBe('string');
            expect(getType(response.body[0].order)).toBe('number');
        })
        test('/rewards?recipient=vk: Returns the specific rewards for a recipient', async () => {
            let vk = "92e45fb91c8f76fbfdc1ff2a58c2e901f3f56ec38d2f10f94ac52fcfa56fce2e"
            const response = await request.get(`/rewards?recipient=${vk}`);
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.statusCode).toBe(200);
            expect(getType(response.body)).toBe('array');
            expect(response.body[0].recipient).toBe(vk);
            expect(getType(response.body[0].amount)).toBe('string');
        })

        test('/rewards/masternodes: Gives just a list of nodes rewards', async () => {
            const response = await request.get(`/rewards/masternodes`);
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.statusCode).toBe(200);
            expect(getType(response.body)).toBe('array');
            expect(getType(response.body[0].recipient)).toBe('string');
            expect(getType(response.body[0].type)).toBe('string');
            expect(getType(response.body[0].amount)).toBe('string');
        })

        test('/rewards/developer: Gives just a list of developer rewards', async () => {
            const response = await request.get(`/rewards/developer`);
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.statusCode).toBe(200);
            expect(getType(response.body)).toBe('array');
            expect(getType(response.body[0].recipient)).toBe('string');
            expect(getType(response.body[0].type)).toBe('string');
            expect(getType(response.body[0].amount)).toBe('string');
        })

        test('/rewards/developer/:contract: Gives the total amount earned by a contract', async () => {
            const response = await request.get(`/rewards/developer/currency`);
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.statusCode).toBe(200);
            expect(getType(response.body)).toBe('object');
            expect(response.body.contract).toBe("currency");
            expect(getType(response.body.amount)).toBe('string');
        })

        test('/rewards/foundation: Gives just a list of foundation rewards', async () => {
            const response = await request.get(`/rewards/foundation`);
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.statusCode).toBe(200);
            expect(getType(response.body)).toBe('array');
            expect(getType(response.body[0].recipient)).toBe('string');
            expect(getType(response.body[0].type)).toBe('string');
            expect(getType(response.body[0].amount)).toBe('string');
        })

        test('/rewards/burn: Returns the total amount burned', async () => {
            const response = await request.get(`/rewards/burn`);
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.statusCode).toBe(200);
            expect(getType(response.body)).toBe('object');
            expect(getType(response.body.amount)).toBe('string');
        })

        test('/rewards/total: Returns the total rewards amount', async () => {
            const response = await request.get(`/rewards/total`);
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.statusCode).toBe(200);
            expect(getType(response.body)).toBe('object');
            expect(getType(response.body.amount)).toBe('string');
        })

        test('/rewards/total?recipient=92e45fb91c8f76fbfdc1ff2a58c2e901f3f56ec38d2f10f94ac52fcfa56fce2e: Returns the total rewards amount by recipient', async () => {
            let vk = "92e45fb91c8f76fbfdc1ff2a58c2e901f3f56ec38d2f10f94ac52fcfa56fce2e"
            const response = await request.get(`/rewards/total?recipient=${vk}`);
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.statusCode).toBe(200);
            expect(getType(response.body)).toBe('object');
            expect(response.body.recipient).toBe(vk);
            expect(getType(response.body.amount)).toBe('string');
        })

        test('/rewards/total?start=1662667407679: Returns the total rewards amount by start time', async () => {
            const response = await request.get(`/rewards/total?start=1662667407679`);
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.statusCode).toBe(200);
            expect(getType(response.body)).toBe('object');
            expect(getType(response.body.amount)).toBe('string');
        })

        test('/rewards/total?start=999999999999999999: Returns nothing if start time is too big', async () => {
            const response = await request.get(`/rewards/total?start=999999999999999999`);
            expect(response.statusCode).toBe(200);
            expect(response.body).toEqual({});
        })

        test('/rewards/total?end=1662667406139: Returns the total rewards amount by end time', async () => {
            const response = await request.get(`/rewards/total?end=1662667406139`);
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.statusCode).toBe(200);
            expect(getType(response.body)).toBe('object');
            expect(getType(response.body.amount)).toBe('string');
        })

        test('/rewards/total?end=-1: Returns nothing if end time is too small', async () => {
            const response = await request.get(`/rewards/total?end=-1`);
            expect(response.statusCode).toBe(200);
            expect(response.body).toEqual({});
        })

        test('/rewards/total?start=1662667406139&end=1662667407679: Returns the total rewards amount by start time and end time', async () => {
            const response = await request.get(`/rewards/total?start=1662667406139&end=1662667407679`);
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.statusCode).toBe(200);
            expect(getType(response.body)).toBe('object');
            expect(getType(response.body.amount)).toBe('string');
        })

        test('/rewards/total?start=1662667407679&end=1662667406139: Returns nothing if start time is lager than end time', async () => {
            const response = await request.get(`/rewards/total?start=1662667407679&end=1662667406139`);
            expect(response.statusCode).toBe(200);
            expect(response.body).toEqual({});
        })

        test('/rewards/total?start=1662667406139&end=1662667407679: Returns the total rewards amount by start time and end time and recipient', async () => {
            let vk = "92e45fb91c8f76fbfdc1ff2a58c2e901f3f56ec38d2f10f94ac52fcfa56fce2e"
            const response = await request.get(`/rewards/total?start=1662667406139&end=1662667407679&recipient=${vk}`);
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.statusCode).toBe(200);
            expect(getType(response.body)).toBe('object');
            expect(getType(response.body.amount)).toBe('string');
            expect(response.body.recipient).toBe(vk);
        })


        test('/rewards/lastdays?days=7: Returns the rewards by last N days', async () => {
            const response = await request.get(`/rewards/lastdays?days=7`);
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.statusCode).toBe(200);
            expect(getType(response.body)).toBe('array');
        })

    })
})

