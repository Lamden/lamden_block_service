const { BlockProcessingQueue } = require('./blockProcessingQueue.mjs')


describe("Testing BlockProcessingQueue", () => {
    let blockProcessingQueue
    beforeAll((done) => {
        blockProcessingQueue = new BlockProcessingQueue()
        done()
    });

    afterAll(() => {

    });

    test("Should throw error when processor not be set", (done) => {
        let data = {}
        expect(() => blockProcessingQueue.addBlock(data)).toThrow("No block processsor setup. Call 'setupBlockProcessor'.");
        done()
    });

    test("Should run block process task", (done) => {
        let data = { msg: "test" }
        blockProcessingQueue.setupBlockProcessor((info) => {
            expect(info).toEqual(data)
            done()
        })
        blockProcessingQueue.addBlock(data)
    });


    test("Should not run block process task when the amount of concurrency is 0", (done) => {
        let data = { msg: "test" }
        blockProcessingQueue.size = 0
        blockProcessingQueue.setupBlockProcessor((info) => { })
        blockProcessingQueue.addBlock(data)
        setTimeout(() => {
            expect(blockProcessingQueue.queue.isEmpty()).toBeFalsy()
            done()
        }, 2000)
    });

    test("Can limit the amount of concurrent tasks", (done) => {
        let data = {}
        blockProcessingQueue.size = 2
        blockProcessingQueue.setupBlockProcessor(async () => { await new Promise(resolve => setTimeout(resolve, 3000)) })
        blockProcessingQueue.addBlock(data)
        blockProcessingQueue.addBlock(data)
        blockProcessingQueue.addBlock(data)
        setTimeout(() => {
            expect(blockProcessingQueue.size).toBe(0)
        }, 1000)
        setTimeout(() => {
            done()
        }, 7000)
    }, 10000);

});