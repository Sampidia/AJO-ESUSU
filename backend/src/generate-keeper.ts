import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";

/**
 * Generate a new Keeper Wallet
 * Run this with: npx ts-node src/generate-keeper.ts
 */
function generate() {
    const keypair = Keypair.generate();
    const privateKey = bs58.encode(keypair.secretKey);
    const publicKey = keypair.publicKey.toBase58();

    console.log("====================================================");
    console.log("🚀 NEW AJO KEEPER WALLET GENERATED");
    console.log("====================================================");
    console.log(`Public Key:  ${publicKey}`);
    console.log(`Private Key: ${privateKey}`);
    console.log("====================================================");
    console.log("⚠️  INSTRUCTIONS:");
    console.log(`1. Copy the 'Private Key' into your backend/.env as KEEPER_PRIVATE_KEY.`);
    console.log(`2. Send a small amount of SOL (e.g., 0.1 SOL) to the 'Public Key' on Devnet.`);
    console.log("   The Keeper needs this SOL to pay for transaction fees when it");
    console.log("   automatically triggers Auto-Pulls and Payouts.");
    console.log("====================================================");
}

generate();
