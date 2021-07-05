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

1. `git clone`