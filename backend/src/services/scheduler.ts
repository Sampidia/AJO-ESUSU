import cron from "node-cron";
import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import { AnchorProvider, Program, Wallet } from "@coral-xyz/anchor";
import bs58 from "bs58";
import { NotificationType, NotificationStatus } from "@prisma/client";
import { NotificationRouter } from "./router";
import { prisma } from "../lib/prisma";
import ajoIdl from "../idl/ajo.json";
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from "@solana/spl-token";


const PROGRAM_ID = new PublicKey("CR6pmRS8pcrc2grm2Hiq8Ny9fhvRV7mx6dYN5Bbs829X");

const getVaultAddress = (group: PublicKey) => {
    return PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), group.toBuffer()],
        PROGRAM_ID
    )[0];
};

const getMemberAddress = (group: PublicKey, member: PublicKey) => {
    return PublicKey.findProgramAddressSync(
        [Buffer.from("member"), group.toBuffer(), member.toBuffer()],
        PROGRAM_ID
    )[0];
};

const getRoundAddress = (group: PublicKey, roundNumber: number) => {
    return PublicKey.findProgramAddressSync(
        [Buffer.from("round"), group.toBuffer(), Buffer.from([roundNumber])],
        PROGRAM_ID
    )[0];
};

export class SchedulerService {
    private connection: Connection | null = null;
    private program: Program | null = null;
    private keypair: Keypair | null = null;

    private async getProgram() {
        if (this.program) return this.program;

        const keeperKey = process.env.KEEPER_PRIVATE_KEY;
        if (!keeperKey) throw new Error("KEEPER_PRIVATE_KEY missing");

        this.keypair = Keypair.fromSecretKey(bs58.decode(keeperKey));
        this.connection = new Connection(process.env.RPC_URL || "https://api.devnet.solana.com", "confirmed");
        const provider = new AnchorProvider(this.connection, new Wallet(this.keypair), { commitment: "confirmed" });
        this.program = new Program(ajoIdl as any, provider);
        return this.program;
    }

    start() {
        console.log("⏰ Starting Cron Scheduler...");

        // Run every 30 seconds for responsive testing of reminders
        cron.schedule("*/30 * * * * *", async () => {
            console.log("🔍 [DEBUG] Reminder check start...");
            try {
                await this.checkReminders();
            } catch (err) {
                console.error("❌ checkReminders failed:", err);
            }
        });

        // Run automation check every minute
        cron.schedule("*/1 * * * *", async () => {
            console.log("🤖 Running Automation (Auto-Pull & Payouts)...");
            try {
                await this.runAutomation();
            } catch (err) {
                console.error("❌ runAutomation failed:", err);
            }
        });
    }

    public async runAutomation() {
        try {
            await this.getProgram(); // Ensure initialized

            // Isolate each step so one network failure doesn't abort the others
            try {
                await this.checkAutoPulls();
            } catch (e: any) {
                if (!e.message?.includes("fetch failed") && e.name !== "TypeError") console.error("❌ checkAutoPulls failed:", e);
            }

            await new Promise(r => setTimeout(r, 1000));

            try {
                await this.checkPayouts();
            } catch (e: any) {
                if (!e.message?.includes("fetch failed") && e.name !== "TypeError") console.error("❌ checkPayouts failed:", e);
            }

            await new Promise(r => setTimeout(r, 1000));

            try {
                await this.checkCollateralRefunds();
            } catch (e: any) {
                if (!e.message?.includes("fetch failed") && e.name !== "TypeError") console.error("❌ checkCollateralRefunds failed:", e);
            }

        } catch (error: any) {
            const errStr = error.message || error.toString() || "";
            const isNetworkError =
                errStr.includes("fetch failed") ||
                errStr.includes("Server selection timeout") ||
                error.name === "TypeError" ||
                error.name === "PrismaClientKnownRequestError" ||
                error.code === "P2010" ||
                error.stack?.includes("undici") ||
                error.code === "ECONNREFUSED" ||
                error.code === "ETIMEDOUT";

            if (isNetworkError) {
                console.log("📡 Network/Database Issue: Skipping automation run (transient error).");
            } else {
                console.error("❌ Automation run failed with unexpected error:", error);
            }
        }
    }

