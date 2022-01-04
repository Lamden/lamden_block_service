import util from 'util'

export { isLst001 } from './processors/lst001.mjs'

export function makeKey(contractName, variableName, key) {
    return `${contractName}${variableName ? "."+variableName:""}${key ? ":"+key:""}`
}


export function estimateTimeLeft(startTime, progress, totalBatchSize){
    let timeTaken = new Date() - startTime
    let secondsTaken =  timeTaken / 1000

    let percentageDone = progress/totalBatchSize
    let percentLeft = 1 - percentageDone
    
    let secondsLeft =  (percentLeft / percentageDone * secondsTaken)

    return `Elapsed ${secondsToString(secondsTaken).string}, Estimated time left ${secondsToString(secondsLeft).string}.`
}

export function secondsToString(seconds, fixed = 1){
    seconds = parseInt(seconds)
    let minutes = seconds > 60 ? seconds / 60 : 0
    let hours = minutes > 60 ? minutes / 60 : 0
    let days = hours > 24 ? hours / 24 : 0

    let type = `seconds`
    if (minutes) type = `minutes`
    if (hours) type = `hours`
    if (days) type = `days`

    let time = days || hours || minutes || seconds

    if (type !== "seconds") time = time.toFixed(fixed)

    return {
        time,
        type,
        string: `${time} ${type}`
    }
}

export function hydrate_state_changes_obj(stateChanges){
    return stateChanges.map(change => {
        if (typeof change.state_changes_obj === "string"){
            try{
                change = change.toObject()
                change.state_changes_obj = JSON.parse(change.state_changes_obj)
            }catch(e){
                console.log(e)
                console.log(util.inspect({change}, false, null, true))
                change.state_changes_obj = {}
            }
        }
        return change
    })
}
