import util from 'util'
import merge from 'lodash.merge';

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
        console.log(util.inspect({keyInfo}, false, null, true))
        console.log(util.inspect({keys}, false, null, true))
        console.log(util.inspect({concatStr}, false, null, true))
        console.log(util.inspect({objString}, false, null, true))
        console.log(util.inspect({objStringSuffix}, false, null, true))
        console.log(util.inspect({value}, false, null, true))
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
    return objectList.reduce((obj1, obj2) => {
        if (typeof obj1 === 'undefined') obj1 = {}
        if (typeof obj2 === 'undefined') obj2 = {}
        return merge(obj1, obj2)
    })
}

export function make_tx_uid (blockNumber, subBlockNum, tx_index){
    let blockPadding = "000000000000"
    let regPadding = "00000"

    let blockWithPadding = `${blockPadding.substring(0, blockPadding.length - blockNumber.toString().length)}${blockNumber}`
    let subBlockWithPadding = `${regPadding.substring(0, regPadding.length - subBlockNum.toString().length)}${subBlockNum}`
    let txIndexPadding = `${regPadding.substring(0, regPadding.length - tx_index.toString().length)}${tx_index}`

    return `${blockWithPadding}.${subBlockWithPadding}.${txIndexPadding}`
}

export function stringify(obj){
    try{
        return JSON.stringify(obj)
    }catch(e){
        console.log(e)
        console.log(util.inspect(obj, false, null, true))
    }
}