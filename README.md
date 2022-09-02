## VERSION 2.0 will not work with a version 1 Lamden network.  Use the previuous version to v2 for an old Lamden network.

# Lamden Block Service
A nodejs application for syncing and serving the Lamden Blockchain to a local app.
This application serves as starting point to be able to build an app on Lamden that requires easy access to current state and realtime updates.

Features:
- Easy to install and configure
- Automatically syncs the blockchain state independant of your app
- Automatically stores and updates the current blockchain state and provides endpoint to query any key as well websockets to subscibe to specific current state updates.
- updates can be at the `contract`, `contract.variable` or `contract.variable:rootKey` levels
- updates are provided in a state update object as opposed to a list of state changes ususlly found in the block data
- updates can be had at the specific key level or at the entire transaction level
- endpoints to easily pagenate through the historic changes to state at the `contract`, `contract.variable` or `contract.variable:rootKey` levels for loading history tables in an app

## Install instructions

### Install Dependancies
1. [Mongo DB (latest)](https://docs.mongodb.com/manual/installation/)
2. [Nodejs and NPM](https://nodejs.org/en/)

### Install App
1. `git clone https://github.com/Lamden/lamden_block_service.git`
2. `npm install`

## Run
1. `npm run start`

## Run api doc server
`npm run docs`

## Sync Chaindata (Optional)
The first time you run the block service, it will take long time to sync blocks data. In order to avoid waiting for so long, you can use
[mongodump](https://www.mongodb.com/docs/database-tools/mongodump/#mongodb-binary-bin.mongodump) to export data from another block service to you own block service.


## Configure
All configuration is done by an `.env` file which you need to create in the root of the application folder.
Add these variables to the `.env` to set the following options, `defaults are highlighed`.  
These variables can also be set in any other means you would set an environment varible or pass one into a nodejs app.
Restart the app for these setting to take effect.

### Lamden configuration items
- NETWORK `testnet`: Which Lamden network to sync
- MASTERNODE_URL `https://testnet-master-1.lamden.io`: A URL of a lamden masternode

### Mongo DB configuration items
- DBUSER `null`: database user
- DBPWD `null`: database password
- AUTHSOURCE `admin`: auth source if using a user and password
- DBURL `127.0.0.1`: database URL
- DBPORT `27017`: database port
- DBNAME `${NETWORK}-blockservice`: the name of the database. Default is too add `-blockservice` to the value of the `NETWORK` variable which defaults to `testnet`

### Runtime options
- DEBUG_ON `false`: outputs some logs while grabbing blocks


### Server options
- BLOCKSERVICE_PORT `3535`: The port used for the webserver and websockets
- BLOCKSERVICE_HOST `localhost`: Api bind host

### Misc options
- APIDOC_PORT `8999`: Api document port.
- SCRIPT_SOCKET_CONN `http://localhost:3232`: Estimation script socket server connection.
- LOG_LEVEL  `info`: Log level. 
    - 'info' - Displays all messages from all loggers.
    - 'timer' - Displays messages only from the time, timeEnd, debug, warn, error & fatal loggers.
    - 'debug' - Displays messages only from the debug, warn, error & fatal loggers.
    - 'warn' - Displays messages only from the warn, error & fatal loggers.
    - 'error' - Displays messages only from the error & fatal loggers.
