
import dotenv from 'dotenv';
import { ethers } from 'ethers';
dotenv.config();

async function main() {
    console.log("Testing Blockchain Connection...");
    
    const rpcUrl = process.env.FLARE_RPC_URL || 'https://coston2-api.flare.network/ext/C/rpc';
    console.log(`RPC URL: ${rpcUrl}`);
    
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    
    try {
        const network = await provider.getNetwork();
        console.log(`Connected to network: ${network.name} (Chain ID: ${network.chainId})`);
    } catch (e) {
        console.error("FATAL: Could not connect to RPC.");
        console.error(e);
        return;
    }

    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
        console.error("No PRIVATE_KEY in .env");
        return;
    }

    const wallet = new ethers.Wallet(privateKey, provider);
    console.log(`Wallet Address: ${wallet.address}`);
    
    const balance = await provider.getBalance(wallet.address);
    console.log(`Wallet Balance: ${ethers.formatEther(balance)} FLR/C2FLR`);

    if (balance === 0n) {
        console.error("WARNING: Wallet has 0 balance. Transactions will fail.");
    } else {
         console.log("✅ Wallet funded.");
    }
}

main().catch(console.error);
