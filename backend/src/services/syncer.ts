import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import { AnchorProvider, Program, Wallet } from "@coral-xyz/anchor";
import { prisma } from "../lib/prisma";
import ajoIdl from "../idl/ajo.json";
import bs58 from "bs58";
import { ActivityService } from "./activity";

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

            const group = await prisma.group.upsert({
                where: { onChainPublicKey: groupPk },
                update: {
                    name: onChainGroup.name,
                    admin: onChainGroup.admin.toBase58(),
                    memberCount: onChainGroup.memberCount,
                    contributionAmount: onChainGroup.contributionAmount.toString(),
                    roundInterval: roundInterval,
                    mint: onChainGroup.mint ? onChainGroup.mint.toBase58() : null,
                    status: Object.keys(onChainGroup.status)[0] as any
                },
                create: {
                    onChainPublicKey: groupPk,
                    name: onChainGroup.name,
                    admin: onChainGroup.admin.toBase58(),
                    contributionAmount: onChainGroup.contributionAmount.toString(),
                    roundInterval: roundInterval,
                    status: Object.keys(onChainGroup.status)[0] as any,
                    memberCount: onChainGroup.memberCount,
                    mint: onChainGroup.mint ? onChainGroup.mint.toBase58() : null
                }
            });

            // Ensure admin is a member
            const adminPk = onChainGroup.admin.toBase58();
            const user = await prisma.user.upsert({
                where: { publicKey: adminPk },
                update: {},
                create: { publicKey: adminPk }
            });

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

            console.log(`✅ Successfully synced group ${group.name} (${group.id})`);
            return group;
        } catch (error: any) {
            console.error(`❌ Sync failed for group ${groupPk}:`, error.message || error);
            return null;
        }
    }
}
