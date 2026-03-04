import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import { AnchorProvider, Program, Wallet } from "@coral-xyz/anchor";
import { prisma } from "../lib/prisma";
import ajoIdl from "../idl/ajo.json";
import bs58 from "bs58";
import { ActivityService } from "./activity";
import { NotificationRouter } from "./router";
import { NotificationType } from "@prisma/client";

const PROGRAM_ID = new PublicKey("CR6pmRS8pcrc2grm2Hiq8Ny9fhvRV7mx6dYN5Bbs829X");
const RPC_URL = process.env.RPC_URL || "https://api.devnet.solana.com";

export class SyncService {
    private static connection = new Connection(RPC_URL, "confirmed");

    static async syncGroup(groupPk: string): Promise<any> {
        try {
            console.log(`🔍 Attempting Proactive Sync for Group: ${groupPk}`);

            const keeperKey = process.env.KEEPER_PRIVATE_KEY!;
            const keypair = Keypair.fromSecretKey(bs58.decode(keeperKey));
            const provider = new AnchorProvider(this.connection, new Wallet(keypair), { commitment: "confirmed" });
            const program = new Program(ajoIdl as any, provider);

            const groupPubKey = new PublicKey(groupPk);
            const onChainGroup: any = await (program.account as any).groupState.fetch(groupPubKey);

            const intervalMap: Record<number, any> = { 0: "DAILY", 1: "WEEKLY", 2: "MONTHLY", 3: "YEARLY" };
            const roundInterval = intervalMap[onChainGroup.roundInterval] || "WEEKLY";
            const onChainStatusName = Object.keys(onChainGroup.status)[0];
            const onChainStatus = onChainStatusName.toLowerCase() as any;

            console.log(`🔍 Group ${groupPk} status: ${onChainStatus}`);

            const existingGroup = await prisma.group.findUnique({
                where: { onChainPublicKey: groupPk },
                include: { members: true }
            });

            const group = await prisma.group.upsert({
                where: { onChainPublicKey: groupPk },
                update: {
                    name: onChainGroup.name,
                    admin: onChainGroup.admin.toBase58(),
                    memberCount: onChainGroup.memberCount,
                    contributionAmount: onChainGroup.contributionAmount.toString(),
                    roundInterval: roundInterval,
                    mint: onChainGroup.mint ? onChainGroup.mint.toBase58() : null,
                    status: onChainStatus,
                    currentRound: onChainGroup.currentRound
                },
                create: {
                    onChainPublicKey: groupPk,
                    name: onChainGroup.name,
                    admin: onChainGroup.admin.toBase58(),
                    contributionAmount: onChainGroup.contributionAmount.toString(),
                    roundInterval: roundInterval,
                    status: onChainStatus,
                    memberCount: onChainGroup.memberCount,
                    mint: onChainGroup.mint ? onChainGroup.mint.toBase58() : null,
                    currentRound: onChainGroup.currentRound
                }
            });

            // 1. Sync All Members
            const onChainMembers = onChainGroup.members as PublicKey[];
            for (let i = 0; i < onChainMembers.length; i++) {
                const memberPk = onChainMembers[i].toBase58();
                if (memberPk === "11111111111111111111111111111111") continue;

                const user = await prisma.user.upsert({
                    where: { publicKey: memberPk },
                    update: {},
                    create: { publicKey: memberPk }
                });

                await prisma.member.upsert({
                    where: { publicKey_groupId: { publicKey: memberPk, groupId: group.id } },
                    update: { rotationPosition: i },
                    create: {
                        publicKey: memberPk,
                        userId: user.id,
                        groupId: group.id,
                        rotationPosition: i
                    }
                });
            }

            // 2. Notifications & Activities
            const activeOnChainMembers = onChainMembers.filter(m => m.toBase58() !== "11111111111111111111111111111111");
            console.log(`🔍 Sync Check [${group.name}]: onChainActive=${activeOnChainMembers.length}, target=${onChainGroup.memberCount}, localPrev=${existingGroup?.members.length || 0}`);

            // Handle "Group Full"
            if (activeOnChainMembers.length === onChainGroup.memberCount && (!existingGroup || existingGroup.members.length < onChainGroup.memberCount)) {
                console.log(`🎉 Group ${group.name} is now FULL! (Active members: ${activeOnChainMembers.length})`);

                // Find admin member ID more robustly
                const adminPk = onChainGroup.admin.toBase58();
                const adminMember = await prisma.member.findFirst({
                    where: {
                        groupId: group.id,
                        publicKey: adminPk
                    }
                });

                if (adminMember) {
                    console.log(`📡 Dispatching FULL notification to admin: ${adminPk} (MemberID: ${adminMember.id})`);
                    await NotificationRouter.dispatch(
                        adminMember.id,
                        NotificationType.GROUP_ALERT,
                        "Your group is full! 🎉",
                        `'${group.name}' has reached its member limit and is ready to start.`
                    );
                } else {
                    console.warn(`⚠️ Admin member ${adminPk} not found in DB for group ${group.id}, skipping notification.`);
                }

                await ActivityService.log({
                    groupId: group.id,
                    type: "GROUP_ALERT",
                    message: "Group is full and ready for cycle start."
                });
            }

            // Handle "Cycle Started"
            if (onChainStatus === "active" && (!existingGroup || existingGroup.status === "filling")) {
                console.log(`🚀 Group ${group.name} cycle has STARTED!`);

                const adminPk = onChainGroup.admin.toBase58();
                const adminMember = await prisma.member.findFirst({
                    where: {
                        groupId: group.id,
                        publicKey: adminPk
                    }
                });

                if (adminMember) {
                    await NotificationRouter.dispatch(
                        adminMember.id,
                        NotificationType.GROUP_ALERT,
                        "Cycle Started! 🚀",
                        `'${group.name}' has officially started! Round 1 is now active.`
                    );
                }

                await ActivityService.log({
                    groupId: group.id,
                    type: "CYCLE_STARTED",
                    message: "The first round has officially started!"
                });
            }

            // 3. Sync Rounds if active
            if (onChainStatus === "active") {
                const [roundPda] = PublicKey.findProgramAddressSync(
                    [Buffer.from("round"), groupPubKey.toBuffer(), Buffer.from([onChainGroup.currentRound])],
                    PROGRAM_ID
                );

                try {
                    const onChainRound: any = await (program.account as any).roundState.fetch(roundPda);
                    const dueDate = new Date(onChainRound.dueTimestamp.toNumber() * 1000);

                    await prisma.round.upsert({
                        where: { groupId_roundNumber: { groupId: group.id, roundNumber: onChainGroup.currentRound } },
                        update: { dueDate },
                        create: {
                            groupId: group.id,
                            roundNumber: onChainGroup.currentRound,
                            dueDate
                        }
                    });
                } catch (e: any) {
                    console.warn(`⚠️ Could not fetch round state for group ${groupPk} round ${onChainGroup.currentRound}`);
                }
            }

            console.log(`✅ Successfully synced group ${group.name} (${group.id})`);
            return group;
        } catch (error: any) {
            console.error(`❌ Sync failed for group ${groupPk}:`, error.message || error);
            return null;
        }
    }

    static async syncAllCurrentGroups(): Promise<void> {
        try {
            console.log("🔍 Proactive Global Sync: Fetching all active/filling groups...");
            const groups = await prisma.group.findMany({
                where: { status: { in: ["filling", "active"] } }
            });

            console.log(`🔍 Found ${groups.length} groups to sync.`);
            for (const group of groups) {
                await this.syncGroup(group.onChainPublicKey);
            }
        } catch (error: any) {
            console.error("❌ Global Sync Failed:", error.message || error);
        }
    }
}
