const express = require('express');
const app = express();
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const { config } = require('dotenv');

config()

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Lamden Block Service Api',
      version: '1.0.0',
    },
    servers: [{
      url: "http://119.29.130.37:3535",
      description: "Development"
    }
    ]
  },
  apis: ['src/endponts/*.mjs'], // files containing annotations as above
};

const openapiSpecification = swaggerJsdoc(options);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapiSpecification));

// add an api docs router to app
//export const swaggerInstall = function (app){
//    if (!app){
//        app = express
//    }
//    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapiSpecification));
//}

let host = process.env.BLOCKSERVICE_HOST || 'localhost'
let port = process.env.APIDOC_PORT || 8999

app.listen(port, host, () => {
  console.log(`Api docs app listening on port ${port}\nUrl: ${host}:${port}/api-docs`)
})