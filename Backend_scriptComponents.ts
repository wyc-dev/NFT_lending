// Import required libraries
import axios from 'axios';
import dotenv from 'dotenv';
import { ethers } from 'ethers';
import contractABI from './ContractABI.json';



// Load environment variables
dotenv.config();



// Required user-defined settings with clear comments
const lendingContractAddress = "0xCoreLendingContractAddress"; // Smart contract address on the blockchain
const infuraProjectId = process.env.INFURA_PROJECT_ID; // Your Infura project ID, used to connect to the Ethereum network
const privateKey = process.env.PRIVATE_KEY; // Private key for signing transactions, ensure secure handling!



// Validate necessary environment variables
if (!infuraProjectId || !privateKey) {
    console.error('Please set your INFURA_PROJECT_ID and PRIVATE_KEY in the environment variables.');
    process.exit(1);
}



// Setup blockchain connection and contract with Ethereum network using Infura
const provider = new ethers.providers.JsonRpcProvider(`https://mainnet.infura.io/v3/${infuraProjectId}`);
const wallet = new ethers.Wallet(privateKey, provider);
const contract = new ethers.Contract(lendingContractAddress, contractABI, wallet);



// Set to keep track of processed events to avoid duplication
let processedEvents: Set<string> = new Set();



// Define an interface for the expected structure of API responses
interface FloorPriceResponse {
    events: Array<{
        collection: {
            id: string;
        };
        floorAsk: {
            price: {
                currency: {
                    symbol: string;
                },
                amount: {
                    native: number;
                }
            }
        }
    }>;
}



/**
 * Retrieves the current floor price of an NFT collection using the Reservoir API.
 * @param contractAddress Ethereum address of the NFT collection
 * @returns The current floor price in native tokens or null if the API request fails.
 */
async function getNFTFloorPrice(contractAddress: string): Promise<number | null> {
    const apiKey = process.env.RESERVOIR_API_KEY;
    const apiUrl = 'https://api.reservoirprotocol.io/v3/events/collections/floor-ask';

    try {
        const response = await axios.get<FloorPriceResponse>(apiUrl, {
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Accept': '*/*' },
            params: { contract: contractAddress }
        });

        const floorPriceEvent = response.data.events.find(event => event.collection.id.toLowerCase() === contractAddress.toLowerCase());
        return floorPriceEvent ? floorPriceEvent.floorAsk.price.amount.native : null;
    } catch (error) {
        console.error('Error fetching floor price:', error);
        return null;
    }
}



/**
 * Processes blockchain events related to NFT approvals and initiates loan creation.
 * @param event The blockchain event data including NFT address and ID.
 */
async function processEvent(event: any) {
    const { data } = event;
    const nftAddress = '0x' + data.slice(26, 66);
    const nftId = ethers.BigNumber.from('0x' + data.slice(66, 130)).toString();
    const floorPrice = await getNFTFloorPrice(nftAddress);

    if (floorPrice) {
        const loanAmount = ethers.utils.parseEther((floorPrice * 0.7).toString()); // Calculate 70% of floor price
        try {
            const tx = await contract.createLoan(wallet.address, nftAddress, nftId, loanAmount);
            const receipt = await tx.wait();
            console.log(`Loan created with TxID: ${receipt.transactionHash}`);
        } catch (error) {
            console.error('Error creating loan:', error);
        }
    }
}



/**
 * Periodically fetches 'NFTApprovedByUser' events from the Ethereum blockchain.
 */
async function fetchAndProcessEvents() {
    const eventSignatureHash = '0xd4f07a378695181299b60937c1dbb787aedccc63e5da3c7ea89dcbd1fc7d3a3d';
    try {
        const response = await axios.post(`https://mainnet.infura.io/v3/${infuraProjectId}`, {
            jsonrpc: '2.0',
            method: 'eth_getLogs',
            params: [{
                address: lendingContractAddress,
                fromBlock: 'latest',
                toBlock: 'latest',
                topics: [eventSignatureHash]
            }],
            id: 1
        }, { headers: { 'Content-Type': 'application/json' } });

        const events = response.data.result;
        for (const event of events) {
            if (!processedEvents.has(event.transactionHash)) {
                await processEvent(event);
                processedEvents.add(event.transactionHash);
            }
        }
    } catch (error) {
        console.error('Error fetching events:', error);
    }
}



/**
 * Checks all active loans to see if they need to be liquidated based on NFT floor price changes.
 */
async function checkLoansForLiquidation() {
    const activeLoanIds = await contract.activeLoanIds();
    for (const loanId of activeLoanIds) {
        const loanDetails = await contract.loans(loanId);
        const floorPrice = await getNFTFloorPrice(loanDetails.nftAddress);
        const totalDue = await contract.checkRepaymentAmount(loanId);

        if (floorPrice !== null && ethers.utils.parseEther(floorPrice.toString()).lt(totalDue)) {
            await liquidateLoan(loanId);
        }
    }
}



/**
 * Initiates the liquidation of a loan if necessary conditions are met.
 * @param loanId The ID of the loan to be liquidated.
 */
async function liquidateLoan(loanId: string) {
    try {
        const tx = await contract.liquidateLoan(loanId);
        const receipt = await tx.wait();
        console.log(`Loan liquidated with TxID: ${receipt.transactionHash}`);
    } catch (error) {
        console.error(`Error liquidating loan ${loanId}:`, error);
    }
}



/**
 * Schedules event processing to continuously monitor for new NFT approvals and loan liquidations.
 */
function scheduleEventProcessing() {
    setInterval(fetchAndProcessEvents, 5000); // Checks for new NFT approvals every 5 seconds.
    setInterval(checkLoansForLiquidation, 5 * 60 * 1000); // Checks for loan liquidations every 5 minutes.
}



scheduleEventProcessing();
