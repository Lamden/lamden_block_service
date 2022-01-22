export const blockProcessingQueue = (db) => {
    let blockQueue = {}
    let blockProcessor = null
    let timer = null
    let processing = false

    function start(){
        timer = setInterval(tryProcessing, 100)
    }

    function stop(){
        clearInterval(timer)
        timer = null
    }

    function tryProcessing(){
        if (processing) return
        processNext()
    }

    async function addBlock(blockInfo){
        try{
            let blockNum = blockInfo.number || blockInfo.id;
            if (!blockNum) throw new Error("Adding block without block number!")

            let block = await db.models.Blocks.findOne({ blockNum })

            if (!block) {
                if (blockInfo.error) {
                    block = new db.models.Blocks({
                        blockInfo: {
                            hash: 'block-does-not-exist',
                            number: blockNum,
                            subblocks: []
                        },
                        blockNum
                    })
                } else {
                    block = new db.models.Blocks({
                        blockInfo,
                        blockNum,
                        hash: blockInfo.hash
                    })
                }
                await block.save()
            }
            if (!blockInfo.error) {
                await db.queries.setLatestBlock(blockInfo.number)
                blockQueue[blockInfo.number] = blockInfo
                console.log(`Added block ${blockInfo.number} to processing queue.`)
            }
        }catch (e){
            console.log(new Date())
            console.log(`Error Procesing block in addBlock`)
            console.log(e)
            console.log({blockInfo})
        }
    }

    async function processNext(){
        if (!blockProcessor) {
            stop()
            throw new Error("No block processsor setup. Call 'setupBlockProcessor'.")
        }

        processing = true

        let blockNumbers =  Object.keys(blockQueue).sort((a,b) => a > b)

        if (blockNumbers.length === 0) {
            processing = false
            return
        }

        let lowestBlockNumber = blockNumbers[0]

        let blockInfo = blockQueue[lowestBlockNumber]
        console.log({blockNumbers})
        console.log({blockQueueCount: Object.keys(blockQueue).length})
        console.log(`Processing block ${lowestBlockNumber} from queue.`)
        await blockProcessor(blockInfo)
        delete blockQueue[lowestBlockNumber]  

        processing = false
    }

    return {
        start,
        stop,
        addBlock,
        setupBlockProcessor: (processor) => blockProcessor = processor
    }
}