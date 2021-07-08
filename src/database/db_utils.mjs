export function makeKey(contractName, variableName, key) {
    return `${contractName}${variableName ? "."+variableName:""}${key ? ":"+key:""}`
}