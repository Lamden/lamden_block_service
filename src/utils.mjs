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

export const keysToObj = (keyInfo, value) => {
    const { contractName, variableName, keys } = keyInfo

    let objString = `{"${contractName}":{"${variableName}":`
    let objStringSuffix = `{"__hash_self__":${JSON.stringify(value)}}}}`

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
    return objectList.reduce((obj1, obj2) => merge(obj1, obj2))
}