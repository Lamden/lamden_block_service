import { connect, clearDatabase, closeDatabase } from './helpers';

/**
 * Connect to a new in-memory database before running any tests.
 */
beforeAll(async () => await connect());
/**
 * Clear all test data after every test.
 */
afterAll(async () => await clearDatabase());
/**
 * Remove and close the db and server after running all tests.
 */
afterAll(async () => await closeDatabase());