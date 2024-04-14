import { ethers } from 'ethers';

declare const window: any;



// Assume this is a simplified ABI for the contract
const contractABI = [
    // Transaction functions
    // Approve an NFT transaction & this will auto-trigger the backend to create a Loan by calling the contract
    "function approveNFTTransaction(address nftAddress, uint256 nftId) external", 
    "function repayLoan(uint256 loanId) external payable",

    // View functions
    "function getMyLoans() external view returns (uint256[] memory)",
    "function checkRepaymentAmount(uint256 loanId) external view returns (uint256)",
    "function isMarketPriceBelowTotalDue(uint256 loanId, uint256 currentMarketPrice) external view returns (bool)",

];


// Assume this is your contract's deployed address
const contractAddress = "0xYourContractAddressHere";



/**
 * Connect to the MetaMask wallet.
 * This function prompts the user to connect their MetaMask wallet to the dapp.
 * It logs the connected address and initializes token balance retrieval functions.
 */
async function connectWallet() {
    if (!window.ethereum) {
        throw new Error('MetaMask is not installed!');
    }

    try {
        // Request account access. If the user has multiple accounts, they can select which ones to connect.
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        const signer = provider.getSigner();
        const address = await signer.getAddress();
        console.log(`Connected to address: ${address}`);

        // Fetch balances after successfully connecting to the wallet
        getTokenBalances(address, provider);
        getNFTBalances(address, provider);
    } catch (error) {
        console.error('Failed to connect to MetaMask:', error);
    }
}



/**
 * Fetch ERC20 token balances for given tokens.
 * This function queries the blockchain for the balances of specified ERC20 tokens
 * and logs them to the console.
 * 
 * @param {string} address The wallet address to fetch balances for.
 * @param {ethers.providers.Web3Provider} provider The ethers provider used to interact with the blockchain.
 */
async function getTokenBalances(address: string, provider: ethers.providers.Web3Provider) {
    const ERC20_TOKEN_ADDRESSES = {
        USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
        USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        DAI: "0x6B175474E89094C44Da98b954EedeAC495271d0F"
    };

    for (const token in ERC20_TOKEN_ADDRESSES) {
        const tokenAddress = ERC20_TOKEN_ADDRESSES[token];
        const contract = new ethers.Contract(tokenAddress, [
            "function balanceOf(address owner) view returns (uint256)"
        ], provider);
        const balance = await contract.balanceOf(address);
        console.log(`${token} Balance: ${ethers.utils.formatEther(balance)} tokens`);
    }
}



/**
 * Fetch ERC721 token balances for given tokens.
 * This function queries the blockchain for the balances of specified ERC721 tokens
 * and logs them to the console.
 * 
 * @param {string} address The wallet address to fetch balances for.
 * @param {ethers.providers.Web3Provider} provider The ethers provider used to interact with the blockchain.
 */
async function getNFTBalances(address: string, provider: ethers.providers.Web3Provider) {
    const ERC721_TOKEN_ADDRESSES = {
        BAYC: "0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d",
        Azuki: "0xed5af388653567af2f388e6224dc7c4b3241c544",
        Moonbird: "0x23581767a106ae21c074b2276d25e5c3e136a68b"
    };

    for (const nft in ERC721_TOKEN_ADDRESSES) {
        const nftAddress = ERC721_TOKEN_ADDRESSES[nft];
        const contract = new ethers.Contract(nftAddress, [
            "function balanceOf(address owner) external view returns (uint256)"
        ], provider);
        const balance = await contract.balanceOf(address);
        console.log(`${nft} Balance: ${balance.toString()} items`);
    }
}



/**
 * Invokes the 'approveNFTTransaction' function on a smart contract.
 * This function authorizes the contract to manage a specific NFT on behalf of the user.
 * It submits a transaction to the blockchain and logs the transaction details.
 * And this will auto-trigger the backend to create a Loan by calling the contract
 * 
 * @param {string} nftAddress The address of the NFT contract.
 * @param {number} nftId The identifier of the NFT to be approved.
 * @param {ethers.providers.Web3Provider} provider The ethers provider used for blockchain interactions.
 * @param {ethers.Signer} signer The ethers signer object used to sign the transaction.
 */
