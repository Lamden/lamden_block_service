export function makeKey(contractName, variableName, key) {
    return `${contractName}.${variableName}:${key}`
}