    public async checkReminders() {
        const now = new Date();
        const TEST_MODE = true;

        // Lookahead: Increased to 48h while in TEST_MODE so we can always see the countdown 
        // for "Tomorrow's" rounds in the console. Firing still happens at 2m/1m.
        const lookaheadMs = TEST_MODE ? (48 * 60 * 60 * 1000) : (24 * 60 * 60 * 1000);
        const nextCheck = new Date(now.getTime() + lookaheadMs);

        try {
            const upcomingRounds = await prisma.round.findMany({
                where: {
                    isCompleted: false,
                    dueDate: {
                        gt: now,
                        lte: nextCheck
                    }
                },
                include: {
                    group: {
                        include: { members: true }
                    }
                }
            });

            if (TEST_MODE && upcomingRounds.length > 0) {
                console.log(`🔍 [TEST] Found ${upcomingRounds.length} rounds. Evaluating thresholds...`);
            }

            for (const round of upcomingRounds) {
                const minsDiff = (round.dueDate.getTime() - now.getTime()) / (1000 * 60);

                if (TEST_MODE) {
                    console.log(`⏳ Round: ${round.group.name} #${round.roundNumber} | Due in: ${minsDiff.toFixed(2)} mins`);
                }

                let type: NotificationType | null = null;
                let title = "";
                let message = "";

                const urgentThreshold = TEST_MODE ? 1 : (5 * 60);
                const warningThreshold = TEST_MODE ? 2 : (24 * 60);

                if (minsDiff <= urgentThreshold) {
                    type = NotificationType.CONTRIBUTION_REMINDER_24H;
                    title = TEST_MODE ? "⏰ Urgent: 1 min left!" : "⏳ 5h Left to Contribute!";
                    message = TEST_MODE
                        ? "TEST: 1 minute until contribution is debited from collateral!"
                        : "Your contribution is due in less than 5 hours.";
                } else if (minsDiff <= warningThreshold) {
                    type = NotificationType.CONTRIBUTION_REMINDER_48H;
                    title = TEST_MODE ? "🔔 Warning: 2 mins left!" : "🔔 24h Contribution Reminder";
                    message = TEST_MODE
                        ? "TEST: 2 minutes until contribution is debited from collateral."
                        : "Your contribution is due in 24 hours.";
                }

                if (type) {
                    console.log(`🎯 Reminder Window Triggered (${type}) for Round ${round.roundNumber}`);

                    let contributionsReceived: boolean[] = [];
                    try {
                        const program = await this.getProgram();
                        const [roundPda] = PublicKey.findProgramAddressSync(
                            [Buffer.from("round"), new PublicKey(round.group.onChainPublicKey).toBuffer(), Buffer.from([round.roundNumber])],
                            PROGRAM_ID
                        );

                        let onChainRound: any = null;
                        for (let attempt = 0; attempt < 2; attempt++) {
                            try {
                                onChainRound = await (program.account as any).roundState.fetch(roundPda);
                                break;
                            } catch (e) {
                                if (attempt === 0) await new Promise(r => setTimeout(r, 1000));
                            }
                        }

                        if (!onChainRound) {
                            console.log(`📡 Skipping reminder check for ${round.group.name} Round ${round.roundNumber}: RPC Timeout.`);
                            continue;
                        }
                        contributionsReceived = onChainRound.contributionsReceived;
                        console.log(`📊 On-chain Status for Rd ${round.roundNumber}: [${contributionsReceived.join(", ")}]`);
                    } catch (e) {
                        console.error("❌ On-chain fetch failed in reminders:", e);
                        continue;
                    }

                    for (const member of round.group.members) {
                        const hasPaid = contributionsReceived[member.rotationPosition];
                        console.log(`👤 Checking Member: ${member.publicKey.slice(0, 8)}... (Pos: ${member.rotationPosition}, Paid: ${hasPaid})`);

                        if (hasPaid) continue;

                        const existing = await prisma.notification.findFirst({
                            where: {
                                memberId: member.id,
                                roundId: round.id,
                                type: type,
                                status: { in: [NotificationStatus.SENT, NotificationStatus.PENDING] }
                            }
                        });

                        if (!existing) {
                            console.log(`📧 Dispatching ${type} to ${member.publicKey.slice(0, 8)}...`);
                            await NotificationRouter.dispatch(member.id, type, title, message, round.id);
                        } else {
                            console.log(`⏭️ Already notified ${member.publicKey.slice(0, 8)}... for this type.`);
                        }
                    }
                }
            }

            // 2. Fetch late payments (due date passed)
            const lateRounds = await prisma.round.findMany({
                where: {
                    isCompleted: false,
                    dueDate: {
                        lt: now
                    }
                },
                include: {
                    group: {
                        include: { members: true }
                    }
                }
            });

            for (const round of lateRounds) {
                // Check late payments

                // Fetch on-chain status to identify defaulters
                let contributionsReceived: boolean[] = [];
                try {
                    const program = await this.getProgram();
                    const [roundPda] = PublicKey.findProgramAddressSync(
                        [Buffer.from("round"), new PublicKey(round.group.onChainPublicKey).toBuffer(), Buffer.from([round.roundNumber])],
                        PROGRAM_ID
                    );

                    let onChainRound: any = null;
                    for (let attempt = 0; attempt < 2; attempt++) {
                        try {
                            onChainRound = await (program.account as any).roundState.fetch(roundPda);
                            break;
                        } catch (e) {
                            if (attempt === 0) await new Promise(r => setTimeout(r, 1000));
                        }
                    }

                    if (!onChainRound) {
                        console.log(`📡 Skipping late alert check for ${round.group.name} Round ${round.roundNumber}: RPC Timeout.`);
                        continue;
                    }
                    contributionsReceived = onChainRound.contributionsReceived;
                } catch (e) {
                    continue; // Skip if we can't verify status
                }

                for (const member of round.group.members) {
                    // SKIP if member already contributed
                    if (contributionsReceived[member.rotationPosition]) continue;

                    // Only send if not sent recently (e.g. within last 12h) to avoid spamming
                    // Only send if not sent recently (e.g. within last 12h) (successfully)
                    const existing = await prisma.notification.findFirst({
                        where: {
                            memberId: member.id,
                            roundId: round.id,
                            type: NotificationType.LATE_PAYMENT_ALERT,
                            status: NotificationStatus.SENT,
                            createdAt: {
                                gt: new Date(now.getTime() - 12 * 60 * 60 * 1000)
                            }
                        }
                    });

                    if (!existing) {
                        await NotificationRouter.dispatch(
                            member.id,
                            NotificationType.LATE_PAYMENT_ALERT,
                            "⚠️ LATE PAYMENT ALERT",
                            `Your payment for round #${round.roundNumber} in ${round.group.name} is overdue! Please contribute ASAP to avoid automatic debit from your collateral.`,
                            round.id
                        );
                    }
                }
            }
        } catch (error) {
            const errStr = (error as any).message || "";
            if (errStr.includes("fetch failed") || (error as any).name === "TypeError") {
                console.log("📡 Network Issue: Aborting checkReminders (RPC unstable).");
            } else {
                console.error("❌ Error in Scheduler checkReminders:", error);
            }
        }

        console.log("✅ Reminder check complete.");
    }

