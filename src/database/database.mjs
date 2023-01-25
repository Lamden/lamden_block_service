import { config } from 'dotenv'
config()
import mongoose_models from './mongoose.models.mjs'
import { getQueries } from './queries.mjs'
import * as dbUtils from './db_utils.mjs'
import mongoose from 'mongoose';
import { createLogger } from '../logger.mjs'

const logger = createLogger('Database');

let db = mongoose;

/******* MONGO DB CONNECTION INFO **/
const NETWORK = process.env.NETWORK || 'testnet_v2'
const DBUSER = process.env.DBUSER || null;
const DBPWD = process.env.DBPWD || null;
const DBURL = process.env.DBURL || '127.0.0.1'
const DBPORT = process.env.DBPORT || '27017'
const DBNAME = process.env.DBNAME || `${NETWORK}-blockservice`
const AUTHSOURCE = process.env.AUTHSOURCE || 'admin'

let connectionString = `mongodb://${DBURL}:${DBPORT}/${DBNAME}`;

if (DBUSER) {
    connectionString = `mongodb://${DBUSER}:${DBPWD}@${DBURL}:${DBPORT}/${DBNAME}?authSource=${AUTHSOURCE}`;
}


db.connect(
    connectionString, { useNewUrlParser: true, useUnifiedTopology: true },
    (error) => {
        if (error) {
            logger.error(error)
            throw new Error(error)
        } else {
            logger.success("DB Connection Successful.");
            db.queries = getQueries(db)
            db.models = mongoose_models
            db.utils = dbUtils
            db.config = {
                NETWORK,
                DBNAME,
                DBURL,
                DBPORT
            }
            logger.log(db.config)
        }
    }
);

export const databaseInit = async () => {
    try {
        await db.connect(connectionString, { useNewUrlParser: true, useUnifiedTopology: true })
        logger.success("DB Connection Successful.");
        db.queries = getQueries(db)
        db.models = mongoose_models
        db.utils = dbUtils
        db.config = {
            NETWORK,
            DBNAME,
            DBURL,
            DBPORT
        }
        logger.log(db.config)
    } catch (error) {
        logger.error(error)
        throw new Error(error)
    }
}
export const getDatabase = () => db