async function approveNFTTransaction(nftAddress: string, nftId: number, provider: ethers.providers.Web3Provider, signer: ethers.Signer) {
    const contract = new ethers.Contract(contractAddress, contractABI, signer);
    try {
        // Submit the transaction to the blockchain
        const tx = await contract.approveNFTTransaction(nftAddress, nftId);
        console.log("Transaction submitted:", tx);

        // Wait for the transaction to be confirmed
        await tx.wait();
        console.log("Transaction confirmed:", tx);
    } catch (error) {
        // Log any errors that occur during the transaction submission
        console.error("Failed to approve NFT transaction:", error);
    }
}



/**
 * Repays a loan and retrieves the borrower's NFT.
 * This function calls the 'repayLoan' method on the smart contract, sending the necessary payment.
 * It handles blockchain transaction submission and confirmation.
 * 
 * @param {number} loanId The identifier of the loan being repaid.
 * @param {ethers.providers.Web3Provider} provider The ethers provider used for blockchain interactions.
 * @param {ethers.Signer} signer The ethers signer object used to sign the transaction.
 */
async function repayLoan(loanId: number, provider: ethers.providers.Web3Provider, signer: ethers.Signer) {
    const contract = new ethers.Contract(contractAddress, contractABI, signer);

    try {
        // Calculate the total amount due including interest.
        // For demonstration, this should be replaced with actual logic to calculate or fetch the required amount.
        const totalDue = ethers.utils.parseEther("1.0"); // Example amount in Ether

        // Submit the transaction to repay the loan with the specified amount.
        const tx = await contract.repayLoan(loanId, { value: totalDue });
        console.log("Transaction submitted:", tx);

        // Wait for the transaction to be confirmed.
        await tx.wait();
        console.log("Transaction confirmed:", tx);
    } catch (error) {
        // Log any errors that occur during the transaction submission.
        console.error("Failed to repay loan and retrieve NFT:", error);
    }
}



/**
 * Retrieves an array of loan IDs associated with the caller. This function calls the smart contract's
 * getMyLoans view function, which returns the list of loan IDs for the caller.
 * 
 * @param {ethers.providers.Web3Provider} provider The ethers provider used to interact with the blockchain.
 */
async function getMyLoans(provider: ethers.providers.Web3Provider) {
    const signer = provider.getSigner();
    const contract = new ethers.Contract(contractAddress, contractABI, signer);
    try {
        const loanIds = await contract.getMyLoans();
        console.log('My Loans:', loanIds);
    } catch (error) {
        console.error('Failed to fetch my loans:', error);
    }
}



/**
 * Retrieves the total amount due for a specific loan, allowing a user to check how much they need to pay to close the loan.
 * 
 * @param {number} loanId The identifier of the loan.
 * @param {ethers.providers.Web3Provider} provider The ethers provider used to interact with the blockchain.
 */
async function checkRepaymentAmount(loanId: number, provider: ethers.providers.Web3Provider) {
    const contract = new ethers.Contract(contractAddress, contractABI, provider);
    try {
        const totalDue = await contract.checkRepaymentAmount(loanId);
        console.log(`Total due for loan ${loanId}:`, ethers.utils.formatEther(totalDue), 'ETH');
    } catch (error) {
        console.error('Failed to check repayment amount:', error);
    }
}



/**
 * Checks if the current market price is below the total due amount for a specific loan.
 * 
 * @param {number} loanId The loan ID to check.
 * @param {number} currentMarketPrice The current market price in wei.
 * @param {ethers.providers.Web3Provider} provider The ethers provider used to interact with the blockchain.
 */
async function isMarketPriceBelowTotalDue(loanId: number, currentMarketPrice: number, provider: ethers.providers.Web3Provider) {
    const contract = new ethers.Contract(contractAddress, contractABI, provider);
    try {
        const isBelow = await contract.isMarketPriceBelowTotalDue(loanId, currentMarketPrice);
        console.log(`Is market price below total due for loan ${loanId}?`, isBelow);
    } catch (error) {
        console.error('Failed to determine market price status:', error);
    }
}
