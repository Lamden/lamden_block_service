import util from 'util'

export const socketService = (io) => {
    function emitNewBlock(blockInfo) {
        io.emit('new-block', JSON.stringify({ message: blockInfo }));
    }

    function emitStateChange(keyInfo, value, stateObj, txInfo) {
        const { contractName, variableName, rootKey } = keyInfo
        const { transaction } = txInfo
        const { payload } = transaction

        const message = {
            ...keyInfo,
            value,
            stateObj,
            contractCalled: payload.contract,
            methodCalled: payload.method,
            kwargs: payload.kwargs
        }

        const emitName = 'state-changes-one'

        io.to(`all-${emitName}`).emit(`new-${emitName}`, JSON.stringify({
            room: `all-${emitName}`,
            message
        }));

        io.to(contractName).emit(`new-${emitName}`, JSON.stringify({
            room: contractName,
            message
        }));

        io.to(`${contractName}.${variableName}`).emit(`new-${emitName}`, JSON.stringify({
            room: `${contractName}.${variableName}`,
            message
        }));

        if (rootKey) {
            io.to(`${contractName}.${variableName}:${rootKey}`).emit(`new-${emitName}`, JSON.stringify({
                room: `${contractName}.${variableName}:${rootKey}`,
                message
            }));
        }
    }

    function emitTxStateChanges(stateChangeInfo) {
        const { state_changes_obj, affectedContractsList, affectedVariablesList, affectedRootKeysList, txInfo, blockNum, subblockNum, timestamp } = stateChangeInfo
        const { transaction } = txInfo
        const { payload } = transaction

        const emitName = 'state-changes-by-transaction'

        const messageBasic = {
            txInfo,
            blockNum,
            subblockNum,
            timestamp,
            contractCalled: payload.contract,
            methodCalled: payload.method,
            kwargs: payload.kwargs
        }

        io.to(`all-${emitName}`).emit(`new-${emitName}`, JSON.stringify({
            room: `all-${emitName}`,
            message: {...messageBasic, affectedContractsList, affectedVariablesList, affectedRootKeysList, stateObj: state_changes_obj }
        }));

        for (const contractName of affectedContractsList) {
            io.to(contractName).emit(`new-${emitName}`, {
                room: contractName,
                message: {...messageBasic, contractName, stateObj: state_changes_obj[contractName] }
            });
        }

        for (const variableKeyString of affectedVariablesList) {
            let [contractName, variableName] = variableKeyString.split(".")
            io.to(variableKeyString).emit(`new-${emitName}`, {
                room: variableKeyString,
                message: {...messageBasic, contractName, variableName, stateObj: state_changes_obj[contractName][variableName] }
            });
        }

        for (const rootKeyString of affectedRootKeysList) {
            let [contractName, other] = rootKeyString.split(".")
            let [variableName, rootKey] = other.split(":")
            io.to(rootKeyString).emit(`new-${emitName}`, {
                room: rootKeyString,
                message: {...messageBasic, contractName, variableName, rootKey, stateObj: state_changes_obj[contractName][variableName][rootKey] }
            });
        }
    }

    return {
        emitNewBlock,
        emitStateChange,
        emitTxStateChanges
    }
}