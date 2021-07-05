export const deconstructKey = (rawKey) => {
    let contractName = rawKey.split(".")[0]
    let keys = rawKey.split(".")[1].split(":")
    let variableName = keys.shift()

    return {
        contractName,
        variableName,
        key: keys.join(":"),
        keys,
        rootKey: keys[0]
    }
}

export const keysToObj = (keyInfo, value) => {
    const { contractName, variableName, keys } = keyInfo

    let objString = `{"${contractName}":{"${variableName}":`
    let objStringSuffix = `${JSON.stringify(value)}}}`

    for (let [i, key] of keys.entries()) {
        objString = objString + `{"${key}":`
        objStringSuffix = objStringSuffix + '}'
    }

    try {
        return JSON.parse(objString + objStringSuffix)
    } catch (e) {
        console.log(e)
        console.log(objString + objStringSuffix)
    }
}