    private async checkAutoPulls() {
        try {
            const program = await this.getProgram();
            const actionableRounds = await prisma.round.findMany({
                where: { isCompleted: false },
                include: { group: { include: { members: true } } }
            });

            for (const round of actionableRounds) {
                const [roundPda] = PublicKey.findProgramAddressSync(
                    [Buffer.from("round"), new PublicKey(round.group.onChainPublicKey).toBuffer(), Buffer.from([round.roundNumber])],
                    PROGRAM_ID
                );

                try {
                    // Fetch on-chain round with retry
                    let onChainRound: any = null;
                    for (let attempt = 0; attempt < 3; attempt++) {
                        try {
                            onChainRound = await (program.account as any).roundState.fetch(roundPda);
                            break;
                        } catch (e) {
                            if (attempt < 2) await new Promise(r => setTimeout(r, 1000));
                        }
                    }

                    if (!onChainRound) {
                        console.log(`📡 Network Issue: Skipping auto-pull check for round ${round.roundNumber} in ${round.group.name} (RPC Timeout).`);
                        continue;
                    }

                    // Sync completed state if payout already sent on-chain
                    if (onChainRound.payoutSent && !round.isCompleted) {
                        console.log(`🔄 Syncing: Marking ${round.group.name} Round ${round.roundNumber} as completed (detected on-chain).`);
                        await prisma.round.update({
                            where: { id: round.id },
                            data: { isCompleted: true }
                        });
                        continue;
                    }

                    const now = Math.floor(Date.now() / 1000);
                    if (now >= onChainRound.graceEndTimestamp.toNumber()) {
                        for (let i = 0; i < round.group.members.length; i++) {
                            if (!onChainRound.contributionsReceived[i]) {
                                const member = round.group.members.find((m: any) => m.rotationPosition === i);
                                if (!member) continue;

                                const [memberPda] = PublicKey.findProgramAddressSync(
                                    [Buffer.from("member"), new PublicKey(round.group.onChainPublicKey).toBuffer(), new PublicKey(member.publicKey).toBuffer()],
                                    PROGRAM_ID
                                );

                                let success = false;
                                for (let attempt = 0; attempt < 3; attempt++) {
                                    try {
                                        console.log(`🤖 Auto-Pull Checking: ${member.publicKey} in ${round.group.name} (Attempt ${attempt + 1}/3)`);
                                        await program.methods
                                            .autoPull(i)
                                            .accounts({
                                                caller: this.keypair!.publicKey,
                                                groupState: new PublicKey(round.group.onChainPublicKey),
                                                memberState: memberPda,
                                                roundState: roundPda,
                                            })
                                            .rpc();
                                        success = true;
                                        break;
                                    } catch (error: any) {
                                        const errStr = error.message || error.toString() || "";
                                        const isNetwork = errStr.includes("fetch failed") || error.name === "TypeError";
                                        if (isNetwork && attempt < 2) {
                                            console.log(`📡 Network blip during auto-pull for ${member.publicKey}. Retrying in 1s...`);
                                            await new Promise(r => setTimeout(r, 1000));
                                        } else {
                                            if (isNetwork) {
                                                console.log(`📡 Network Issue: Skipping auto-pull for ${member.publicKey} after 3 attempts.`);
                                            } else {
                                                console.error(`❌ Auto-Pull failed for ${member.publicKey}:`, error.message || error);
                                            }
                                            break;
                                        }
                                    }
                                }
                                if (success) await new Promise(r => setTimeout(r, 500)); // Pace rpc calls
                            }
                        }
                    }
                } catch (e: any) {
                    const errStr = e.message || e.toString() || "";
                    if (errStr.includes("fetch failed") || e.name === "TypeError") {
                        console.log(`📡 Network Issue: Skipping auto-pull check for round ${round.roundNumber} in ${round.group.name} (RPC Timeout).`);
                    } else {
                        console.error(`❌ Auto-pull round fetch failed for ${round.group.name}:`, e.message || e);
                    }
                }
            }
        } catch (error) {
            const errStr = (error as any).message || "";
            if (errStr.includes("fetch failed") || (error as any).name === "TypeError") {
                console.log("📡 Network Issue: Aborting auto-pull outer loop (RPC unstable).");
            } else {
                console.error("❌ Error in checkAutoPulls:", error);
            }
        }
    }

