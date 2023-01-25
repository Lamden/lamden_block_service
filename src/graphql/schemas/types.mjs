const typeDefs = `#graphql
    # type define
    scalar JSON
    scalar JSONObject

    scalar LamdenValue 

    # blocks 
    type State {
        key: String!,
        value: LamdenValue,
    }

    type BlockProof {
        signature: String!,
        signer: String!
    }

    type Reward{
        key: String!,
        value: LamdenValue!,
        reward: LamdenValue!
    }

    type Metadata {
        signature: String!
    }

    type Payload {
        contract: String!,
        function: String!,
        kwargs: JSON,
        nonce: Int!,
        processor: String!,
        sender: String!,
        stamps_supplied: Int!
    }

    type Transaction {
        metadata: Metadata!,
        payload: Payload!,
    }

    type Processed {
        hash: String!,
        result: String!,
        stamps_used: Int!,
        state: [State!],
        status: Int!,
        transaction: Transaction!,
        rewards: [Reward!],
    }

    type Origin {
        signature: String!,
        sender: String!
    }

    type Block {
        hash: String!,
        number: String!,
        hlc_timestamp: String!,
        previous: String!,
        proofs: [BlockProof!],
        processed: Processed,
        origin: Origin!,
        genesis: [JSONObject!],
    }

    # statics
    enum RewardsType {
        MASTERNODES
        FOUNDATION
        DEVELOPER
        BURN
    }

    type Node {
        vk: String!
        txs_received: Int!
        used_in_consensus: Int!
    }

    type StaticsRewardDetail {
        recipient: String!
        type: RewardsType!
        amount: String!
    }

    type StaticsReward {
        recipient: String
        amount: String!
    }

    type StaticsContractReward {
        contract: String!,
        amount: String!
    }

    type StaticsBurns {
        amount: String!
    }

    type StaticsLastdaysRewards {
        amount: String!
        date: String!,
    }

    # info
    type Contract {
        lst001: Boolean
        contractName: String!
    }

    # stats
    type Stats {
        updated: Boolean
        synced: Boolean
        latest_processed_block: String!
        latest_synced_block: String!
        latest_block: String!
    }

    # history
    type Tx {
        affectedContractsList: [String!]!
        affectedRawKeysList: [String!]!
        affectedRootKeysList: [String!]!
        affectedVariablesList: [String!]!
        blockNum: String!
        hlc_timestamp: String!
        senderVk: String!
        state_changes_obj: JSON!
        txHash: String!
        txInfo: TxInfo!
    }

    type TxInfo {
        hash: String!
        result: String!
        stamps_used: Int!
        state: [State!]
        status: Int!
        transaction: Transaction!
    }

    # State
    type StateDetail {
        blockNum: String
        contractName: String!
        hlc_timestamp: String
        prev_blockNumL: String
        prev_value: LamdenValue
        rawKey: String
        rootKey: String
        senderVk: String
        txHash: String
        value: LamdenValue
        variableName: String
        notFound: Boolean
    }

    input StateArgs {
        contractName: String!
        variableName: String
        key: String
    }

    type Query {
        blockByHash(hash: String!): Block
        blockByBlocknum(blocknum: String!): Block
        blocks(start_block: String = "0", limit: Int = 10): [Block!]
        nodes(vk: String): [Node!]
        rewards(type: RewardsType): [StaticsRewardDetail!]
        totalRewards(vk: String, start: Int, end: Int): StaticsReward
        totalContractRewards(contract: String!): StaticsContractReward!
        totalBurns: StaticsBurns!
        lastdaysRewards(vk: String, days: Int = 7): [StaticsLastdaysRewards!]
        contracts: [Contract!]
        contractDetail(contract: String!): JSONObject!
        tokens: [Contract!]
        tokenDetail(contract: String!): JSONObject!
        stats: Stats!
        historys(contract: String, variable: String, root_key: String, start_block_num: String = "0", limit: Int = 10): [Tx!]!
        transaction(hash: String!): Tx!
        States(content: [StateArgs!]!): [StateDetail!]!
    }
`

export default typeDefs