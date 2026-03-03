import { Connection, PublicKey } from "@solana/web3.js";
import { NotificationRouter } from "./router";
import { NotificationType, NotificationStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AnchorProvider, Program, Wallet } from "@coral-xyz/anchor";
import ajoIdl from "../idl/ajo.json";
import { ActivityService } from "./activity";
import dotenv from "dotenv";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";



dotenv.config();

const PROGRAM_ID = new PublicKey("CR6pmRS8pcrc2grm2Hiq8Ny9fhvRV7mx6dYN5Bbs829X");
const RPC_URL = process.env.RPC_URL || "https://api.devnet.solana.com";

export class SolanaListener {
    private connection: Connection;

    constructor() {
        this.connection = new Connection(RPC_URL, {
            wsEndpoint: process.env.WS_URL,
            commitment: "confirmed"
        });
    }

    start() {
        console.log("📡 Starting Solana WebSocket Listener...");

        // Basic connection check to alert user of network issues early
        this.connection.getSlot()
            .then(slot => console.log(`🔗 Connected to Solana Devnet (Current Slot: ${slot})`))
            .catch(err => {
                const errStr = err.message || err.toString() || "";
                if (errStr.includes("fetch failed") || err.name === "TypeError") {
                    console.log("⚠️ Network Issue: Backend is having trouble reaching Solana Devnet. Will auto-retry...");
                }
            });

        this.connection.onLogs(
            PROGRAM_ID,
            (logs, ctx) => {
                this.parseLogs(logs.logs, logs.signature).catch(err => {
                    console.error("❌ Listener parseLogs error:", err);
                });
            },
            "confirmed"
        );
    }

    private async fetchOnChainGroup(groupPk: string, retryCount = 0): Promise<any> {
        try {
            const keeperKey = process.env.KEEPER_PRIVATE_KEY!;
            const keypair = Keypair.fromSecretKey(bs58.decode(keeperKey));
            const provider = new AnchorProvider(this.connection, new Wallet(keypair), { commitment: "confirmed" });
            const program = new Program(ajoIdl as any, provider);
            const onChainGroup: any = await (program.account as any).groupState.fetch(new PublicKey(groupPk));

            const intervalMap: Record<number, any> = { 0: "DAILY", 1: "WEEKLY", 2: "MONTHLY", 3: "YEARLY" };
            return {
                memberCount: onChainGroup.memberCount,
                contributionAmount: onChainGroup.contributionAmount.toString(),
                roundInterval: intervalMap[onChainGroup.roundInterval] || "WEEKLY",
                mint: onChainGroup.mint ? onChainGroup.mint.toString() : null
            };
        } catch (e: any) {
            const errStr = e.message || e.toString() || "";
            const isTimeout = errStr.includes("fetch failed") || e.name === "TypeError" || e.code === "ETIMEDOUT" || errStr.includes("Timeout");
            if (isTimeout && retryCount < 3) {
                const delay = 2000 * (retryCount + 1);
                console.warn(`📡 Network blip during group fetch for ${groupPk}. Retrying in ${delay / 1000}s... (Attempt ${retryCount + 1}/3)`);
                await new Promise(r => setTimeout(r, delay));
                return this.fetchOnChainGroup(groupPk, retryCount + 1);
            }
            if (isTimeout) {
                console.log(`📡 Network Issue: Skipping on-chain fetch for ${groupPk} after 3 attempts.`);
            } else {
                console.error(`❌ Failed to fetch on-chain group state for ${groupPk}:`, e.message || e);
            }
            return null;
        }
    }

    private async fetchOnChainRound(groupPk: string, roundNumber: number, retryCount = 0): Promise<any> {
        try {
            const keeperKey = process.env.KEEPER_PRIVATE_KEY!;
            const keypair = Keypair.fromSecretKey(bs58.decode(keeperKey));
            const provider = new AnchorProvider(this.connection, new Wallet(keypair), { commitment: "confirmed" });
            const program = new Program(ajoIdl as any, provider);

            const [roundPda] = PublicKey.findProgramAddressSync(
                [Buffer.from("round"), new PublicKey(groupPk).toBuffer(), Buffer.from([roundNumber])],
                PROGRAM_ID
            );

            const onChainRound: any = await (program.account as any).roundState.fetch(roundPda);
            return onChainRound;
        } catch (e: any) {
            const errStr = e.message || e.toString() || "";
            if (errStr.includes("Account does not exist")) return null;

            if (retryCount < 2) {
                await new Promise(r => setTimeout(r, 1000));
                return this.fetchOnChainRound(groupPk, roundNumber, retryCount + 1);
            }
            return null;
        }
    }

