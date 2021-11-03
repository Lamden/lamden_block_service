import * as utils from '../utils.mjs'

export const socketService = (io) => {
    function emitNewBlock(blockInfo) {
        io.emit('new-block', JSON.stringify({ message: blockInfo }));
    }

    function emitStateChange(keyInfo, value, state_changes_obj, txInfo) {
        const { contractName, variableName, rootKey } = keyInfo
        const { transaction } = txInfo
        const { payload } = transaction

        const message = {
            ...keyInfo,
            value,
            state_changes_obj: utils.cleanObj(state_changes_obj),
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
            // console.log("EMITTING NEW STATE CHANGE")
            io.to(`${contractName}.${variableName}:${rootKey}`).emit(`new-${emitName}`, JSON.stringify({
                room: `${contractName}.${variableName}:${rootKey}`,
                message
            }));
        }
    }

    function emitTxStateChanges(stateChangeInfo) {
        const { state_changes_obj, affectedContractsList, affectedVariablesList, affectedRootKeysList, txInfo, blockNum, subblockNum, timestamp, tx_uid } = stateChangeInfo
        const { transaction } = txInfo
        const { payload } = transaction

        const emitName = 'state-changes-by-transaction'

        const messageBasic = {
            tx_uid,
            txInfo,
            blockNum,
            subblockNum,
            timestamp,
            sender: payload.sender,
            contractCalled: payload.contract,
            methodCalled: payload.method,
            kwargs: payload.kwargs,
            state_changes_obj
        }

        io.to(`all-${emitName}`).emit(`new-${emitName}`, JSON.stringify({
            room: `all-${emitName}`,
            message: {...messageBasic, affectedContractsList, affectedVariablesList, affectedRootKeysList, state_changes_obj }
        }));

        for (const contractName of affectedContractsList) {
            io.to(contractName).emit(`new-${emitName}`, {
                room: contractName,
                message: {...messageBasic, contractName, state_changes_obj }
            });
        }

        for (const variableKeyString of affectedVariablesList) {
            let [contractName, variableName] = variableKeyString.split(".")
            io.to(variableKeyString).emit(`new-${emitName}`, {
                room: variableKeyString,
                message: {...messageBasic, contractName, variableName, state_changes_obj }
            });
        }

        for (const rootKeyString of affectedRootKeysList) {
            let [contractName, other] = rootKeyString.split(".")
            let [variableName, rootKey] = other.split(":")
            io.to(rootKeyString).emit(`new-${emitName}`, {
                room: rootKeyString,
                message: {...messageBasic, contractName, variableName, rootKey, state_changes_obj }
            });
        }
    }

    function emitNewContract (contractInfo) {
        io.to(`new-contracts`).emit(`new_contract`, JSON.stringify({
            room: `new-contracts`,
            message: contractInfo
        }));
    }

    return {
        emitNewBlock,
        emitStateChange,
        emitTxStateChanges,
        emitNewContract
    }
}