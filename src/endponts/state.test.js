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

describe('Test State Endpoints', () => {
    describe('/current/one/:contractName/:variableName: It should response the GET with current state value', () => {
        test('Returns current state value of variable of one contract.', async () => {
            const contractName = "stamp_cost";
            const variableName = "__developer__";
            const developer = "sys";
            const response = await request.get(`/current/one/${contractName}/${variableName}`);
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.statusCode).toBe(200);
            expect(getType(response.body)).toBe('object');

            expect(response.body.notFound).toBeFalsy();
            expect(response.body.value).toBe(developer);
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
            const contractName = "stamp_cost";
            const variableName = "S";
            const key = "current_total";
            const response = await request.get(`/current/one/${contractName}/${variableName}/${key}`);
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.statusCode).toBe(200);
            expect(getType(response.body)).toBe('object');

            expect(response.body.notFound).toBeFalsy();
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
            const contractName = 'stamp_cost';
            const developer = 'sys';
            const response = await request.get(`/current/all/${contractName}`);
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.statusCode).toBe(200);
            expect(getType(response.body)).toBe('object');

            const item = response.body[contractName];
            expect(getType(item)).toBe('object');
            expect(item.__developer__).toBe(developer);
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
            const contractName = 'stamp_cost';
            const variableName = 'S';
            const response = await request.get(`/current/all/${contractName}/${variableName}`);
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.statusCode).toBe(200);
            expect(getType(response.body)).toBe('object');

            const item = response.body[contractName];
            expect(getType(item)).toBe('object');
            expect(getType(item.S)).toBe('object');
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
            const contractName = 'stamp_cost';
            const variableName = 'S';
            const rootkey = 'current_total';
            const response = await request.get(`/current/all/${contractName}/${variableName}/${rootkey}`);
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.statusCode).toBe(200);
            expect(getType(response.body)).toBe('object');

            const item = response.body[contractName];
            expect(getType(item)).toBe('object');
            expect(getType(item.S)).toBe('object');
            expect(getType(item.S[rootkey])).toBe('number');
        })
    })
})