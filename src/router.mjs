import { getHistoryEndpoints } from './endponts/history.mjs'
import { getSyncStatsEndpoints } from './endponts/sync_stats.mjs'
import { getStateEndpoints } from './endponts/state.mjs'
import { getBlockEndpoints } from './endponts/blocks.mjs'

export const startRouter = (app, db) => {
    [
        ...getHistoryEndpoints(db),
        ...getSyncStatsEndpoints(db),
        ...getStateEndpoints(db),
        ...getBlockEndpoints(db),
    ].map(endpointInfo => {
        app[endpointInfo.type](endpointInfo.route, endpointInfo.handler)
    })
}