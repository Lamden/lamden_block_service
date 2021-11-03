export { isLst001 } from './processors/lst001.mjs'

export function makeKey(contractName, variableName, key) {
    return `${contractName}${variableName ? "."+variableName:""}${key ? ":"+key:""}`
}
