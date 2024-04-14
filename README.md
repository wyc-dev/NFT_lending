# NFT Lending Platform Documentation

This repository contains several key components that make up the NFT Lending system, which is designed to facilitate the borrowing and lending of NFTs using Ethereum as collateral. Below is a breakdown of each file and their respective functionalities.

## Files Overview

- **NFT_ETH.sol**: This Solidity contract file contains the smart contract code for NFT lending and borrowing. It integrates features such as loan creation, collateral management, and NFT transactions.

- **ContractABI.json**: This file contains the ABI (Application Binary Interface) of the smart contract. The ABI is crucial for the frontend to interact with the smart contract on the Ethereum blockchain.

- **Backend_scriptComponents.ts**: This TypeScript file includes backend utility functions that interact with the smart contract via Ethereum network. It handles blockchain interactions like sending transactions and querying contract states.

- **Frontend_scriptComponents.ts**: This TypeScript file manages all frontend interactions, helping to connect the user interface with the Ethereum blockchain through web3 providers like MetaMask.

## Detailed File Descriptions

### NFT_ETH.sol
📄 **Purpose**: Implements the core smart contract for NFT lending.
- **Functions**:
  - `approveNFTTransaction`: Approves a transaction for an NFT to be lent or borrowed.
  - `createLoan`: Sets up a new loan agreement for an NFT.
  - `repayLoan`: Allows borrowers to repay loans and retrieve their NFTs.
  - `liquidateLoan`: Handles the liquidation of loans under specific conditions.
  - Other administrative functions to manage collateral and interest rates.

### ContractABI.json
📄 **Purpose**: Contains the ABI needed for the frontend scripts to interact with the deployed smart contract.
- **Use Case**: It is used in frontend and backend scripts to instantiate the contract and call its methods.

### Backend_scriptComponents.ts
📄 **Purpose**: Contains functions that are called on the server side to interact with the Ethereum blockchain.
- **Functions**:
  - Integration with server-side logic to handle requests that involve smart contract interactions.
  - Functions to initiate transactions and fetch data from the blockchain.

### Frontend_scriptComponents.ts
📄 **Purpose**: Facilitates direct interaction between the web application’s frontend and the Ethereum blockchain.
- **Functions**:
  - Connects to MetaMask and other Ethereum wallets.
  - Sends transactions such as NFT approvals and loan repayments.
  - Queries blockchain to display data like loan status and collateral amounts.

## Integration and Usage
The smart contract (`NFT_ETH.sol`) is deployed to the Ethereum blockchain. Its ABI (`ContractABI.json`) is used by both backend (`Backend_scriptComponents.ts`) and frontend (`Frontend_scriptComponents.ts`) scripts to interact with it.

- **Frontend**: Uses the ABI to display NFT loans, handle repayments, and update loan statuses.
- **Backend**: Manages transaction submissions and complex queries that are relayed from the frontend.

Ensure that you have MetaMask installed and connected to the correct network (e.g., Rinkeby testnet or Ethereum mainnet) to interact with the functionalities provided by the frontend components.

For further details on each function's specific parameters and usage, please refer to the code documentation within each file.
