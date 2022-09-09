import mongoose from 'mongoose';

var app = new mongoose.Schema({
    key: String,
    value: mongoose.Schema.Types.Mixed
});

var blocks = new mongoose.Schema({
    hash: {
        type: String,
        unique: true,
        required: true,
        index: true
    },
    blockNum: {
        type: String,
        unique: true,
        required: true,
        index: true
    },
    blockInfo: Object,
    previousExist: {
        type: Boolean,
        required: false
    }
});

var stateChanges = new mongoose.Schema({
    blockNum: {
        type: String,
        required: true,
        index: true
    },
    hlc_timestamp: String,
    affectedContractsList: Array,
    affectedVariablesList: Array,
    affectedRootKeysList: Array,
    affectedRawKeysList: Array,
    txHash: {
        type: String,
        required: false,
        index: true
    },
    state_changes_obj: mongoose.Schema.Types.Mixed,
    txInfo: Object,
    senderVk: {
        type: String,
        required: true,
        index: true
    }
});

stateChanges.index({senderVk: 1, blockNum: 1})

var currentState = new mongoose.Schema({
    rawKey: {
        type: String,
        required: true,
        index: true
    },
    blockNum: {
        type: String,
        required: true,
        index: true
    },
    senderVk: {
        type: String,
        required: true,
        index: true
    },
    prev_blockNum: String,
    hlc_timestamp: String,
    txHash: String,
    value: mongoose.Schema.Types.Mixed,
    prev_value: mongoose.Schema.Types.Mixed,
    contractName: String,
    variableName: String,
    keys: Array,
    key: String,
    rootKey: String
});

currentState.index({contractName: 1, variableName: 1, rootKey: 1})

var contracts = new mongoose.Schema({
    contractName: {
        type: String,
        unique: true,
        required: true,
        index: true
    },
    lst001: {
        type: Boolean,
        required: true,
        index: true
    }
});

var missingBlocks = new mongoose.Schema({
    hash: {
        type: String,
        unique: true,
        required: true,
        index: true
    }
});

export default {
    App: mongoose.model('App', app, 'app'),
    StateChanges: mongoose.model('StateChanges', stateChanges, 'stateChanges'),
    CurrentState: mongoose.model('CurrentState', currentState, 'currentState'),
    Blocks: mongoose.model('Blocks', blocks, 'blocks'),
    Contracts: mongoose.model('Contracts', contracts, 'contracts'),
    MissingBlocks: mongoose.model('MissingBlocks', missingBlocks, 'missingBlocks')
};