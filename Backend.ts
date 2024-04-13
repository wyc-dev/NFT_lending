import axios from 'axios';
import dotenv from 'dotenv';
import contractABI from './ContractABI.json';
import { ethers } from 'ethers';

dotenv.config();



interface FloorPriceResponse {
    events: Array<{
        collection: {
            id: string;
        };
        floorAsk: {
            price: {
                currency: {
                    symbol: string;
                };
                amount: {
                    native: number;
                };
            };
        };
    }>;
}



const lendingContractAddress = "0xCoreLendingContractAddress";
const infuraProjectId = process.env.INFURA_PROJECT_ID;
const privateKey = process.env.PRIVATE_KEY;
const provider = new ethers.providers.JsonRpcProvider(`https://mainnet.infura.io/v3/${infuraProjectId}`);
const wallet = new ethers.Wallet(privateKey, provider);
const contract = new ethers.Contract(lendingContractAddress, contractABI, wallet);
let processedEvents: Set<string> = new Set(); // To track processed events



/**
 * Fetches the floor price of an NFT collection from Reservoir API.
 * @param contractAddress Address of the NFT collection.
 * @returns The floor price in native tokens or null if failed.
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
 * Fetches and processes 'NFTApprovedByUser' events from Ethereum blockchain.
 */
async function fetchAndProcessEvents() {
    const eventSignatureHash = '0xd4f07a378695181299b60937c1dbb787aedccc63e5da3c7ea89dcbd1fc7d3a3d';
    const fromBlock = 'latest'; // Adjust as necessary
    const toBlock = 'latest';

    try {
        const response = await axios.post(`https://mainnet.infura.io/v3/${infuraProjectId}`, {
            jsonrpc: '2.0',
            method: 'eth_getLogs',
            params: [{
                address: lendingContractAddress,
                fromBlock: fromBlock,
                toBlock: toBlock,
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
 * Processes a single event to create a loan.
 * @param event Event data including NFT address and ID.
 */
async function processEvent(event: any) {
    const { data, topics } = event;
    const nftAddress = '0x' + data.slice(26, 66); // Extract from data if needed
    const nftId = ethers.BigNumber.from('0x' + data.slice(66, 130)).toString();
    const floorPrice = await getNFTFloorPrice(nftAddress);

    if (floorPrice) {
        const loanAmount = ethers.utils.parseEther((floorPrice * 0.7).toString());
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
 * Repeatedly monitors for new NFT approvals and initiates loan processing.
 */
function scheduleEventProcessing() {
    setInterval(fetchAndProcessEvents, 5000); // Runs every 5 seconds
}



scheduleEventProcessing();
