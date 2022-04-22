import { createLogger } from '../logger.mjs';

const logger = createLogger('Stamps');

/**
* @openapi
* /stamps/estimation:
*   post:
*     tags: ["Stamps"]
*     summary: Returns estimated stamps cost of transaction.
*     description: Returns estimated stamps cost of transaction.You should provide transaction info as the payload.
*     requestBody:
*       description: Transaction Payload
*       content: 
*           'application/json':
*               schema:
*                   type: object
*                   properties: 
*                       metadata:
*                           type: object
*                           properties:
*                               signature:
*                                   type: string
*                                   description: tx singature
*                                   example: fa4afe36080b5a79d9cfc8b1207df7d147f1e87e1880384b63ea417967ee1515e0ab9a471bd61d0834cb381f80780dee1eaed85e126e31a2eae732b2b5520c0a
*                                   required: true      
*                               timestamp:
*                                   type: integer
*                                   description: Timestamp
*                                   example: 1601498663
*                                   required: true      
*                       payload:
*                           type: object
*                           properties:
*                               contract:
*                                   type: string
*                                   description: Contract name
*                                   example: currency
*                                   required: true      
*                               function:
*                                   type: string
*                                   description: Function name
*                                   example: transfer
*                                   required: true    
*                               kwargs:
*                                   type: object
*                                   description: Kwargs provide to contract func.
*                                   required: true 
*                                   example: 
*                                       amount: 
*                                           __fixed__: '10000000000000000000000000000000000000.5'
*                                       to: 183533f55e67a1a6e0c3d13ef3a69f4b1b1bcf7c64ef4e0cef6fbf4b6e0eaf95
*                               nonce:
*                                   type: integer
*                                   example: 32
*                                   required: true
*                               processor:
*                                   type: string
*                                   example: 89f67bb871351a1629d66676e4bd92bbacb23bd0649b890542ef98f1b664a497
*                                   required: true    
*                               sender:
*                                   type: string
*                                   example: f16c130ceb7ed9bcebde301488cfd507717d5d511674bc269c39ad41fc15d780
*                                   required: true    
*                               stamps_supplied:
*                                   type: integer
*                                   example: 40
*                                   required: true
*                                              
*     responses:
*       200:
*         description: Success
*/
export const getStampsEndpoints = (socketClient) => {
    async function get_stamps_estimation(req, res) {
        let payload = req.body
        try {
            socketClient.emit("stamps_estimation", payload, (response) => {
                let data = JSON.parse(response)
                res.send(data)
            });
        } catch (e) {
            logger.error(e)
            res.send({ error: e.message })
        }
    }

    return [
        {
            type: 'post',
            route: '/stamps/estimation',
            handler: get_stamps_estimation
        },
    ]
}