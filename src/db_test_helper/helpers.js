import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose_models from '../database/mongoose.models.mjs'
import { getQueries } from '../database/queries.mjs'
import * as dbUtils from '../database/db_utils.mjs'
import mongoose from 'mongoose'
import restore from '@ai-lion/mongodb-restore'
import path from 'path'

let mongod

/**
 * connect to the in-memory database
 */
export const connect = async () => {
    mongod = await MongoMemoryServer.create();
    const dbname = 'test'
    const uri = mongod.getUri(dbname);

    const mongooseOpts = {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    };

    await mongoose.connect(uri, mongooseOpts);
    mongoose.queries = getQueries(mongoose)
    mongoose.models = mongoose_models
    mongoose.utils = dbUtils

    await restore.database({
        uri,
        database: dbname,
        from: path.resolve(__dirname, '../../mongo_dump/'),
        onCollectionExists: 'overwrite'
    });
};
/**
 * Drop database,  close the connection and stop mongod.
 */
export const closeDatabase = async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongod.stop();
};
/**
 * Remove all the data for all db collections.
 */
export const clearDatabase = async () => {
    const collections = mongoose.connection.collections;

    for (const key in collections) {
        const collection = collections[key];
        await collection.deleteMany({});
    }
};