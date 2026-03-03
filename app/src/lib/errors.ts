import { AnchorError } from "@coral-xyz/anchor";
import { SendTransactionError } from "@solana/web3.js";

/**
 * Parses complex Solana/Anchor errors into user-friendly messages.
 * Avoids showing code characters, stack traces, or technical jargon.
 */
export function parseError(error: any): string {
    if (!error) return "An unknown error occurred.";

    console.log("Parsing error:", error);

    // 1. Handle Anchor Errors (Smart Contract Violations)
    if (error instanceof AnchorError || error.name === "AnchorError") {
        const msg = error.error?.message || error.message;

        // Fine-tune specific common contract errors
        if (msg.includes("MinPayoutNotMet")) return "Payout amount is below the required minimum.";
        if (msg.includes("PayoutNotDivisible")) return "Payout must be perfectly divisible by the number of members. Try a slightly different amount.";
        if (msg.includes("InvalidPayoutAmount")) return "Invalid payout amount provided.";
        if (msg.includes("InvalidMemberCount")) return "Groups must have between 2 and 20 members.";
        if (msg.includes("InvalidRoundInterval")) return "Savings interval must be Daily, Weekly, Monthly, or Yearly.";
        if (msg.includes("GroupFull")) return "This group is already full.";
        if (msg.includes("AlreadyJoined")) return "You have already joined this group.";
        if (msg.includes("InsufficientCollateral")) return "You don't have enough funds for the required collateral.";

        return msg;
    }

    // 2. Handle Transaction Simulation Errors
    if (error instanceof SendTransactionError || error.name === "SendTransactionError") {
        const logs = error.logs || [];
        const logContent = logs.join(" ");

        if (logContent.includes("Attempt to debit an account but found no record of a prior credit")) {
            return "Your wallet is empty or doesn't have enough funds to cover this transaction.";
        }

        if (logContent.includes("insufficient lamports")) {
            return "Insufficient funds to complete this transaction.";
        }

        if (logContent.includes("already in use")) {
            return "A group with this name already exists for your wallet. Please choose a different name.";
        }

        if (logContent.includes("insufficient funds for rent")) {
            return "Your wallet balance is too low to cover the network rent and fees for this group.";
        }
    }

    // 3. Handle Wallet/User rejection
    const errMsg = error.message?.toLowerCase() || "";
    if (errMsg.includes("user rejected")) return "Transaction cancelled by user.";
    if (errMsg.includes("wallet not connected")) return "Please connect your wallet first.";

    // 4. General simulation failures
    if (errMsg.includes("simulation failed")) {
        if (errMsg.includes("prior credit")) return "Insufficient funds in your wallet to start this transaction.";
        if (errMsg.includes("insufficient funds for rent")) return "Your wallet balance is too low to cover network rent requirements.";
        return "Transaction simulation failed. This usually happens due to insufficient funds or network congestion.";
    }

    // Fallback: Clean up the raw message
    return error.message
        ?.replace(/AnchorError thrown in.*?\./g, "")
        ?.replace(/Error Code:.*?\./g, "")
        ?.replace(/Error Number:.*?\./g, "")
        ?.trim() || "Transaction failed. Please try again.";
}
