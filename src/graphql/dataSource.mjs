import { DataSource } from 'apollo-datasource'

class DataAPI extends DataSource {
    constructor(db) {
        super();
        this.queries = db.queries
    }
}

export default DataAPI