    private async parseLogs(logs: string[], signature: string) {
        for (const log of logs) {
            // Match Group Initialization: "Group '<Name>' initialized by <Admin>. ID: <PK>"
            const initMatch = log.match(/Group '(.*)' initialized by (\w+). ID: (\w+)/);
            if (initMatch) {
                const [_, groupName, adminPk, groupPk] = initMatch;
                console.log(`✨ New Group Initialized: ${groupName} by ${adminPk} `);

                const onChainData = await this.fetchOnChainGroup(groupPk);

                const group = await prisma.group.upsert({
                    where: { onChainPublicKey: groupPk },
                    update: {
                        name: groupName,
                        admin: adminPk,
                        memberCount: onChainData?.memberCount || 0,
                        contributionAmount: onChainData?.contributionAmount || "0",
                        roundInterval: onChainData?.roundInterval || "WEEKLY",
                        mint: onChainData?.mint
                    },
                    create: {
                        onChainPublicKey: groupPk,
                        name: groupName,
                        admin: adminPk,
                        contributionAmount: onChainData?.contributionAmount || "0",
                        roundInterval: onChainData?.roundInterval || "WEEKLY",
                        status: "filling",
                        memberCount: onChainData?.memberCount || 0,
                        mint: onChainData?.mint
                    }
                });

                // Find or create global User
                const user = await prisma.user.upsert({
                    where: { publicKey: adminPk },
                    update: {},
                    create: { publicKey: adminPk }
                });

                // Auto-create admin as member #0
                await prisma.member.upsert({
                    where: { publicKey_groupId: { publicKey: adminPk, groupId: group.id } },
                    update: {},
                    create: {
                        publicKey: adminPk,
                        userId: user.id,
                        groupId: group.id,
                        rotationPosition: 0
                    }
                });

                // Log Activity
                await ActivityService.log({
                    groupId: group.id,
                    userId: user.id,
                    type: "GROUP_CREATED",
                    message: `${groupName} was created by admin.`
                });
            }

            // Match Member Join: "Member <Wallet> joined group <GroupPK>. Position: #<Pos>"
            const joinMatch = log.match(/Member (\w+) joined group (\w+). Position: #(\d+)/);
            if (joinMatch) {
                const [_, memberPk, groupPk, position] = joinMatch;
                console.log(`👤 Member Joined: ${memberPk} at position ${position} `);

                const group = await prisma.group.findUnique({ where: { onChainPublicKey: groupPk } });
                if (group) {
                    // Find or create global User
                    const user = await prisma.user.upsert({
                        where: { publicKey: memberPk },
                        update: {},
                        create: { publicKey: memberPk }
                    });

                    await prisma.member.upsert({
                        where: { publicKey_groupId: { publicKey: memberPk, groupId: group.id } },
                        update: { rotationPosition: Number(position) - 1 },
                        create: {
                            publicKey: memberPk,
                            userId: user.id,
                            groupId: group.id,
                            rotationPosition: Number(position) - 1
                        }
                    });

                    // Log Activity
                    await ActivityService.log({
                        groupId: group.id,
                        userId: user.id,
                        type: "JOIN",
                        message: `New member joined the group at position #${position}.`,
                        metadata: { wallet: memberPk, position }
                    });

                    // If group is now full, notify creator
                    if (Number(position) === group.memberCount) {
                        const adminMember = await prisma.member.findFirst({
                            where: { publicKey: group.admin, groupId: group.id }
                        });
                        if (adminMember) {
                            await NotificationRouter.dispatch(
                                adminMember.id,
                                NotificationType.GROUP_ALERT,
                                "Group is Full! 🎊",
                                `Great news! '${group.name}' has reached ${group.memberCount} members. You can now start the cycle from the group dashboard.`
                            );
                        }
                    }
                }
            }

            // Match Cycle Start: "Cycle started for group <GroupPK>. Round 1 due at timestamp <TS>. Recipient: #1"
            const cycleStartMatch = log.match(/Cycle started for group (\w+). Round 1 due at timestamp (\d+). Recipient: #1/);
            if (cycleStartMatch) {
                const [_, groupPk, dueTs] = cycleStartMatch;
                console.log(`🚀 Cycle Started: Group ${groupPk} (Round 1 due: ${dueTs})`);

                const group = await prisma.group.findUnique({ where: { onChainPublicKey: groupPk } });
                if (group) {
                    // Fetch on-chain round to be 100% sure of the actual deadline
                    const onChainRound = await this.fetchOnChainRound(groupPk, 1);
                    const finalDueDate = onChainRound
                        ? new Date(onChainRound.graceEndTimestamp.toNumber() * 1000)
                        : new Date(Number(dueTs) * 1000);

                    console.log(`🔗 Syncing Round 1 deadline: ${finalDueDate.toLocaleString()}`);

                    await prisma.$transaction([
                        prisma.group.update({
                            where: { id: group.id },
                            data: { status: "active", currentRound: 1 }
                        }),
                        prisma.round.upsert({
                            where: {
                                groupId_roundNumber: {
                                    groupId: group.id,
                                    roundNumber: 1
                                }
                            },
                            create: {
                                groupId: group.id,
                                roundNumber: 1,
                                dueDate: finalDueDate,
                                isCompleted: false
                            },
                            update: {
                                dueDate: finalDueDate
                            }
                        })
                    ]);

                    // Log Activity
                    await ActivityService.log({
                        groupId: group.id,
                        type: "CYCLE_STARTED",
                        message: `The saving cycle has officially started! Round 1 is now active.`
                    });
                }
            }

            // Match Contribution: "Contribution of <Amt> lamports received from <User> for group <GroupPK> round <Num>"
            const contributionMatch = log.match(/Contribution of (\d+) lamports received from (\w+) for group (\w+) round (\d+)/);
            if (contributionMatch) {
                const [_, amount, memberPk, groupPk, roundNum] = contributionMatch;
                console.log(`💰 Contribution Confirmed: ${amount} lamports from ${memberPk} (Group: ${groupPk}, Round: ${roundNum})`);

                const groupRec = await prisma.group.findUnique({ where: { onChainPublicKey: groupPk } });
                if (groupRec) {
                    const member = await prisma.member.findUnique({
                        where: { publicKey_groupId: { publicKey: memberPk, groupId: groupRec.id } },
                        include: { group: true }
                    });

                    if (member) {
                        const roundRecord = await prisma.round.findFirst({
                            where: { groupId: member.groupId, roundNumber: Number(roundNum) }
                        });

                        const factor = member.group.mint ? 1e6 : 1e9;
                        const symbol = member.group.mint ? "USDC" : "SOL";

                        await NotificationRouter.dispatch(
                            member.id,
                            NotificationType.CONTRIBUTION_DUE_NOW,
                            "Contribution Received!",
                            `Your payment of ${(Number(amount) / factor).toFixed(symbol === "USDC" ? 2 : 4)} ${symbol} for round ${roundNum} in '${member.group.name}' has been confirmed on - chain.`,
                            roundRecord?.id
                        );

                        // Log Activity
                        await ActivityService.log({
                            groupId: groupRec.id,
                            userId: member.userId,
                            type: "CONTRIBUTION",
                            message: `Member contributed ${(Number(amount) / factor).toFixed(symbol === "USDC" ? 2 : 4)} ${symbol} for Round ${roundNum}.`,
                            metadata: { roundNum, amount }
                        });
                    }
                }
            }

            // Match Payout: "Payout of <Amt> lamports sent to <User> for group <GroupPK> round <Num>"
            const payoutMatch = log.match(/Payout of (\d+) lamports sent to (\w+) for group (\w+) round (\d+)/);
            if (payoutMatch) {
                const [_, amount, recipientPk, groupPk, roundNum] = payoutMatch;
                console.log(`🚀 Payout Executed: ${amount} lamports to ${recipientPk} (Group: ${groupPk}, Round: ${roundNum})`);

                const group = await prisma.group.findUnique({ where: { onChainPublicKey: groupPk } });
                if (group) {
                    const recipientMember = await prisma.member.findUnique({
                        where: { publicKey_groupId: { publicKey: recipientPk, groupId: group.id } }
                    });

                    const roundRecord = await prisma.round.findFirst({
                        where: { groupId: group.id, roundNumber: Number(roundNum) }
                    });

                    // Update database state
                    await prisma.$transaction([
                        prisma.round.updateMany({
                            where: { groupId: group.id, roundNumber: Number(roundNum) },
                            data: { isCompleted: true, payoutMemberPublicKey: recipientPk }
                        }),
                        prisma.group.update({
                            where: { id: group.id },
                            data: {
                                currentRound: Number(roundNum) + 1,
                                status: Number(roundNum) === group.memberCount ? "completed" : "active"
                            }
                        })
                    ]);

                    if (Number(roundNum) === group.memberCount) {
                        console.log(`🏁 Group ${group.name} marked as COMPLETED after last payout.`);
                    }

                    // Proactively create the next round record if group is not complete
                    if (Number(roundNum) < group.memberCount) {
                        const nextRoundNum = Number(roundNum) + 1;

                        // Fetch the ACTUAL deadline from the newly initialized on-chain round state
                        const nextOnChainRound = await this.fetchOnChainRound(groupPk, nextRoundNum);

                        let nextDueDate: Date;
                        if (nextOnChainRound) {
                            nextDueDate = new Date(nextOnChainRound.graceEndTimestamp.toNumber() * 1000);
                            console.log(`🔗 Syncing Next Round (#${nextRoundNum}) deadline from chain: ${nextDueDate.toLocaleString()}`);
                        } else {
                            // Fallback to calculation if fetch fails
                            let intervalMs = 7 * 24 * 60 * 60 * 1000;
                            switch (group.roundInterval) {
                                case "DAILY": intervalMs = 24 * 60 * 60 * 1000; break;
                                case "WEEKLY": intervalMs = 7 * 24 * 60 * 60 * 1000; break;
                                case "MONTHLY": intervalMs = 30 * 24 * 60 * 60 * 1000; break;
                                case "YEARLY": intervalMs = 365 * 24 * 60 * 60 * 1000; break;
                            }
                            nextDueDate = new Date(Date.now() + intervalMs);
                        }

                        await prisma.round.upsert({
                            where: {
                                groupId_roundNumber: {
                                    groupId: group.id,
                                    roundNumber: nextRoundNum
                                }
                            },
                            create: {
                                groupId: group.id,
                                roundNumber: nextRoundNum,
                                dueDate: nextDueDate,
                                isCompleted: false
                            },
                            update: {
                                dueDate: nextDueDate
                            }
                        });
                        console.log(`🆕 Created/Updated Round ${nextRoundNum} record for Group ${group.name}. Next deadline: ${nextDueDate.toLocaleString()}`);
                    }

                    if (recipientMember) {
                        const factor = group.mint ? 1e6 : 1e9;
                        const symbol = group.mint ? "USDC" : "SOL";
                        await NotificationRouter.dispatch(
                            recipientMember.id,
                            NotificationType.PAYOUT_RECEIVED,
                            "Payout Received! 🚀",
                            `Congratulations! You've received a payout of ${(Number(amount) / factor).toFixed(symbol === "USDC" ? 2 : 4)} ${symbol} for round ${roundNum} in '${group.name} '.`,
                            roundRecord?.id
                        );

                        // Log Activity
                        await ActivityService.log({
                            groupId: group.id,
                            type: "PAYOUT_EXECUTED",
                            message: `Round ${roundNum} complete! Payout of ${(Number(amount) / factor).toFixed(symbol === "USDC" ? 2 : 4)} ${symbol} sent to recipient.`,
                            metadata: { roundNum, recipient: recipientPk, amount }
                        });
                    }
                }
            }

            // Match Extension Consensus: "Consensus reached! Group <PK> Round <Num> extended by <Hours> hours."
            const extensionMatch = log.match(/Consensus reached! Group (\w+) Round (\d+) extended by (\d+) hours./);
            if (extensionMatch) {
                const [_, groupPk, roundNum, hours] = extensionMatch;
                console.log(`✅ Consensus Reached: Group ${groupPk} Round ${roundNum} extended by ${hours} hours.`);

                const group = await prisma.group.findUnique({ where: { onChainPublicKey: groupPk } });
                if (group) {
                    // Fetch the ACTUAL new deadline from the chain to be 100% accurate
                    const onChainRound = await this.fetchOnChainRound(groupPk, Number(roundNum));
                    if (onChainRound) {
                        const newDueDate = new Date(onChainRound.graceEndTimestamp.toNumber() * 1000);
                        await prisma.round.update({
                            where: {
                                groupId_roundNumber: {
                                    groupId: group.id,
                                    roundNumber: Number(roundNum)
                                }
                            },
                            data: { dueDate: newDueDate }
                        });
                        console.log(`🆕 Synced extended deadline for ${group.name} Round ${roundNum}: ${newDueDate.toLocaleString()}`);

                        // Log Activity
                        await ActivityService.log({
                            groupId: group.id,
                            type: "GROUP_ALERT",
                            message: `Round ${roundNum} deadline was extended by ${hours} hours via community vote.`
                        });
                    }
                }
            }
            const completeMatch = log.match(/Cycle complete for group (\w+). All (\d+) rounds finished./);
            if (completeMatch) {
                const [_, groupPk, totalRounds] = completeMatch;
                console.log(`🏁 Cycle Complete: Group ${groupPk} (${totalRounds} rounds)`);

                await prisma.group.update({
                    where: { onChainPublicKey: groupPk },
                    data: { status: "completed" }
                });
            }
        }
    }
}
