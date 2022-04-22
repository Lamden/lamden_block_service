import signale from "signale"

const option = {
    logLevel: process.env.LOG_LEVEL | 'info'
}
const sg = new signale.Signale(option)

/**
 * 
 * @param {string[]} scope 
 * @returns 
 */
export const createLogger = (scope) => {
    return sg.scope(scope)
}
