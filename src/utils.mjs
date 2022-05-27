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
    return objectList.reduce((obj1, obj2) => {
        if (typeof obj1 === 'undefined') obj1 = {}
        if (typeof obj2 === 'undefined') obj2 = {}
        return merge(obj1, obj2)
    })
}

export function make_tx_uid(blockNumber, subBlockNum, tx_index) {
    let blockPadding = "000000000000"
    let regPadding = "00000"

    let blockWithPadding = `${blockPadding.substring(0, blockPadding.length - blockNumber.toString().length)}${blockNumber}`
    let subBlockWithPadding = `${regPadding.substring(0, regPadding.length - subBlockNum.toString().length)}${subBlockNum}`
    let txIndexPadding = `${regPadding.substring(0, regPadding.length - tx_index.toString().length)}${tx_index}`

    return `${blockWithPadding}.${subBlockWithPadding}.${txIndexPadding}`
}

export function stringify(obj) {
    try {
        return JSON.stringify(obj)
    } catch (e) {
        console.log(e)
        console.log(util.inspect(obj, false, null, true))
    }
}

export const isMalformedBlock = (blockInfo) => {
    const validateValue = (value, name) => {
        if (isNaN(parseInt(value))) throw new Error(`'${name}' has malformed value ${JSON.stringify(value)}`)
    }

    const { number, subblocks } = blockInfo
    try {
        validateValue(number, 'number')
        if (Array.isArray(subblocks)) {
            for (let sb of subblocks) {
                const { transactions, subblock } = sb

                validateValue(subblock, 'subblock')
                if (Array.isArray(transactions)) {
                    for (let tx of transactions) {
                        const { stamps_used, status, transaction } = tx
                        const { metadata, payload } = transaction
                        const { timestamp } = metadata
                        const { nonce, stamps_supplied } = payload
                        validateValue(stamps_used, 'stamps_used')
                        validateValue(status, 'status')
                        validateValue(timestamp, 'timestamp')
                        validateValue(nonce, 'nonce')
                        validateValue(stamps_supplied, 'stamps_supplied')
                    }
                }
            }
        }
    } catch (e) {
        console.error({ "Malformed Block": e })
        return true
    }
    return false
}

// repair MalformedBlock. ex: {__fix__: 100} => 100
export const repairMalformedBlock = (blockInfo) => {
    const getValue = (value) => {
        if (!value && value != 0) return null;
        if (value.__fixed__) return parseInt(value.__fixed__)
        return value
    }

    try {
        const { number, subblocks } = blockInfo
        blockInfo.number = getValue(number)
        if (Array.isArray(subblocks)) {
            let i = 0
            for (let sb of subblocks) {
                const { transactions, subblock } = sb
                blockInfo.subblocks[i].subblock = getValue(subblock)
                if (Array.isArray(transactions)) {
                    let j = 0
                    for (let tx of transactions) {
                        const { stamps_used, status, transaction } = tx
                        const { metadata, payload } = transaction
                        const { timestamp } = metadata
                        const { nonce, stamps_supplied } = payload
                        blockInfo.subblocks[i]['transactions'][j]['stamps_used'] = getValue(stamps_used)
                        blockInfo.subblocks[i]['transactions'][j]['status'] = getValue(status)
                        blockInfo.subblocks[i]['transactions'][j]['transaction']['metadata']['timestamp'] = getValue(timestamp)
                        blockInfo.subblocks[i]['transactions'][j]['transaction']['payload']['nonce'] = getValue(nonce)
                        blockInfo.subblocks[i]['transactions'][j]['transaction']['payload']['stamps_supplied'] = getValue(stamps_supplied)
                        j++
                    }
                }
                i++
            }
        }
        return blockInfo
    } catch (e) {
        console.log(e)
        return null
    }
}
