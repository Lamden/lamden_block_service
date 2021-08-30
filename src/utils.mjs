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

export const keysToObj = (keyInfo, value) => {
    let { contractName, variableName, keys } = keyInfo

    keys = keys.map(k => replaceSpecialChars(k))

    let objString = `{"${contractName}":{"${variableName}":`
    let objStringSuffix = `{"__hash_self__":${JSON.stringify(value)}}}}`

    for (let [i, key] of keys.entries()) {
        objString = objString + `{"${key}":`
        objStringSuffix = objStringSuffix + '}'
    }

    let concatStr = `${objString}${objStringSuffix}`

    try {
        return JSON.parse(concatStr)
    } catch (e) {
        console.log(e)
        console.log(concatStr)
    }
}

export const isObject = (obj) => {
    return Object.prototype.toString.call(obj) === '[object Object]';
};

export const cleanObj = (obj) => {
    //console.log(util.inspect(obj, false, null, true))
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
    console.log(util.inspect(objectList, false, null, true))
    return objectList.reduce((obj1, obj2) => {
        console.log(util.inspect({obj1, obj2}, false, null, true))
        return merge(obj1, obj2)
    })
}

let jeff = {
    "con_lamden_poo": {
        "balances": {
            "6656a5c9dcf37f7eadc2b7d8de1998bb5bc4d69244ce75642dd57274feae93db": {
                "con_rocketswap_official_v1_1": {
                    "__hash_self__": {
                        "__fixed__": "18007686911.0"
                    }
                }
            }
        }
    }
}