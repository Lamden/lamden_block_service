import mongoose from 'mongoose';

var app = new mongoose.Schema({
    key: String,
    value: mongoose.Schema.Types.Mixed
});

var blocks = new mongoose.Schema({
    hash: String,
    blockNum: {
        type: Number,
        unique: true,
        required: true,
        index: true
    },
    blockInfo: Object
});

var stateChanges = new mongoose.Schema({
    tx_uid: {
        type: String,
        required: true,
        index: true
    },
    blockNum: Number,
    subBlockNum: Number,
    txIndex: Number,
    timestamp: Number,
    affectedContractsList: Array,
    affectedVariablesList: Array,
    affectedRootKeysList: Array,
    txHash: String,
    state_changes_obj: Object,
    txInfo: Object
});

var currentState = new mongoose.Schema({
    rawKey: {
        type: String,
        required: true,
        index: true
    },
    state_change_uid: String,
    txHash: String,
    value: mongoose.Schema.Types.Mixed,
    contractName: String,
    variableName: String,
    keys: Array,
    key: String,
    rootKey: String,
    lastUpdated: Date
});

var contracts = new mongoose.Schema({
    contractName: String,
    lst001: Boolean
});

export default {
    App: mongoose.model('App', app, 'app'),
    StateChanges: mongoose.model('StateChanges', stateChanges, 'stateChanges'),
    CurrentState: mongoose.model('CurrentState', currentState, 'currentState'),
    Blocks: mongoose.model('Blocks', blocks, 'blocks'),
    Contracts: mongoose.model('Contracts', contracts, 'contracts')
};