    private async checkPayouts() {
        try {
            const program = await this.getProgram();
            const activeGroups = await prisma.group.findMany({
                where: { status: "active" }
            });

            for (const group of activeGroups) {
                const [roundPda] = PublicKey.findProgramAddressSync(
                    [Buffer.from("round"), new PublicKey(group.onChainPublicKey).toBuffer(), Buffer.from([group.currentRound])],
                    PROGRAM_ID
                );

                try {
                    // Fetch on-chain round with retry
                    let onChainRound: any = null;
                    for (let attempt = 0; attempt < 3; attempt++) {
                        try {
                            onChainRound = await (program.account as any).roundState.fetch(roundPda);
                            break;
                        } catch (e) {
                            if (attempt < 2) await new Promise(r => setTimeout(r, 1000));
                        }
                    }

                    if (!onChainRound) {
                        console.log(`📡 Network Issue: Skipping payout check for ${group.name} Round ${group.currentRound} (RPC Timeout).`);
                        continue;
                    }

                    // 1. Sync completed state if payout already sent on-chain
                    const localRound = await prisma.round.findUnique({
                        where: { groupId_roundNumber: { groupId: group.id, roundNumber: group.currentRound } }
                    });

                    if (onChainRound.payoutSent && localRound && !localRound.isCompleted) {
                        console.log(`🔄 Syncing: Marking ${group.name} Round ${group.currentRound} as completed (detected on-chain).`);
                        await prisma.round.update({
                            where: { id: localRound.id },
                            data: { isCompleted: true, payoutStarted: true }
                        });
                        continue;
                    }

                    // 2. Check if all members have contributed
                    const allContributed = onChainRound.contributionsReceived.every((c: boolean) => c === true);

                    if (allContributed && !onChainRound.payoutSent && localRound && !localRound.payoutStarted && !localRound.isCompleted) {
                        console.log(`🤖 Executing Payout for ${group.name} Round ${group.currentRound}`);

                        // Lock the payout locally immediately
                        await prisma.round.update({
                            where: { id: localRound.id },
                            data: { payoutStarted: true }
                        });

                        // Need to resolve the recipient based on rotation position
                        const recipientIndex = (group.currentRound - 1) % group.memberCount;

                        if (isNaN(recipientIndex) || recipientIndex < 0) {
                            console.warn(`⚠️ Invalid recipient index ${recipientIndex} for group ${group.name}. Skipping payout check.`);
                            continue;
                        }

                        const member = await prisma.member.findFirst({
                            where: { groupId: group.id, rotationPosition: recipientIndex }
                        });

                        if (!member) {
                            console.error(`❌ Recipient not found for position ${recipientIndex} in group ${group.id}`);
                            continue;
                        }

                        const [vaultPda] = PublicKey.findProgramAddressSync(
                            [Buffer.from("vault"), new PublicKey(group.onChainPublicKey).toBuffer()],
                            PROGRAM_ID
                        );

                        let nextRoundPda = null;
                        if (group.currentRound < group.memberCount) {
                            [nextRoundPda] = PublicKey.findProgramAddressSync(
                                [Buffer.from("round"), new PublicKey(group.onChainPublicKey).toBuffer(), Buffer.from([group.currentRound + 1])],
                                PROGRAM_ID
                            );
                        }

                        try {
                            const mint = group.mint ? new PublicKey(group.mint) : null;
                            const recipientPubKey = new PublicKey(member.publicKey);

                            // Placeholder management to avoid account duplication in Anchor.
                            const dummy1 = Keypair.generate().publicKey;
                            const dummy2 = Keypair.generate().publicKey;
                            const dummy3 = Keypair.generate().publicKey;
                            const dummy4 = Keypair.generate().publicKey;

                            let accounts: any = {
                                caller: this.keypair!.publicKey,
                                groupState: new PublicKey(group.onChainPublicKey),
                                roundState: roundPda,
                                vault: vaultPda,
                                recipient: recipientPubKey,
                                platformWallet: dummy4, // Unused but mut, use dummy to avoid conflict
                                nextRoundState: nextRoundPda || dummy1,
                                systemProgram: PublicKey.default,
                            };

                            if (mint) {
                                const vaultAta = getAssociatedTokenAddressSync(mint, vaultPda, true);
                                const recipientAta = getAssociatedTokenAddressSync(mint, recipientPubKey);

                                accounts = {
                                    ...accounts,
                                    mint: mint,
                                    vaultTokenAccount: vaultAta,
                                    recipientTokenAccount: recipientAta,
                                    tokenProgram: TOKEN_PROGRAM_ID,
                                };
                            } else {
                                accounts = {
                                    ...accounts,
                                    mint: PublicKey.default,
                                    vaultTokenAccount: dummy2,
                                    recipientTokenAccount: dummy3,
                                    tokenProgram: TOKEN_PROGRAM_ID,
                                };
                            }

                            const tx = await program.methods
                                .payoutRound()
                                .accounts(accounts)
                                .rpc();

                            console.log(`✅ Payout Successful: ${tx}`);
                        } catch (err: any) {
                            const errStr = err.message || "";
                            if (errStr.includes("Payout already sent") || errStr.includes("AlreadyProcessed")) {
                                await prisma.round.update({
                                    where: { id: localRound.id },
                                    data: { isCompleted: true, payoutStarted: true }
                                });
                            } else if (!errStr.includes("fetch failed") && err.name !== "TypeError") {
                                await prisma.round.update({
                                    where: { id: localRound.id },
                                    data: { payoutStarted: false }
                                });
                                console.error(`❌ Payout Transaction Failed for ${group.name}: ${errStr}`);
                            } else {
                                console.log(`📡 Network Issue: Payout RPC failed for ${group.name} (will retry).`);
                            }
                        }
                    }
                } catch (e: any) {
                    const errStr = e.message || "";
                    if (!errStr.includes("fetch failed") && e.name !== "TypeError") {
                        console.error(`❌ Error checking payouts for ${group.name}:`, e);
                    }
                }
            }
        } catch (error) {
            const errStr = (error as any).message || "";
            if (errStr.includes("fetch failed") || (error as any).name === "TypeError") {
                console.log("📡 Network Issue: Aborting payout outer loop (RPC unstable).");
            } else {
                console.error("❌ Error in checkPayouts:", error);
            }
        }
    }

