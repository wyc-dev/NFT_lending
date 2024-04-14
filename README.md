# NFT Lending Platform Documentation

This repository contains the essential components of the NFT Lending system, designed to enable the secure borrowing and lending of NFTs using Ethereum as collateral. Each component plays a specific role in ensuring the system's functionality and user interaction with the Ethereum blockchain.

## Files Overview

- **NFT_ETH.sol**: A Solidity contract that outlines the operations for NFT lending and borrowing, including the management of loans and collateral.

- **ContractABI.json**: Contains the Application Binary Interface (ABI) of the smart contract, essential for the frontend to interact with the blockchain.

- **Backend_scriptComponents.ts**: Includes backend functions that facilitate direct interaction with the Ethereum network, ensuring robust server-side processing.

- **Frontend_scriptComponents.ts**: Manages all frontend interactions, providing a bridge between the user interface and the Ethereum blockchain via web3 providers such as MetaMask.

## Detailed File Descriptions

### `NFT_ETH.sol`
📄 **Purpose**: Implements the core functionalities of the NFT lending platform.
- **Key Features**:
  - **`approveNFTTransaction`**: Approves an NFT for transactions within the platform.
  - **`createLoan`**: Initiates a new loan based on an NFT as collateral.
  - **`repayLoan`**: Enables borrowers to repay their loans and reclaim their NFTs.
  - **`liquidateLoan`**: Processes the liquidation of a loan under predefined conditions.
  - **Administrative functions**: Manage collateral, adjust interest rates, and handle ownership.

### `ContractABI.json`
📄 **Purpose**: Facilitates interaction between the frontend application and the deployed smart contract.
- **Utility**: Critical for the frontend and backend scripts to communicate with the smart contract, enabling method invocation and event listening.

### `Backend_scriptComponents.ts`
📄 **Purpose**: Handles complex interactions with the Ethereum blockchain that are executed from the server side.
- **Functionalities**:
  - **Transaction Management**: Sends transactions and manages Ethereum network interactions.
  - **Data Retrieval**: Fetches state information from the blockchain, supporting backend logic.

### `Frontend_scriptComponents.ts`
📄 **Purpose**: Enables direct interactions between the web application’s frontend and the Ethereum blockchain.
- **Capabilities**:
  - **Wallet Integration**: Connects with MetaMask and other Ethereum wallets for transaction processing.
  - **User Interactions**: Manages functions such as sending NFT approvals, processing loan repayments, and displaying loan and collateral information.

## Integration and Usage
To interact with this platform:
1. **Deploy the Smart Contract**: Use the `NFT_ETH.sol` file to deploy the contract to an Ethereum network.
2. **Interact Through the Scripts**: Utilize the `ContractABI.json` in both backend and frontend scripts to facilitate interaction with the contract.
3. **Operate the Platform**:
   - **Frontend**: Integrates with MetaMask for transactions, querying blockchain data to display NFT loans and manage them efficiently.
   - **Backend**: Handles more complex transactions and data fetching operations that support the frontend.

Ensure MetaMask is installed and connected to the appropriate Ethereum network (e.g., Rinkeby testnet or Ethereum mainnet) to fully engage with the platform's features.

For additional details on function parameters and specific operations, consult the inline documentation provided within each file.
