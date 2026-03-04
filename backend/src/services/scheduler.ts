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
        const lookaheadMs = TEST_MODE ? (48 * 60 * 60 * 1000) : (24 * 60 * 60 * 1000);
        const nextCheck = new Date(now.getTime() + lookaheadMs);

        try {
            const upcomingRounds = await prisma.round.findMany({
                where: {
                    isCompleted: false,
                    dueDate: { gt: now, lte: nextCheck }
                }
            });

            for (const round of upcomingRounds) {
                const group = await prisma.group.findUnique({
                    where: { id: round.groupId },
                    include: { members: true }
                });

                if (!group) {
                    console.warn(`⚠️ Cleaning up orphaned round ${round.id} (Group ${round.groupId} missing)`);
                    await prisma.round.delete({ where: { id: round.id } }).catch(() => { });
                    continue;
                }

                const minsDiff = (round.dueDate.getTime() - now.getTime()) / (1000 * 60);
                if (TEST_MODE) {
                    console.log(`⏳ Round: ${group.name} #${round.roundNumber} | Due in: ${minsDiff.toFixed(2)} mins`);
                }

                let type: NotificationType | null = null;
                let title = "";
                let message = "";

                const urgentThreshold = TEST_MODE ? 1 : (5 * 60);
                const warningThreshold = TEST_MODE ? 2 : (24 * 60);

                if (minsDiff <= urgentThreshold) {
                    type = NotificationType.CONTRIBUTION_REMINDER_24H;
                    title = TEST_MODE ? "⏰ Urgent: 1 min left!" : "⏳ 5h Left to Contribute!";
                    message = TEST_MODE ? "TEST: 1 minute until contribution is debited from collateral!" : "Your contribution is due in less than 5 hours.";
                } else if (minsDiff <= warningThreshold) {
                    type = NotificationType.CONTRIBUTION_REMINDER_48H;
                    title = TEST_MODE ? "🔔 Warning: 2 mins left!" : "🔔 24h Contribution Reminder";
                    message = TEST_MODE ? "TEST: 2 minutes until contribution is debited from collateral." : "Your contribution is due in 24 hours.";
                }

                if (type) {
                    console.log(`🎯 Reminder Window Triggered (${type}) for Round ${round.roundNumber}`);
                    let contributionsReceived: boolean[] = [];
                    try {
                        const program = await this.getProgram();
                        const [roundPda] = PublicKey.findProgramAddressSync(
                            [Buffer.from("round"), new PublicKey(group.onChainPublicKey).toBuffer(), Buffer.from([round.roundNumber])],
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
                            console.log(`📡 Skipping reminder check for ${group.name} Round ${round.roundNumber}: RPC Timeout.`);
                            continue;
                        }
                        contributionsReceived = onChainRound.contributionsReceived;
                    } catch (e) {
                        console.error("❌ On-chain fetch failed in reminders:", e);
                        continue;
                    }

                    for (const member of group.members) {
                        const hasPaid = contributionsReceived[member.rotationPosition];
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
                        }
                    }
                }
            }

            // 2. Late payments
            const lateRounds = await prisma.round.findMany({
                where: { isCompleted: false, dueDate: { lt: now } }
            });

            for (const round of lateRounds) {
                const group = await prisma.group.findUnique({
                    where: { id: round.groupId },
                    include: { members: true }
                });

                if (!group) {
                    console.warn(`⚠️ Cleaning up orphaned round ${round.id} (Group ${round.groupId} missing)`);
                    await prisma.round.delete({ where: { id: round.id } }).catch(() => { });
                    continue;
                }

                let contributionsReceived: boolean[] = [];
                try {
                    const program = await this.getProgram();
                    const [roundPda] = PublicKey.findProgramAddressSync(
                        [Buffer.from("round"), new PublicKey(group.onChainPublicKey).toBuffer(), Buffer.from([round.roundNumber])],
                        PROGRAM_ID
                    );

                    let onChainRound: any = null;
                    for (let attempt = 0; attempt < 1; attempt++) {
                        try {
                            onChainRound = await (program.account as any).roundState.fetch(roundPda);
                            break;
                        } catch (e) { }
                    }

                    if (!onChainRound) continue;
                    contributionsReceived = onChainRound.contributionsReceived;
                } catch (e) { continue; }

                for (const member of group.members) {
                    if (contributionsReceived[member.rotationPosition]) continue;
                    const existing = await prisma.notification.findFirst({
                        where: {
                            memberId: member.id,
                            roundId: round.id,
                            type: NotificationType.LATE_PAYMENT_ALERT,
                            status: NotificationStatus.SENT,
                            createdAt: { gt: new Date(now.getTime() - 12 * 60 * 60 * 1000) }
                        }
                    });

                    if (!existing) {
                        await NotificationRouter.dispatch(
                            member.id,
                            NotificationType.LATE_PAYMENT_ALERT,
                            "⚠️ LATE PAYMENT ALERT",
                            `Your payment for round #${round.roundNumber} in ${group.name} is overdue! Please contribute ASAP to avoid automatic debit from your collateral.`,
                            round.id
                        );
                    }
                }
            }
        } catch (error) {
            console.error("❌ Error in checkReminders:", error);
        }
        console.log("✅ Reminder check complete.");
    }

    private async checkAutoPulls() {
        try {
            const program = await this.getProgram();
            const actionableRounds = await prisma.round.findMany({
                where: { isCompleted: false },
            });

            for (const round of actionableRounds) {
                const group = await prisma.group.findUnique({
                    where: { id: round.groupId },
                    include: { members: true }
                });

                if (!group) {
                    console.warn(`⚠️ Cleaning up orphaned round ${round.id} (Group ${round.groupId} missing)`);
                    await prisma.round.delete({ where: { id: round.id } }).catch(() => { });
                    continue;
                }

                const [roundPda] = PublicKey.findProgramAddressSync(
                    [Buffer.from("round"), new PublicKey(group.onChainPublicKey).toBuffer(), Buffer.from([round.roundNumber])],
                    PROGRAM_ID
                );

                try {
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
                        console.log(`📡 Network Issue: Skipping auto-pull check for round ${round.roundNumber} in ${group.name} (RPC Timeout).`);
                        continue;
                    }

                    if (onChainRound.payoutSent && !round.isCompleted) {
                        console.log(`🔄 Syncing: Marking ${group.name} Round ${round.roundNumber} as completed (detected on-chain).`);
                        await prisma.round.update({
                            where: { id: round.id },
                            data: { isCompleted: true }
                        });
                        continue;
                    }

                    const now = Math.floor(Date.now() / 1000);
                    if (now >= onChainRound.graceEndTimestamp.toNumber()) {
                        for (let i = 0; i < group.members.length; i++) {
                            if (!onChainRound.contributionsReceived[i]) {
                                const member = group.members.find((m: any) => m.rotationPosition === i);
                                if (!member) continue;

                                const [memberPda] = PublicKey.findProgramAddressSync(
                                    [Buffer.from("member"), new PublicKey(group.onChainPublicKey).toBuffer(), new PublicKey(member.publicKey).toBuffer()],
                                    PROGRAM_ID
                                );

                                let success = false;
                                for (let attempt = 0; attempt < 3; attempt++) {
                                    try {
                                        console.log(`🤖 Auto-Pull Checking: ${member.publicKey} in ${group.name} (Attempt ${attempt + 1}/3)`);
                                        await program.methods
                                            .autoPull(i)
                                            .accounts({
                                                caller: this.keypair!.publicKey,
                                                groupState: new PublicKey(group.onChainPublicKey),
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
                                if (success) await new Promise(r => setTimeout(r, 500));
                            }
                        }
                    }
                } catch (e: any) {
                    console.error(`❌ Error in auto-pull check for ${group.name}:`, e.message || e);
                }
            }
        } catch (error) {
            console.error("❌ Error in checkAutoPulls:", error);
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
                    let onChainRound: any = null;
                    for (let attempt = 0; attempt < 3; attempt++) {
                        try {
                            onChainRound = await (program.account as any).roundState.fetch(roundPda);
                            break;
                        } catch (e) {
                            if (attempt < 2) await new Promise(r => setTimeout(r, 1000));
                        }
                    }

                    if (!onChainRound) continue;

                    const localRound = await prisma.round.findUnique({
                        where: { groupId_roundNumber: { groupId: group.id, roundNumber: group.currentRound } }
                    });

                    if (onChainRound.payoutSent && localRound && !localRound.isCompleted) {
                        console.log(`🔄 Syncing: Marking ${group.name} Round ${group.currentRound} as completed.`);
                        await prisma.round.update({
                            where: { id: localRound.id },
                            data: { isCompleted: true, payoutStarted: true }
                        });
                        continue;
                    }

                    const allContributed = onChainRound.contributionsReceived.every((c: boolean) => c === true);
                    if (allContributed && !onChainRound.payoutSent && localRound && !localRound.payoutStarted && !localRound.isCompleted) {
                        console.log(`🤖 Executing Payout for ${group.name} Round ${group.currentRound}`);
                        await prisma.round.update({ where: { id: localRound.id }, data: { payoutStarted: true } });

                        const recipientIndex = (group.currentRound - 1) % group.memberCount;
                        const member = await prisma.member.findFirst({
                            where: { groupId: group.id, rotationPosition: recipientIndex }
                        });

                        if (!member) continue;

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
                            const dummy = Keypair.generate().publicKey;

                            let accounts: any = {
                                caller: this.keypair!.publicKey,
                                groupState: new PublicKey(group.onChainPublicKey),
                                roundState: roundPda,
                                vault: vaultPda,
                                recipient: recipientPubKey,
                                platformWallet: dummy,
                                nextRoundState: nextRoundPda || dummy,
                                systemProgram: PublicKey.default,
                            };

                            if (mint) {
                                accounts = {
                                    ...accounts,
                                    mint: mint,
                                    vaultTokenAccount: getAssociatedTokenAddressSync(mint, vaultPda, true),
                                    recipientTokenAccount: getAssociatedTokenAddressSync(mint, recipientPubKey),
                                    tokenProgram: TOKEN_PROGRAM_ID,
                                };
                            } else {
                                accounts = {
                                    ...accounts,
                                    mint: PublicKey.default,
                                    vaultTokenAccount: dummy,
                                    recipientTokenAccount: dummy,
                                    tokenProgram: TOKEN_PROGRAM_ID,
                                };
                            }

                            const tx = await program.methods.payoutRound().accounts(accounts).rpc();
                            console.log(`✅ Payout Successful: ${tx}`);
                        } catch (err: any) {
                            const errStr = err.message || "";
                            if (errStr.includes("Payout already sent") || errStr.includes("AlreadyProcessed")) {
                                await prisma.round.update({ where: { id: localRound.id }, data: { isCompleted: true, payoutStarted: true } });
                            } else {
                                await prisma.round.update({ where: { id: localRound.id }, data: { payoutStarted: false } });
                                console.error(`❌ Payout Transaction Failed: ${errStr}`);
                            }
                        }
                    }
                } catch (e) { }
            }
        } catch (error) {
            console.error("❌ Error in checkPayouts:", error);
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

                try {
                    const finalRoundAccount = await this.connection?.getAccountInfo(finalRoundPda);
                    if (!finalRoundAccount) continue;
                } catch (e) { continue; }

                for (const member of group.members) {
                    const memberPda = getMemberAddress(groupPubKey, new PublicKey(member.publicKey));
                    try {
                        for (let attempt = 0; attempt < 3; attempt++) {
                            try {
                                const mState: any = await (program.account as any).memberState.fetch(memberPda);
                                if (mState.collateralBalance.toNumber() > 0) {
                                    console.log(`🤖 Refunding Collateral: ${member.publicKey} in ${group.name}`);
                                    const mint = group.mint ? new PublicKey(group.mint) : null;
                                    const dummy = Keypair.generate().publicKey;

                                    let accounts: any = {
                                        caller: (program.provider as any).publicKey,
                                        groupState: groupPubKey,
                                        finalRoundState: finalRoundPda,
                                        memberState: memberPda,
                                        vault: vaultPda,
                                        memberWallet: new PublicKey(member.publicKey),
                                    };

                                    if (mint) {
                                        accounts = {
                                            ...accounts,
                                            mint: mint,
                                            vaultTokenAccount: getAssociatedTokenAddressSync(mint, vaultPda, true),
                                            memberTokenAccount: getAssociatedTokenAddressSync(mint, new PublicKey(member.publicKey)),
                                        };
                                    } else {
                                        accounts = { ...accounts, mint: PublicKey.default, vaultTokenAccount: dummy, memberTokenAccount: dummy };
                                    }

                                    const tx = await program.methods.refundCollateral().accounts(accounts).rpc();
                                    console.log(`✅ Refund Successful: ${tx}`);

                                    const factor = group.mint ? 1e6 : 1e9;
                                    const symbol = group.mint ? "USDC" : "SOL";
                                    await NotificationRouter.dispatch(
                                        member.id,
                                        NotificationType.COLLATERAL_REFUNDED,
                                        "Collateral Refunded! 💰",
                                        `Your collateral balance of ${(mState.collateralBalance.toNumber() / factor).toFixed(group.mint ? 2 : 4)} ${symbol} for '${group.name}' has been automatically refunded to your wallet.`
                                    );
                                }
                                break;
                            } catch (e: any) {
                                if (attempt < 2 && e.message?.includes("fetch failed")) await new Promise(r => setTimeout(r, 2000));
                                else break;
                            }
                        }
                    } catch (e) { }
                }
            }
        } catch (error) {
            console.error("❌ Error in checkCollateralRefunds:", error);
        }
    }
}
