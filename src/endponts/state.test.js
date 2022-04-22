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

describe('Test State Endpoints', () => {
    describe('/current/one/:contractName/:variableName: It should response the GET with current state value', () => {
        test('Returns current state value of variable of one contract.', async () => {
            const contractName = "con_survival_test";
            const variableName = "operator";
            const operator = "757c03fef2a1c041ea0173081e19c4e908b77b7e0bbd87f7bb06402cdc7983ae";
            const response = await request.get(`/current/one/${contractName}/${variableName}`);
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.statusCode).toBe(200);
            expect(getType(response.body)).toBe('object');

            expect(response.body.notFound).toBeFalsy();
            expect(response.body.value).toBe(operator);
        })

        test('Returns nothing if contract is not existing.', async () => {
            const contractName = "contractNotExist";
            const variableName = "operator";
            const response = await request.get(`/current/one/${contractName}/${variableName}`);
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.statusCode).toBe(200);
            expect(getType(response.body)).toBe('object');

            expect(response.body.notFound).toBeTruthy();
        })

        test('Returns nothing if variable is not existing.', async () => {
            const contractName = "con_survival_test";
            const variableName = "variableNotExist";
            const response = await request.get(`/current/one/${contractName}/${variableName}`);
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.statusCode).toBe(200);
            expect(getType(response.body)).toBe('object');

            expect(response.body.notFound).toBeTruthy();
        })
    })

    describe('/current/one/:contractName/:variableName/:key: It should response the GET with contract detail by contract name', () => {

        test('Returns current state value of key of variable of one contract.', async () => {
            const contractName = "con_survival_test";
            const variableName = "game";
            const key = "boss_enabled";
            const response = await request.get(`/current/one/${contractName}/${variableName}/${key}`);
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.statusCode).toBe(200);
            expect(getType(response.body)).toBe('object');

            expect(response.body.notFound).toBeFalsy();
            expect(response.body.value).toBe(false);
        })

        test('Returns nothing if contract is not existing.', async () => {
            const contractName = "contractNotExist";
            const variableName = "game";
            const key = "boss_enabled";
            const response = await request.get(`/current/one/${contractName}/${variableName}/${key}`);
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.statusCode).toBe(200);
            expect(getType(response.body)).toBe('object');

            expect(response.body.notFound).toBeTruthy();
        })

        test('Returns nothing if variable is not existing.', async () => {
            const contractName = "con_survival_test";
            const variableName = "variableNotExist";
            const key = "boss_enabled";
            const response = await request.get(`/current/one/${contractName}/${variableName}/${key}`);
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.statusCode).toBe(200);
            expect(getType(response.body)).toBe('object');

            expect(response.body.notFound).toBeTruthy();
        })

        test('Returns nothing if key is not existing.', async () => {
            const contractName = "con_survival_test";
            const variableName = "variableNotExist";
            const key = "keyNotFound";
            const response = await request.get(`/current/one/${contractName}/${variableName}/${key}`);
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.statusCode).toBe(200);
            expect(getType(response.body)).toBe('object');

            expect(response.body.notFound).toBeTruthy();
        })
    })

    describe('/current/all/:contractName: It should response the GET with all states of contract.', () => {

        test('Returns all states of one contract.', async () => {
            const contractName = 'con_survival_test';
            const operator = '757c03fef2a1c041ea0173081e19c4e908b77b7e0bbd87f7bb06402cdc7983ae';
            const response = await request.get(`/current/all/${contractName}`);
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.statusCode).toBe(200);
            expect(getType(response.body)).toBe('object');

            const item = response.body[contractName];
            expect(getType(item)).toBe('object');
            expect(item.operator).toBe(operator);
        })
    })

    describe('/current/all/:contractName/:variableName: It should response the GET with all states of variable of one contract.', () => {

        test('Returns nothing if contractName is not existing.', async () => {
            const contractName = 'contractNotExist';
            const variableName = 'game';
            const response = await request.get(`/current/all/${contractName}/${variableName}`);
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.statusCode).toBe(200);
            expect(response.body).toEqual({});
        })

        test('Returns nothing if variableName is not existing.', async () => {
            const contractName = 'con_survival_test';
            const variableName = 'variableNotExist';
            const response = await request.get(`/current/all/${contractName}/${variableName}`);
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.statusCode).toBe(200);
            expect(response.body).toEqual({});
        })

        test('Returns all states of variable of one contract.', async () => {
            const contractName = 'con_survival_test';
            const variableName = 'game';
            const operator = '757c03fef2a1c041ea0173081e19c4e908b77b7e0bbd87f7bb06402cdc7983ae';
            const response = await request.get(`/current/all/${contractName}/${variableName}`);
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.statusCode).toBe(200);
            expect(getType(response.body)).toBe('object');

            const item = response.body[contractName];
            expect(getType(item)).toBe('object');
            expect(getType(item.game)).toBe('object');
            expect(item.game[operator]).toBeTruthy();
        })
    })

    describe('/current/all/:contractName/:variableName/:rootkey: It should response the GET with all states of rootkey of variable of one contract.', () => {

        test('Returns nothing if contractName is not existing.', async () => {
            const contractName = 'contractNotExist';
            const variableName = 'game';
            const rootkey = 'boss_enabled';
            const response = await request.get(`/current/all/${contractName}/${variableName}/${rootkey}`);
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.statusCode).toBe(200);
            expect(response.body).toEqual({});
        })

        test('Returns nothing if variableName is not existing.', async () => {
            const contractName = 'con_survival_test';
            const variableName = 'variableNotExist';
            const rootkey = 'boss_enabled';
            const response = await request.get(`/current/all/${contractName}/${variableName}/${rootkey}`);
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.statusCode).toBe(200);
            expect(response.body).toEqual({});
        })

        test('Returns all states of variable of one contract.', async () => {
            const contractName = 'con_survival_test';
            const variableName = 'game';
            const rootkey = 'keyNotExist';
            const response = await request.get(`/current/all/${contractName}/${variableName}/${rootkey}`);
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.statusCode).toBe(200);
            expect(response.body).toEqual({});
        })

        test('Returns all states of key.', async () => {
            const contractName = 'con_survival_test';
            const variableName = 'game';
            const rootkey = 'boss_enabled';
            const operator = '757c03fef2a1c041ea0173081e19c4e908b77b7e0bbd87f7bb06402cdc7983ae';
            const response = await request.get(`/current/all/${contractName}/${variableName}/${rootkey}`);
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.statusCode).toBe(200);
            expect(getType(response.body)).toBe('object');

            const item = response.body[contractName];
            expect(getType(item)).toBe('object');
            expect(getType(item.game)).toBe('object');
            expect(item.game[rootkey]).toBeFalsy();
        })
    })
})