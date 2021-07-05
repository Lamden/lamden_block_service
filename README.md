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
1. `npm start`

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
- REPAIR_BLOCKS `undefined`: Use this if you are missing blocks. The app will start at whatever value you pass in and iterate up in blocks to see if it's missing any. Any missing will be processed.
- RE_PARSE_BLOCKS `false`: Reload the CurrentState and StateChanges tables using the Blockinfo stored inthe `Blocks` database. This drops both tables before hand but `DOES NOT DROP BLOCKS TABLE`!
- START_AT_BLOCK_NUMBER `0`: Used in conjunction with `RE_PARSE_BLOCKS` to set a starting block.  Could be useful if you're app has no state below a certain block.
- WIPE `false`: `USE AT OWN RISK!` This will drop the entire database which means you will need to start syncing all blocks from the masternode (which is slow).  If you want to just reload the CurrentState and StateChanges tables then use `RE_PARSE_BLOCKS` instead!


### Server options
BLOCKSERVICE_PORT `3535`: The port used for the webserver and websockets

## USE
