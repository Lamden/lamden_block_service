const express = require('express');
const app = express();
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc')

const options = {
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'Lamden Block Service Api',
        version: '1.0.0',
      },
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

let port = process.env.APIDOC_PORT || 8888

app.listen(port, () => {
    console.log(`Api docs app listening on port ${port}\nUrl: localhost:${port}/api-docs`)
})