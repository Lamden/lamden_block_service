export const getStaticsQueries = (db) => {

    async function getNodeStaticsByVk(vk)
     {
        let query1 = db.models.Blocks.aggregate([{
            $match: {
                "blockInfo.origin.sender": vk
            }
        },{
            $group: {
                _id: "$blockInfo.origin.sender",
                txs_received: {$sum: 1}
            },
        }])

        let query2 = db.models.Blocks.aggregate([{
            $unwind: {
              'path': '$blockInfo.proofs'
            }
        },{
            $match: {
                "blockInfo.proofs.signer": vk
            }
        },{
            $group: {
                    _id: "$blockInfo.proofs.signer",
                    used_in_consensus: {$sum: 1}
            },
        }])

       let res = await Promise.all([query1, query2])
       return {
            id: vk,
            txs_received :res[0][0].txs_received,
            used_in_consensus: res[1][0].used_in_consensus
       }
    }

    async function getNodeStatics() {
       let res = await db.models.CurrentState.find({rawKey: "masternodes.S:members"})
       if (res[0].value && Array.isArray(res[0].value)) {
            let members = [...res[0].value]
            let query1 = db.models.Blocks.aggregate([{
                $match: {
                    "blockInfo.origin.sender": {
                        "$in": members
                    }
                }
            },{
                $group: {
                        _id: "$blockInfo.origin.sender",
                        txs_received: {$sum: 1}
                    },
            }, {
                $project: {
                    _id: 0,
                    member: "$_id",
                    txs_received: 1
                }
            }])

            let query2 = db.models.Blocks.aggregate([{
                $unwind: {
                  'path': '$blockInfo.proofs'
                }
            },{
                $match: {
                    "blockInfo.proofs.signer": {
                        "$in": members
                    }
                }
            },{
                $group: {
                        _id: "$blockInfo.proofs.signer",
                        used_in_consensus: {$sum: 1}
                },
            }, {
                $project: {
                    _id: 0,
                    member: "$_id",
                    used_in_consensus: 1
                }
            }])

            let result = await Promise.all([query1, query2])
            return members.map(m => {
                let val1 = result[0].find(r => r.member === m)
                let val2 = result[1].find(r => r.member === m)
                let txs = val1 ? val1.txs_received : 0
                let consensus = val2 ? val2.used_in_consensus : 0
                
                return {
                    vk: m,
                    txs_received: txs,
                    used_in_consensus: consensus
                }
            })
       }

       return []
    }

    async function getBurnRewards() {
        let res = await db.models.Rewards.aggregate([{
            $match: {
                type: "burn"
            }
        }, {
            $group: {
                _id: "$type",
                burnt: {
                    $sum: {
                        $convert: {
                            input: "$amount",
                            to: "decimal",
                            onError: 0, // Optional.
                            onNull: 0 // Optional.
                        }
                    }
                                
                                
                }
            }
        }]).then(v => v[0])

        return {
            amount: res.burnt.toString()
        }
    }

    async function getRewards() {
        let res = await db.models.Rewards.aggregate([{
            $group: {
                _id: {
                    x: "$recipient",
                    y: "$type"
                },
                amount: {
                    $sum: {
                        $convert: {
                            input: "$amount",
                            to: "decimal",
                            onError: 0,
                            onNull: 0 
                        }
                    }
                }
            }
        },   {
              $setWindowFields: {
                 sortBy: { amount: -1 },
                 output: {
                    order: {
                       $rank: {}
                    }
                 }
              }
           }, {
                $project: {
                    _id: 0,
                    recipient: "$_id.x",
                    type: "$_id.y",
                    amount: {
                        $toString: "$amount"
                    },
                    order: 1,
                }
             }])

        return res
    }

    /**
     * 
     * @param {string} recipient 
     * @param {int} start 13 digit number
     * @param {int} end 13 digit number
     * @returns 
     */
    async function getTotalRewards(recipient, start, end) {

        let con = {
            type: {
                $ne: "burn"
            },
            $expr: {
                $and: []
            }
        }

        if (recipient) {
            con.recipient = recipient
        }

        if (start) {
            con["$expr"]["$and"].push({$gte: [{$toLong: "$blockNum"}, start * 1000000]})
        }

        if (end) {
            con["$expr"]["$and"].push({$lte: [{$toLong: "$blockNum"}, end * 1000000]})
        }

        let res = await db.models.Rewards.aggregate([{
            $match: con
        },{
            $group: {
                _id: recipient,
                amount: {
                    $sum: {
                        $convert: {
                            input: "$amount",
                            to: "decimal",
                            onError: 0,
                            onNull: 0
                        }
                    }
                }
            }
        },{
            $project: {
                _id: 0,
                recipient: "$_id",
                amount: {
                    $toString: "$amount"
                },
            }
        }]).then(r => r[0])

        return res
    }


    async function getRewardsByVk(vk, start, end) {

        let con = {
            recipient: vk,
            $expr: {
                $and: []
            }
        }

        if (start) {
            con["$expr"]["$and"].push({$gte: [{$toLong: "$blockNum"}, start * 1000000]})
        }

        if (end) {
            con["$expr"]["$and"].push({$lte: [{$toLong: "$blockNum"}, end * 1000000]})
        }

        let res = await db.models.Rewards.aggregate([{
            $match:con
        }, {
            
            $group: {
                _id: "$recipient",
                amount: {
                    $sum: {
                        $convert: {
                            input: "$amount",
                            to: "decimal",
                            onError: 0,
                            onNull: 0
                        }
                    }
                }
            }
        }, {
            $project: {
                _id: 0,
                recipient: "$_id",
                amount: {
                    $toString: "$amount"
                },
            } 
        }])

        return res
    }

    async function getRewardsByType(type) {
        let res = await db.models.Rewards.aggregate([{
            $match: {
                type: type
            }
        }, {
            
            $group: {
                _id: {
                    x: "$recipient",
                    y: "$type"
                },
                amount: {
                    $sum: {
                        $convert: {
                            input: "$amount",
                            to: "decimal",
                            onError: 0,
                            onNull: 0
                        }
                    }
                }
            }
        }, {
            $project: {
                _id: 0,
                recipient: "$_id.x",
                        type: "$_id.y",
                amount: {
                    $toString: "$amount"
                },
                
            }
        }])

        return res
    }

    async function getRewardsByContract(contract) {
        let res = await db.models.Rewards.aggregate([{
            $match: {
                contract: contract
            }
        }, {
            $group: {
                _id: "$contract",
                amount: {
                    $sum: {
                        $convert: {
                            input: "$amount",
                            to: "decimal",
                            onError: 0,
                            onNull: 0
                        }
                    }
                }
            }
        }, {
            $project: {
                _id: 0,
                contract: "$_id",
                amount: {
                    $toString: "$amount"
                },
            } 
        }]).then(v => v[0])

        return res
    }

    async function getLastDaysRewards(days, recipient=undefined) {
        // 23:59:59
        const today = new Date(new Date().setHours(0, 0, 0, 0) + 24 * 60 * 60 * 1000 - 1)
        const day = today.setDate(today.getDate() - 7)
        let con = {
            $expr: {
                $gte: [{$toLong: "$blockNum"},  day * 1000000]
            }  
        }

        if (recipient) {
            con.recipient = recipient
        }

        let res = await db.models.Rewards.aggregate([{
                $match: con,
            }, {
                $set: 
                {
                    'time': {
                        $dateToString: {
                            format: "%Y-%m-%d",
                            date: {
                                '$toDate': {
                                    '$divide': [{
                                        $toLong: "$blockNum"
                                    }, 1000000]
                                }
                            }
                        }
                    },
                    
                }
            },{
                $group: {
                    _id: "$time",
                    amount: {
                        $sum: {
                            $convert: {
                                input: "$amount",
                                to: "decimal",
                                onError: 0,
                                onNull: 0
                            }
                        }
                    }
                }
            }, {
                $project: {
                    _id: 0,
                    date: "$_id",
                    amount: {
                        $toString: "$amount"
                    }
                }
            }])

        return res
    }

    return {
        getNodeStaticsByVk,
        getNodeStatics,
        getBurnRewards,
        getRewards,
        getRewardsByVk,
        getRewardsByType,
        getRewardsByContract,
        getTotalRewards,
        getLastDaysRewards
    }
}