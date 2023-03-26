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
        const { state_changes_obj, affectedContractsList, affectedVariablesList, affectedRootKeysList, affectedRawKeysList, txInfo, blockNum, hlc_timestamp, rewards } = stateChangeInfo
        const { transaction } = txInfo
        const { payload } = transaction
        const hash = txInfo['hash']

        const emitName = 'state-changes-by-transaction'

        const messageBasic = {
            hlc_timestamp,
            txInfo,
            blockNum,
            sender: payload.sender,
            contractCalled: payload.contract,
            methodCalled: payload.method,
            kwargs: payload.kwargs,
            state_changes_obj,
            rewards
        }

        io.to(`all-${emitName}`).emit(`new-${emitName}`, JSON.stringify({
            room: `all-${emitName}`,
            message: { ...messageBasic, affectedContractsList, affectedVariablesList, affectedRootKeysList, affectedRawKeysList, state_changes_obj }
        }));

        io.to(hash).emit(`new-${emitName}`, JSON.stringify({
            room: hash,
            message: { ...messageBasic, affectedContractsList, affectedVariablesList, affectedRootKeysList, affectedRawKeysList, state_changes_obj }
        }))

        for (const contractName of affectedContractsList) {
            io.to(contractName).emit(`new-${emitName}`, {
                room: contractName,
                message: { ...messageBasic, contractName, state_changes_obj }
            });
        }

        for (const variableKeyString of affectedVariablesList) {
            let [contractName, variableName] = variableKeyString.split(".")
            io.to(variableKeyString).emit(`new-${emitName}`, {
                room: variableKeyString,
                message: { ...messageBasic, contractName, variableName, state_changes_obj }
            });
        }

        for (const rootKeyString of affectedRootKeysList) {
            let [contractName, other] = rootKeyString.split(".")
            let [variableName, rootKey] = other.split(":")
            io.to(rootKeyString).emit(`new-${emitName}`, {
                room: rootKeyString,
                message: { ...messageBasic, contractName, variableName, rootKey, state_changes_obj }
            });
        }
    }

    function emitNewContract(contractInfo) {
        io.to(`new-contracts`).emit(`new_contract`, JSON.stringify({
            room: `new-contracts`,
            message: contractInfo
        }));
    }

    function emitTotalRewards(amount) {
        io.to(`rewards`).emit(`total_rewards`, JSON.stringify({
            message: {amount},
        }));
    }

    function emitNewReward(rewardInfo) {
        io.to(`rewards`).emit(`new_reward`, JSON.stringify({
            room: `new-rewards`,
            message: rewardInfo,
        }));

        // recipient room
        io.to(`rewards-${rewardInfo.recipient}`).emit(`new_reward`, JSON.stringify({
            room: rewardInfo.recipient,
            message: rewardInfo,
        }));

        // type room
        io.to(`rewards-${rewardInfo.type}`).emit(`new_reward`, JSON.stringify({
            room: rewardInfo.type,
            message: rewardInfo,
        }));
    }

    return {
        emitNewBlock,
        emitStateChange,
        emitTxStateChanges,
        emitNewContract,
        emitNewReward,
        emitTotalRewards
    }
}