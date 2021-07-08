import { getHistoryQueries } from './queries/history.mjs'
import { getStateQueries } from './queries/state.mjs'
import { getSyncStatsQueries } from './queries/sync_stats.mjs'

export const getQueries = (db) => {
    return {
        ...getHistoryQueries(db),
        ...getStateQueries(db),
        ...getSyncStatsQueries(db)
    }
}