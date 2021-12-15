import { getHistoryQueries } from './queries/history.mjs'
import { getStateQueries } from './queries/state.mjs'
import { getSyncStatsQueries } from './queries/sync_stats.mjs'
import { getBlockQueries } from './queries/blocks.mjs'
import { getInfoQueries } from './queries/info.mjs'
import { getTransactionQueries } from './queries/tx.mjs'

export const getQueries = (db) => {
    return {
        ...getHistoryQueries(db),
        ...getStateQueries(db),
        ...getSyncStatsQueries(db),
        ...getBlockQueries(db),
        ...getInfoQueries(db),
        ...getTransactionQueries(db)
    }
}