    private async checkCollateralRefunds() {
        try {
            const program = await this.getProgram();
            const completedGroups = await prisma.group.findMany({
                where: { status: "completed" },
                include: { members: true }
            });

            for (const group of completedGroups) {
                const groupPubKey = new PublicKey(group.onChainPublicKey);
                const vaultPda = getVaultAddress(groupPubKey);
                const finalRoundPda = getRoundAddress(groupPubKey, group.memberCount);

                // Verification: Does the final round actually exist?
                try {
                    const finalRoundAccount = await this.connection?.getAccountInfo(finalRoundPda);
                    if (!finalRoundAccount) {
                        console.warn(`⚠️ Skipping refund for '${group.name}': Final round account ${finalRoundPda} does not exist yet.`);
                        continue;
                    }
                } catch (e) {
                    console.error(`❌ Error checking final round for '${group.name}':`, e);
                    continue;
                }

                for (const member of group.members) {
                    const memberPda = getMemberAddress(groupPubKey, new PublicKey(member.publicKey));

                    try {
                        let success = false;
                        for (let attempt = 0; attempt < 3; attempt++) {
                            try {
                                const mState: any = await (program.account as any).memberState.fetch(memberPda);
                                if (mState.collateralBalance.toNumber() > 0) {
                                    console.log(`🤖 Refunding Collateral: ${member.publicKey} in ${group.name} (Attempt ${attempt + 1}/3)`);
                                    const mint = group.mint ? new PublicKey(group.mint) : null;
                                    const memberPubKey = new PublicKey(member.publicKey);

                                    // Placeholder management to avoid account duplication.
                                    const dummy1 = Keypair.generate().publicKey;
                                    const dummy2 = Keypair.generate().publicKey;

                                    let accounts: any = {
                                        caller: (program.provider as any).publicKey,
                                        groupState: groupPubKey,
                                        finalRoundState: finalRoundPda,
                                        memberState: memberPda,
                                        vault: vaultPda,
                                        memberWallet: memberPubKey,
                                    };

                                    if (mint) {
                                        const vaultAta = getAssociatedTokenAddressSync(mint, vaultPda, true);
                                        const memberAta = getAssociatedTokenAddressSync(mint, memberPubKey);

                                        accounts = {
                                            ...accounts,
                                            mint: mint,
                                            vaultTokenAccount: vaultAta,
                                            memberTokenAccount: memberAta,
                                        };
                                    } else {
                                        accounts = {
                                            ...accounts,
                                            mint: PublicKey.default,
                                            vaultTokenAccount: dummy1,
                                            memberTokenAccount: dummy2,
                                        };
                                    }

                                    const tx = await program.methods
                                        .refundCollateral()
                                        .accounts(accounts)
                                        .rpc();
                                    console.log(`✅ Refund Successful: ${tx}`);

                                    // Notify member
                                    const factor = group.mint ? 1e6 : 1e9;
                                    const symbol = group.mint ? "USDC" : "SOL";
                                    await NotificationRouter.dispatch(
                                        member.id,
                                        NotificationType.COLLATERAL_REFUNDED,
                                        "Collateral Refunded! 💰",
                                        `Your collateral balance of ${(mState.collateralBalance.toNumber() / factor).toFixed(group.mint ? 2 : 4)} ${symbol} for '${group.name}' has been automatically refunded to your wallet.`
                                    );
                                    await new Promise(r => setTimeout(r, 500)); // Pace rpc calls
                                }
                                success = true;
                                break;
                            } catch (error: any) {
                                const errStr = error.message || error.toString() || "";
                                const isNetwork = errStr.includes("fetch failed") || error.name === "TypeError" || errStr.includes("Timeout");
                                if (isNetwork && attempt < 2) {
                                    console.warn(`📡 Network blip during refund for ${member.publicKey}. Retrying in 2s...`);
                                    await new Promise(r => setTimeout(r, 2000));
                                } else {
                                    if (isNetwork) {
                                        console.log(`📡 Network Issue: Skipping refund check for ${member.publicKey} after 3 attempts.`);
                                    } else {
                                        console.error(`❌ Refund failed for ${member.publicKey}:`, error.message || error);
                                    }
                                    break;
                                }
                            }
                        }
                    } catch (outerError) {
                        console.error(`❌ Unexpected error in refund loop for ${member.publicKey}:`, outerError);
                    }
                }
            }
        } catch (error) {
            const errStr = (error as any).message || "";
            if (errStr.includes("fetch failed") || (error as any).name === "TypeError") {
                console.log("📡 Network Issue: Aborting collateral refund outer loop (RPC unstable).");
            } else {
                console.error("❌ Error in checkCollateralRefunds:", error);
            }
        }
    }
}
