import { createLogger } from './logger.mjs'

const logger = createLogger('Blocks Queue');

// First Input First Output
class Queue {
    constructor() {
        this._queue = []
    }

    push(value) {
        return this._queue.push(value)
    }

    shift() {
        return this._queue.shift()
    }

    isEmpty() {
        return this._queue.length === 0
    }
}

// Task Pool
export class TaskPool {
    constructor(size = 3) {
        // The amount of concurrency
        this.size = size
        this.queue = new Queue()
    }

    addTask(fn, ...args) {
        this.queue.push({ fn, args })
        this.consumer()
    }

    consumer() {
        // Do nothing when task queue is empty
        if (this.queue.isEmpty()) {
            return
        }
        // Do nothing when the amount of concurrency is zero
        if (this.size === 0) {
            return
        }

        this.size--
        const { fn, args } = this.queue.shift()
        Promise.resolve(fn(...args)).catch((e) => {
            console.log(e)
        }).finally(() => {
            this.size++
            this.consumer()
        })
    }
}

export class BlockProcessingQueue extends TaskPool {
    constructor(size = 3) {
        super(size)
        this.blockProcessor = null
    }

    addBlock(blockInfo) {
        if (!this.blockProcessor) {
            throw new Error("No block processsor setup. Call 'setupBlockProcessor'.")
        }
        if (!blockInfo.error) {
            this.addTask(this.blockProcessor, blockInfo)
            logger.success(`Added block ${blockInfo.number} to processing queue.`)
        }
    }

    setupBlockProcessor(processor) {
        this.blockProcessor = processor
    }
}

// export const blockProcessingQueue = () => {
//     let blockQueue = {}
//     let blockProcessor = null
//     let timer = null
//     let processing = false

//     function start() {
//         timer = setInterval(tryProcessing, 100)
//     }

//     function stop() {
//         clearInterval(timer)
//         timer = null
//     }

//     function tryProcessing() {
//         if (processing) return
//         processNext()
//     }

//     function addBlock(blockInfo) {
//         if (!blockInfo.error) {
//             blockQueue[blockInfo.number] = blockInfo
//             logger.success(`Added block ${blockInfo.number} to processing queue.`)
//         }
//     }

//     async function processNext() {
//         if (!blockProcessor) {
//             stop()
//             throw new Error("No block processsor setup. Call 'setupBlockProcessor'.")
//         }

//         processing = true

//         let blockNumbers = Object.keys(blockQueue).sort((a, b) => a - b)

//         if (blockNumbers.length === 0) {
//             processing = false
//             return
//         }

//         let lowestBlockNumber = blockNumbers[0]

//         let blockInfo = blockQueue[lowestBlockNumber]
//         logger.log(`Processing block ${lowestBlockNumber} from queue.`)
//         await blockProcessor(blockInfo)
//         delete blockQueue[lowestBlockNumber]

//         processing = false
//     }

//     return {
//         start,
//         stop,
//         addBlock,
//         setupBlockProcessor: (processor) => blockProcessor = processor
//     }
// }