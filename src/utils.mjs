import util from 'util'
import merge from 'lodash.merge';
import BigNumber from 'bignumber.js';

export const deconstructKey = (rawKey) => {
    let contractName = rawKey.split(".")[0]
    let keys = rawKey.split(".")[1].split(":")
    let variableName = keys.shift()

    let rootKey = null
    if (keys.length > 0){
        rootKey = keys[0]
    }

    return {
        contractName,
        variableName,
        key: keys.join(":"),
        keys,
        rootKey
    }
}

function replaceSpecialChars(text) {
    text = text.split('"').join('\\"')
    text.replace(/(\r\n|\n|\r)/gm, "")
    return text
}

function replaceNewLine(text) {
    text = text.split('\n').join('\\n')
    return text
}

export const keysToObj = (keyInfo, value) => {
    let { contractName, variableName, keys } = keyInfo

    keys = keys.map(k => replaceSpecialChars(k))

    let objString = `{"${contractName}":{"${variableName}":`
    if (typeof value === 'undefined') value = null
    let objStringSuffix = `{"__hash_self__":${JSON.stringify(value)}}}}`

    //console.log(JSON.stringify(replaceSpecialChars(value)))

    for (let [i, key] of keys.entries()) {
        objString = objString + `{"${replaceNewLine(key)}":`
        objStringSuffix = objStringSuffix + '}'
    }

    let concatStr = `${objString}${objStringSuffix}`

    try {
        return JSON.parse(concatStr)
    } catch (e) {
        console.log(e)
        console.log(util.inspect({ keyInfo }, false, null, true))
        console.log(util.inspect({ keys }, false, null, true))
        console.log(util.inspect({ concatStr }, false, null, true))
        console.log(util.inspect({ objString }, false, null, true))
        console.log(util.inspect({ objStringSuffix }, false, null, true))
        console.log(util.inspect({ value }, false, null, true))
        console.log(concatStr)
    }
}

export const isObject = (obj) => {
    return Object.prototype.toString.call(obj) === '[object Object]';
};

export const cleanObj = (obj) => {
    Object.keys(obj).forEach(key => {
        //console.log(util.inspect({ key, value: obj[key] }, false, null, true))
        if (obj[key]) {
            if (Object.keys(obj[key]).length === 1 && Object.keys(obj[key]).includes("__hash_self__")) {
                obj[key] = obj[key]["__hash_self__"]
            } else {
                if (isObject(obj[key])) {
                    obj[key] = cleanObj(obj[key])
                }
            }
        }
    })
    return obj
}

export const mergeObjects = (objectList) => {
    if (Array.isArray(objectList) && objectList.length > 0) {
        return objectList.reduce((obj1, obj2) => {
            if (typeof obj1 === 'undefined') obj1 = {}
            if (typeof obj2 === 'undefined') obj2 = {}
            return merge(obj1, obj2)
        })
    } else {
        return {}
    }

}

export function make_tx_uid(blockNumber) {
    let blockPadding = "000000000000"

    let blockWithPadding = `${blockPadding.substring(0, blockPadding.length - blockNumber.toString().length)}${blockNumber}`

    return blockWithPadding
}

export function stringify(obj) {
    try {
        return JSON.stringify(obj)
    } catch (e) {
        console.log(e)
        console.log(util.inspect(obj, false, null, true))
    }
}


export function parseValue(v) {
    if (!v) return new BigNumber(0)
    try {
        if (v.__fixed__) {
            return new BigNumber(v.__fixed__)
        } else {
            return new BigNumber(v)
        }
    } catch {
        return new BigNumber(0)
    }
}