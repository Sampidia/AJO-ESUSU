"use client";

import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { getProgram, getMemberAddress, getRoundAddress, getVaultAddress } from "../../../lib/anchor";
import { parseError } from "../../../lib/errors";
import { Card, CardTitle, CardDescription, CardContent, CardFooter } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import {
    Users,
    ShieldCheck,
    ArrowRightLeft,
    TrendingUp,
    AlertCircle,
    CheckCircle2,
    Loader2,
    Info,
    Banknote,
    Timer,
    BarChart3,
    ArrowUpCircle
} from "lucide-react";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Calendar, LogOut, Trash2, Clock } from "lucide-react";
import { ConfirmationModal } from "../../../components/ui/ConfirmationModal";
import Link from 'next/link';
import { PayoutTimeline } from "../../../components/group/PayoutTimeline";
import { ActivityFeed } from "../../../components/group/ActivityFeed";

export default function GroupDetails() {
    const { groupId } = useParams();
    const { connected, publicKey, wallet } = useWallet();
    const { connection } = useConnection();
    const router = useRouter();

    const [group, setGroup] = useState<any>(null);
    const [memberState, setMemberState] = useState<any>(null);
    const [currentRound, setCurrentRound] = useState<any>(null);
    const [previousRound, setPreviousRound] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [memberProfiles, setMemberProfiles] = useState<Record<string, any>>({});
    const [extensionHours, setExtensionHours] = useState(24);

    // Redirect to home if wallet disconnects
    useEffect(() => {
        if (!connected && !loading) {
            router.push("/");
        }
    }, [connected, loading, router]);

    const groupPubKey = useMemo(() => new PublicKey(groupId as string), [groupId]);

    const fetchData = async () => {
        if (!groupPubKey) return;

        try {
            const program = getProgram(connection, wallet?.adapter);

            // Fetch Group State
            let groupData;
            try {
                groupData = await program.account.groupState.fetch(groupPubKey);
                setGroup(groupData);
            } catch (e) {
                console.error("Error decoding group state:", e);
                setError("This group is from an older version of the program and is no longer compatible.");
                setLoading(false);
                return;
            }

            // Fetch User's Member State (if connected)
            if (publicKey) {
                try {
                    const memberPda = getMemberAddress(groupPubKey, publicKey);
                    const mState = await program.account.memberState.fetch(memberPda);
                    setMemberState(mState);
                } catch (e) {
                    console.log("User is not a member of this group");
                    setMemberState(null);
                }
            }

            // Fetch Current Round State (if active)
            if (groupData.currentRound > 0) {
                try {
                    const roundPda = getRoundAddress(groupPubKey, groupData.currentRound);
                    const rState = await program.account.roundState.fetch(roundPda);
                    setCurrentRound(rState);
                } catch (e) {
                    console.error("Error fetching round state:", e);
                }

                // Fetch Previous Round State (for last payout info)
                if (groupData.currentRound > 1) {
                    try {
                        const prevRoundPda = getRoundAddress(groupPubKey, groupData.currentRound - 1);
                        const prevState = await program.account.roundState.fetch(prevRoundPda);
                        setPreviousRound(prevState);
                    } catch (e) {
                        console.log("No previous round data available");
                        setPreviousRound(null);
                    }
                }
            }
        } catch (err) {
            console.error("Error fetching group details:", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchMemberProfiles = async () => {
        if (!group?.members) return;

        const newProfiles = { ...memberProfiles };
        let changed = false;

        for (const m of group.members) {
            const pk = m.toString();
            if (!newProfiles[pk]) {
                try {
                    const resp = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user/${pk}`);
                    const data = await resp.json();
                    if (data.success && data.user) {
                        newProfiles[pk] = data.user;
                        changed = true;
                    }
                } catch (e) {
                    console.error("Failed to fetch profile for", pk);
                }
            }
        }

        if (changed) {
            setMemberProfiles(newProfiles);
        }
    };

    useEffect(() => {
        if (group?.members) {
            fetchMemberProfiles();
        }
    }, [group?.members]);

    useEffect(() => {
        fetchData();

        // Auto-refresh every 20 seconds
        const pollInterval = setInterval(() => {
            if (!actionLoading) {
                fetchData();
            }
        }, 20000);

        return () => clearInterval(pollInterval);
    }, [groupPubKey, publicKey, connection, wallet]);

    const handleStartCycle = async () => {
        if (!publicKey || !wallet?.adapter) return;
        setActionLoading(true);
        setError(null);
        try {
            const program = getProgram(connection, wallet.adapter);
            const round1Pda = getRoundAddress(groupPubKey, 1);

            await program.methods
                .startCycle()
                .accounts({
                    caller: publicKey,
                    groupState: groupPubKey,
                    roundState: round1Pda,
                })
                .rpc();

            await fetchData();
        } catch (err) {
            console.error("Error starting cycle:", err);
            setError(parseError(err));
        } finally {
            setActionLoading(false);
        }
    };


    const handleContribute = async () => {
        if (!publicKey || !wallet?.adapter) return;
        setActionLoading(true);
        setError(null);
        try {
            const program = getProgram(connection, wallet.adapter);
            const memberPda = getMemberAddress(groupPubKey, publicKey);
            const roundPda = getRoundAddress(groupPubKey, group.currentRound);

            const vaultPda = getVaultAddress(groupPubKey);
            const PLATFORM_WALLET = new PublicKey(process.env.NEXT_PUBLIC_PLATFORM_WALLET || "4qDEXD8BvsvUHikub5JDUR9ZCD27Dwc4s7Za87PBRDMk");

            let accounts: any = {
                member: publicKey,
                groupState: groupPubKey,
                memberState: memberPda,
                roundState: roundPda,
                vault: vaultPda,
            };

            if (group.mint) {
                const memberAta = getAssociatedTokenAddressSync(group.mint, publicKey);
                const vaultAta = getAssociatedTokenAddressSync(group.mint, vaultPda, true);

                accounts = {
                    ...accounts,
                    mint: group.mint,
                    vaultTokenAccount: vaultAta,
                    memberTokenAccount: memberAta,
                };
            } else {
                // SOL Group - Use dummy unique accounts for unused mut fields.
                const dummy1 = Keypair.generate().publicKey;
                const dummy2 = Keypair.generate().publicKey;
                accounts = {
                    ...accounts,
                    mint: SystemProgram.programId,
                    vaultTokenAccount: dummy1,
                    memberTokenAccount: dummy2,
                };
            }

            await program.methods
                .contribute()
                .accounts(accounts)
                .rpc();

            await fetchData();
        } catch (err) {
            console.error("Error contributing:", err);
            setError(parseError(err));
        } finally {
            setActionLoading(false);
        }
    };


    const handlePayoutRound = async () => {
        if (!publicKey || !wallet?.adapter) return;
        setActionLoading(true);
        setError(null);
        try {
            const program = getProgram(connection, wallet.adapter);
            const vaultPda = getVaultAddress(groupPubKey);
            const recipientIndex = (group.currentRound - 1) % group.memberCount;
            const recipient = group.members[recipientIndex];
            const PLATFORM_WALLET = new PublicKey(process.env.NEXT_PUBLIC_PLATFORM_WALLET || "4qDEXD8BvsvUHikub5JDUR9ZCD27Dwc4s7Za87PBRDMk");

            let nextRoundPda: PublicKey | null = null;
            if (group.currentRound < group.memberCount) {
                nextRoundPda = getRoundAddress(groupPubKey, group.currentRound + 1);
            }

            const roundPda = getRoundAddress(groupPubKey, group.currentRound);

            // Placeholder management to avoid account duplication in Anchor.
            // If the account is UNUSED in the program logic for the particular currency/round 
            // but marked 'mut' in IDL, we must pass a UNIQUE writable account to avoid revert.
            const dummy1 = Keypair.generate().publicKey;
            const dummy2 = Keypair.generate().publicKey;
            const dummy3 = Keypair.generate().publicKey;
            const dummy4 = Keypair.generate().publicKey; // For platformWallet

            let accounts: any = {
                caller: publicKey,
                groupState: groupPubKey,
                roundState: roundPda,
                vault: vaultPda,
                recipient: recipient,
                platformWallet: dummy4, // Unused but mut, use dummy to avoid conflict
                nextRoundState: nextRoundPda || dummy1,
            };

            if (group.mint) {
                const vaultAta = getAssociatedTokenAddressSync(group.mint, vaultPda, true);
                const recipientAta = getAssociatedTokenAddressSync(group.mint, recipient);

                accounts = {
                    ...accounts,
                    mint: group.mint,
                    vaultTokenAccount: vaultAta,
                    recipientTokenAccount: recipientAta,
                };
            } else {
                // SOL Group - Provide unique placeholders to avoid account duplication 
                // in the 'mut' fields (vaultTokenAccount, recipientTokenAccount).
                accounts = {
                    ...accounts,
                    mint: SystemProgram.programId, // mint is not mut, so SystemProgram is fine.
                    vaultTokenAccount: dummy2,
                    recipientTokenAccount: dummy3,
                };
            }

            console.log("DIAG: Executing payout_round with accounts:", accounts);

            await program.methods
                .payoutRound()
                .accounts(accounts)
                .rpc();

            await fetchData();
        } catch (err: any) {
            console.error("Error executing payout:", err);
            // Log raw error for deeper debugging if simulation fails
            if (err.logs) console.log("Transaction Logs:", err.logs);
            setError(parseError(err));
        } finally {
            setActionLoading(false);
        }
    };


    const handleRefund = async () => {
        if (!publicKey || !wallet?.adapter || !memberState) return;
        setActionLoading(true);
        setError(null);
        try {
            const program = getProgram(connection, wallet.adapter);
            const memberPda = getMemberAddress(groupPubKey, publicKey);

            const vaultPda = getVaultAddress(groupPubKey);
            const finalRoundPda = getRoundAddress(groupPubKey, group.memberCount);

            let accounts: any = {
                caller: publicKey,
                groupState: groupPubKey,
                finalRoundState: finalRoundPda,
                memberState: memberPda,
                memberWallet: publicKey,
                vault: vaultPda,
                systemProgram: SystemProgram.programId,
                tokenProgram: TOKEN_PROGRAM_ID,
            };

            if (group.mint) {
                const memberAta = getAssociatedTokenAddressSync(group.mint, publicKey);
                const vaultAta = getAssociatedTokenAddressSync(group.mint, vaultPda, true);

                accounts = {
                    ...accounts,
                    mint: group.mint,
                    vaultTokenAccount: vaultAta,
                    memberTokenAccount: memberAta,
                };
            } else {
                // SOL Group - Provide placeholders
                const dummy1 = Keypair.generate().publicKey;
                const dummy2 = Keypair.generate().publicKey;
                accounts = {
                    ...accounts,
                    mint: SystemProgram.programId,
                    vaultTokenAccount: dummy1,
                    memberTokenAccount: dummy2,
                };
            }

            await program.methods
                .refundCollateral()
                .accounts(accounts)
                .rpc();

            await fetchData();
        } catch (err: any) {
            console.error("Error refunding collateral:", err);
            if (err.logs) {
                console.log("Anchor Error Logs:", err.logs);
            }
            setError(parseError(err));
        } finally {
            setActionLoading(false);
        }
    };


    const handleDeleteGroup = async () => {
        if (!publicKey || !wallet?.adapter) return;
        setActionLoading(true);
        setError(null);
        try {
            const program = getProgram(connection, wallet.adapter);
            const vaultPda = getVaultAddress(groupPubKey);
            const memberStatePda = getMemberAddress(groupPubKey, publicKey);

            let accounts: any = {
                admin: publicKey,
                groupState: groupPubKey,
                memberState: memberStatePda,
                vault: vaultPda,
            };

            if (group.mint) {
                const adminAta = getAssociatedTokenAddressSync(group.mint, publicKey);
                const vaultAta = getAssociatedTokenAddressSync(group.mint, vaultPda, true);

                accounts = {
                    ...accounts,
                    mint: group.mint,
                    vaultTokenAccount: vaultAta,
                    adminTokenAccount: adminAta,
                };
            } else {
                // SOL Group - Use dummy unique accounts for unused mut fields.
                const dummy1 = Keypair.generate().publicKey;
                const dummy2 = Keypair.generate().publicKey;
                accounts = {
                    ...accounts,
                    mint: SystemProgram.programId,
                    vaultTokenAccount: dummy1,
                    adminTokenAccount: dummy2,
                };
            }

            await program.methods
                .deleteGroup()
                .accounts(accounts)
                .rpc();

            router.push("/dashboard");
        } catch (err: any) {
            console.error("Error deleting group:", err);
            setError(parseError(err));
            setIsDeleteModalOpen(false);
            setActionLoading(false);
        }
    };

    const handleAutoPull = async (idx: number) => {
        if (!publicKey || !wallet?.adapter) return;
        setActionLoading(true);
        setError(null);
        try {
            const program = getProgram(connection, wallet.adapter);
            const defaultingMember = group.members[idx];
            const memberStatePda = getMemberAddress(groupPubKey, defaultingMember);
            const roundPda = getRoundAddress(groupPubKey, group.currentRound);

            await program.methods
                .autoPull(idx)
                .accounts({
                    caller: publicKey,
                    groupState: groupPubKey,
                    memberState: memberStatePda,
                    roundState: roundPda,
                })
                .rpc();

            await fetchData();
        } catch (err) {
            console.error("Error auto-pulling:", err);
            setError(parseError(err));
        } finally {
            setActionLoading(false);
        }
    };




    const handleLeaveGroup = async () => {
        if (!publicKey || !wallet?.adapter || !memberState) return;
        setActionLoading(true);
        setError(null);
        try {
            const program = getProgram(connection, wallet.adapter);
            const memberPda = getMemberAddress(groupPubKey, publicKey);

            const vaultPda = getVaultAddress(groupPubKey);
            // Placeholder management to avoid account duplication.
            const dummy1 = Keypair.generate().publicKey;
            const dummy2 = Keypair.generate().publicKey;

            let accounts: any = {
                member: publicKey,
                groupState: groupPubKey,
                memberState: memberPda,
                vault: vaultPda,
                systemProgram: SystemProgram.programId,
            };

            if (group.mint) {
                const memberAta = getAssociatedTokenAddressSync(group.mint, publicKey);
                const vaultAta = getAssociatedTokenAddressSync(group.mint, vaultPda, true);

                accounts = {
                    ...accounts,
                    mint: group.mint,
                    vaultTokenAccount: vaultAta,
                    memberTokenAccount: memberAta,
                    tokenProgram: TOKEN_PROGRAM_ID,
                };
            } else {
                // SOL Group - Use dummy unique accounts for unused mut fields.
                accounts = {
                    ...accounts,
                    mint: SystemProgram.programId,
                    vaultTokenAccount: dummy1,
                    memberTokenAccount: dummy2,
                    tokenProgram: TOKEN_PROGRAM_ID,
                };
            }

            await program.methods
                .leaveGroup()
                .accounts(accounts)
                .rpc();

            router.push("/dashboard");
        } catch (err: any) {
            console.error("Error leaving group:", err);
            setError(parseError(err));
            setIsLeaveModalOpen(false);
            setActionLoading(false);
        }
    };

    const handleProposeExtension = async () => {
        if (!publicKey || !wallet?.adapter || !memberState) return;
        setActionLoading(true);
        setError(null);
        try {
            const program = getProgram(connection, wallet.adapter);
            const memberPda = getMemberAddress(groupPubKey, publicKey);

            await program.methods
                .proposeExtension(extensionHours)
                .accounts({
                    proposer: publicKey,
                    groupState: groupPubKey,
                    memberState: memberPda,
                } as any)
                .rpc();

            await fetchData();
        } catch (err) {
            console.error("Error proposing extension:", err);
            setError(parseError(err));
        } finally {
            setActionLoading(false);
        }
    };

    const handleVoteOnExtension = async () => {
        if (!publicKey || !wallet?.adapter) return;
        setActionLoading(true);
        setError(null);
        try {
            const program = getProgram(connection, wallet.adapter);
            const memberPda = getMemberAddress(groupPubKey, publicKey);
            const roundPda = getRoundAddress(groupPubKey, group.currentRound);

            await program.methods
                .voteOnExtension()
                .accounts({
                    voter: publicKey,
                    groupState: groupPubKey,
                    roundState: roundPda,
                    memberState: memberPda,
                } as any)
                .rpc();

            await fetchData();
        } catch (err) {
            console.error("Error voting on extension:", err);
            setError(parseError(err));
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
            </div>
        );
    }

    if (!group) {
        return (
            <div className="container mx-auto px-4 py-20 text-center">
                <h1 className="text-2xl font-bold">Group not found</h1>
                <Button onClick={() => router.push("/dashboard")} className="mt-4">Back to Dashboard</Button>
            </div>
        );
    }


    const isFull = group.members.length >= group.memberCount;
    const isFilling = !!group.status.filling;
    const isActive = !!group.status.active;
    const isCompleted = !!group.status.completed || (isActive && group.currentRound === group.memberCount && currentRound?.payoutSent);
    const isAdmin = publicKey ? group.admin.equals(publicKey) : false;
    const isUserMember = !!memberState;

    const hasContributed = memberState && currentRound ? currentRound.contributionsReceived[memberState.rotationPosition] : false;

    // Check if all contributions are in
    const allContributionsIn = currentRound ? currentRound.contributionsReceived.every((c: boolean) => c) : false;
    const canExecutePayout = isActive && allContributionsIn && !isCompleted && !currentRound?.payoutSent;

    // Interval helper
    const intervalLabels: Record<number, string> = { 0: 'Daily', 1: 'Weekly', 2: 'Monthly', 3: 'Yearly' };
    const intervalLabel = intervalLabels[group.roundInterval] || 'Weekly';

    // Currency helper
    const currency = group.mint ? "USDC" : "SOL";
    const decimals = group.mint ? 6 : 9;
    const factor = Math.pow(10, decimals);
    const payoutAmount = group.payoutAmount.toNumber() / factor;
    const contributionAmount = group.contributionAmount.toNumber() / factor;

    // Payout amount after fee (Now 100% since fee is paid at entry)
    const netPayout = payoutAmount;

    // Date/Time formatter
    const formatDateTime = (unixSeconds: number) => {
        const d = new Date(unixSeconds * 1000);
        return d.toLocaleString(undefined, {
            month: 'short', day: 'numeric', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    };

    return (
        <div className="container mx-auto px-4 py-12 max-w-6xl">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-4xl font-extrabold tracking-tight">{group.name}</h1>
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${isFilling ? 'bg-yellow-500/10 text-yellow-500' :
                            isActive && !isCompleted ? 'bg-green-500/10 text-green-500' :
                                isCompleted ? 'bg-blue-500/10 text-blue-500' : 'bg-gray-500/10 text-gray-500'
                            }`}>
                            {isCompleted ? 'Completed' : Object.keys(group.status)[0]}
                        </span>
                    </div>
                    <p className="text-gray-400 flex items-center gap-2">
                        Managed by <span className="text-white font-mono text-sm">
                            {memberProfiles[group.admin.toString()]?.handle ? `@${memberProfiles[group.admin.toString()].handle}` : `${group.admin.toString().slice(0, 8)}...`}
                        </span>
                    </p>
                </div>

                <div className="flex gap-4">
                    {isAdmin && isFilling && group.members.length === 1 && (
                        <Button variant="outline" size="lg" className="px-10 border-red-500/20 text-red-500 hover:bg-red-500/10 gap-2" onClick={() => setIsDeleteModalOpen(true)} isLoading={actionLoading}>
                            <Trash2 className="w-4 h-4" /> Delete Group
                        </Button>
                    )}
                    {isAdmin && isFilling && group.members.length > 1 && (
                        <Button variant="outline" size="lg" className="px-10 border-gray-500/20 text-gray-500 cursor-not-allowed gap-2" disabled title="All other members must leave before you can delete the group.">
                            <Trash2 className="w-4 h-4" /> Delete Group (Awaiting Leaves)
                        </Button>
                    )}
                    {isUserMember && !isAdmin && isFilling && (
                        <Button variant="outline" size="lg" className="px-10 border-yellow-500/20 text-yellow-500 hover:bg-yellow-500/10 gap-2" onClick={() => setIsLeaveModalOpen(true)} isLoading={actionLoading}>
                            <LogOut className="w-4 h-4" /> Leave Group
                        </Button>
                    )}
                    {!isUserMember && isFilling && !isFull && (
                        <Link href={`/join/${groupId}`}>
                            <Button variant="primary" size="lg" className="px-10">Join Circle</Button>
                        </Link>
                    )}
                    {isAdmin && isFilling && isFull && (
                        <Button variant="primary" size="lg" className="px-10" onClick={handleStartCycle} isLoading={actionLoading}>
                            Start Saving Cycle
                        </Button>
                    )}
                    {canExecutePayout && (
                        <Button variant="primary" size="lg" className="px-10 bg-green-600 hover:bg-green-500" onClick={handlePayoutRound} isLoading={actionLoading}>
                            Execute Payout
                        </Button>
                    )}
                    {isCompleted && isUserMember && memberState.collateralBalance.toNumber() > 0 && (
                        <Button variant="primary" size="lg" className="px-10 bg-blue-600 hover:bg-blue-500" onClick={handleRefund} isLoading={actionLoading}>
                            Refund Collateral
                        </Button>
                    )}
                </div>
            </div>

            {error && (
                <div className="mb-8 p-4 rounded-3xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="w-5 h-5" />
                        <span>{error}</span>
                    </div>
                    <button onClick={() => setError(null)} className="text-red-400 hover:text-white transition-colors">Dismiss</button>
                </div>
            )}

            {/* Payout Timeline UI */}
            {(isActive || isFilling || isCompleted) && (
                <div className="mb-12">
                    <Card className="bg-white/[0.02] border-white/5 py-4 px-8 overflow-x-auto">
                        <PayoutTimeline
                            members={group.members}
                            currentRound={group.currentRound}
                            memberCount={group.memberCount}
                            status={group.status}
                            payoutSent={currentRound?.payoutSent}
                        />
                    </Card>
                </div>
            )}

            {/* Governance Section */}
            {isActive && (
                <div className="mb-12">
                    <Card className="border-indigo-500/20 bg-indigo-500/5">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center">
                                    <BarChart3 className="w-6 h-6 text-indigo-400" />
                                </div>
                                <div>
                                    <CardTitle className="text-xl">Governance & Voting</CardTitle>
                                    <p className="text-gray-400 text-sm">Members can vote to extend round deadlines if needed.</p>
                                </div>
                            </div>

                            {group.activeProposal ? (
                                <div className="flex flex-col md:flex-row items-center gap-6 bg-white/5 p-4 rounded-3xl border border-white/5">
                                    <div>
                                        <p className="text-xs text-gray-500 font-bold uppercase mb-1">Active Proposal</p>
                                        <p className="font-bold text-white text-lg flex items-center gap-2">
                                            Extend by {group.activeProposal.extensionHours} {group.activeProposal.extensionHours === 1 ? 'Hour' : group.activeProposal.extensionHours >= 24 ? `${Math.floor(group.activeProposal.extensionHours / 24)}d` : 'Hours'}
                                        </p>
                                        <div className="flex gap-2 text-[10px] mt-1">
                                            <span className="text-indigo-400">Votes: {group.activeProposal.yesVotes}/{group.memberCount}</span>
                                            <span className="text-gray-500">•</span>
                                            <span className="text-gray-500">Expires: {formatDateTime(group.activeProposal.expiresAt.toNumber())}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <Button
                                            variant="primary"
                                            className={`${group.activeProposal.consensusReached ? 'bg-green-600 hover:bg-green-500' : 'bg-indigo-600 hover:bg-indigo-500'} px-8 h-12 gap-2`}
                                            onClick={handleVoteOnExtension}
                                            isLoading={actionLoading}
                                            disabled={group.activeProposal.consensusReached || !isUserMember || (memberState && memberState.lastVotedProposal && memberState.lastVotedProposal.eq(group.activeProposal.expiresAt))}
                                        >
                                            {group.activeProposal.consensusReached ? (
                                                <><CheckCircle2 className="w-4 h-4" /> Consensus Reached</>
                                            ) : (
                                                memberState && memberState.lastVotedProposal && memberState.lastVotedProposal.eq(group.activeProposal.expiresAt) ? 'Voted' : 'Vote YES'
                                            )}
                                        </Button>
                                        {group.activeProposal.consensusReached && (
                                            <p className="text-[10px] text-green-500 text-center font-bold animate-pulse">
                                                Round deadline has been extended!
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center bg-white/5 rounded-xl overflow-hidden">
                                        {[
                                            { label: '1h', val: 1 },
                                            { label: '1d', val: 24 },
                                            { label: '3d', val: 72 },
                                            { label: '7d', val: 168 }
                                        ].map(opt => (
                                            <button
                                                key={opt.val}
                                                onClick={() => setExtensionHours(opt.val)}
                                                className={`px-4 py-2 text-xs font-bold transition-all ${extensionHours === opt.val ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-white'}`}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                    <Button
                                        variant="outline"
                                        className="border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 gap-2 h-12"
                                        onClick={handleProposeExtension}
                                        isLoading={actionLoading}
                                        disabled={!isUserMember}
                                    >
                                        <ArrowUpCircle className="w-4 h-4" /> Propose Extension
                                    </Button>
                                </div>
                            )}
                        </div>
                    </Card>
                </div>
            )}

            <div className="grid lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-2 space-y-8">
                    {/* Active Round Card */}
                    {isActive && currentRound && (
                        <Card className="bg-gradient-to-br from-purple-600/10 to-indigo-600/5 border-purple-500/20">
                            <div className="flex justify-between items-start mb-8">
                                <div>
                                    <h2 className="text-2xl font-bold mb-1">Round {group.currentRound} of {group.memberCount}</h2>
                                    <p className="text-gray-400 text-sm">Target Payout: <span className="text-white font-bold">{payoutAmount.toFixed(2)} {currency}</span></p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-1">Recipient</p>
                                    <p className="text-white font-mono text-sm bg-white/5 px-3 py-1 rounded-lg">
                                        {group.members[group.currentRound - 1]?.toString().slice(0, 12)}...
                                    </p>
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-8 items-center">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                                            <Clock className="w-5 h-5 text-purple-400" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 font-bold uppercase">Deadline</p>
                                            <p className="font-semibold">{formatDateTime(currentRound.dueTimestamp.toNumber())}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                                            <ArrowRightLeft className="w-5 h-5 text-indigo-400" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 font-bold uppercase">Your Status</p>
                                            <p className={hasContributed ? "text-green-500 font-bold flex items-center gap-1" : "text-yellow-500 font-bold"}>
                                                {hasContributed ? <><CheckCircle2 className="w-4 h-4" /> Paid</> : "Pending Contribution"}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3">
                                    {isUserMember && !hasContributed && (
                                        <Button variant="primary" className="h-14 text-lg" onClick={handleContribute} isLoading={actionLoading}>
                                            Pay {contributionAmount.toFixed(2)} {currency} Now
                                        </Button>
                                    )}
                                    {hasContributed && (
                                        <div className="p-4 rounded-3xl bg-green-500/5 border border-green-500/10 text-green-500 text-sm text-center">
                                            Contribution settled for this round.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Card>
                    )}

                    {/* Activity Feed */}
                    <ActivityFeed groupId={groupId as string} />

                    <div className="space-y-4">
                        <Card className="p-0 overflow-hidden">
                            <div className="p-6 border-b border-white/5 bg-white/[0.02]">
                                <CardTitle className="text-xl flex items-center gap-2">
                                    <Users className="w-5 h-5 text-purple-400" />
                                    Rotation Order ({group.members.length} / {group.memberCount})
                                </CardTitle>
                            </div>
                            <div className="divide-y divide-white/5">
                                {group.members.map((m: PublicKey, idx: number) => {
                                    const isCurrentRecipient = group.currentRound === idx + 1;
                                    const isUser = publicKey && m.equals(publicKey);
                                    const hasPaid = currentRound ? currentRound.contributionsReceived[idx] : false;
                                    const graceExpired = currentRound ? (currentRound.graceEndTimestamp.toNumber() * 1000 < Date.now()) : false;
                                    const canPull = !hasPaid && graceExpired && isActive;

                                    return (
                                        <div key={m.toString()} className={`flex items-center justify-between p-5 ${isCurrentRecipient ? 'bg-purple-500/5' : ''}`}>
                                            <div className="flex items-center gap-4">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${isCurrentRecipient ? 'bg-purple-600 text-white' : 'bg-white/5 text-gray-500'
                                                    }`}>
                                                    {idx + 1}
                                                </div>
                                                <div>
                                                    <p className={`font-mono text-sm ${isUser ? 'text-purple-400 font-bold' : 'text-white'}`}>
                                                        {memberProfiles[m.toString()]?.handle ? (
                                                            <span className="flex items-center gap-2">
                                                                @{memberProfiles[m.toString()].handle}
                                                                <span className="text-[10px] text-gray-500 font-normal opacity-50">
                                                                    ({m.toString().slice(0, 4)}...)
                                                                </span>
                                                            </span>
                                                        ) : (
                                                            <>{m.toString().slice(0, 16)}...</>
                                                        )}
                                                        {isUser && " (You)"}
                                                    </p>
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                                                            Pos {idx + 1}
                                                        </p>
                                                        {isActive && (
                                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${hasPaid ? 'text-green-500 bg-green-500/10' : 'text-yellow-500 bg-yellow-500/10'}`}>
                                                                {hasPaid ? 'PAID' : 'PENDING'}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4">
                                                {canPull && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-red-500 hover:text-red-400 hover:bg-red-500/10 h-8"
                                                        onClick={() => handleAutoPull(idx)}
                                                        isLoading={actionLoading}
                                                    >
                                                        Auto-Pull
                                                    </Button>
                                                )}
                                                {isCurrentRecipient && (
                                                    <span className="text-[10px] bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded font-bold uppercase">
                                                        Next Payout
                                                    </span>
                                                )}
                                                <TrendingUp className={`w-4 h-4 ${idx + 1 < group.currentRound ? 'text-green-500' : 'text-gray-700'}`} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>
                    </div>
                </div>

                <div className="space-y-8">
                    {/* Payout Schedule Card */}
                    {isActive && currentRound && (
                        <Card className="bg-gradient-to-br from-green-600/5 to-emerald-600/5 border-green-500/15">
                            <div className="flex items-center gap-3 mb-5">
                                <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                                    <Calendar className="w-5 h-5 text-green-400" />
                                </div>
                                <CardTitle className="text-lg">Payout Schedule</CardTitle>
                            </div>
                            <CardContent className="space-y-4 pt-0">
                                <div className="flex justify-between items-center py-2.5 border-b border-white/5">
                                    <span className="text-gray-400 text-sm">Savings Interval</span>
                                    <span className="font-bold text-green-400 text-sm">{intervalLabel}</span>
                                </div>
                                <div className="flex justify-between items-center py-2.5 border-b border-white/5">
                                    <span className="text-gray-400 text-sm">Round</span>
                                    <span className="font-bold text-white text-sm">{group.currentRound} of {group.memberCount}</span>
                                </div>
                                <div className="flex justify-between items-center py-2.5 border-b border-white/5">
                                    <span className="text-gray-400 text-sm">Next Payout</span>
                                    <span className="font-bold text-white text-sm">{formatDateTime(currentRound.dueTimestamp.toNumber())}</span>
                                </div>
                                <div className="flex justify-between items-center py-2.5 border-b border-white/5">
                                    <span className="text-gray-400 text-sm">Recipient</span>
                                    <span className="font-mono text-sm text-purple-400">
                                        {memberProfiles[group.members[group.currentRound - 1]?.toString()]?.handle ? (
                                            `@${memberProfiles[group.members[group.currentRound - 1].toString()].handle}`
                                        ) : (
                                            `${group.members[group.currentRound - 1]?.toString().slice(0, 12)}...`
                                        )}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center py-2.5">
                                    <span className="text-gray-400 text-sm">Net Payout</span>
                                    <span className="font-bold text-white text-lg">{netPayout.toFixed(decimals === 6 ? 2 : 4)} {currency}</span>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Last Payout Card */}
                    {previousRound && previousRound.payoutSent && (
                        <Card className="bg-gradient-to-br from-blue-600/5 to-cyan-600/5 border-blue-500/15">
                            <div className="flex items-center gap-3 mb-5">
                                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                    <Banknote className="w-5 h-5 text-blue-400" />
                                </div>
                                <CardTitle className="text-lg">Last Payout</CardTitle>
                            </div>
                            <CardContent className="space-y-4 pt-0">
                                <div className="flex justify-between items-center py-2.5 border-b border-white/5">
                                    <span className="text-gray-400 text-sm">Round</span>
                                    <span className="font-bold text-white text-sm">Round {previousRound.roundNumber}</span>
                                </div>
                                <div className="flex justify-between items-center py-2.5 border-b border-white/5">
                                    <span className="text-gray-400 text-sm">Paid To</span>
                                    <span className="font-mono text-sm text-blue-400">
                                        {group.members[previousRound.roundNumber - 1]?.toString().slice(0, 12)}...
                                    </span>
                                </div>
                                <div className="flex justify-between items-center py-2.5 border-b border-white/5">
                                    <span className="text-gray-400 text-sm">Amount</span>
                                    <span className="font-bold text-white">{netPayout.toFixed(decimals === 6 ? 2 : 4)} {currency}</span>
                                </div>
                                <div className="flex justify-between items-center py-2.5">
                                    <span className="text-gray-400 text-sm">Payout Date</span>
                                    <span className="font-semibold text-white text-sm">{formatDateTime(previousRound.dueTimestamp.toNumber())}</span>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Circle Ledger */}
                    <Card className="border-white/10">
                        <CardTitle className="text-lg">Circle Ledger</CardTitle>
                        <CardContent className="space-y-4 pt-4">
                            <div className="flex justify-between items-center py-2 border-b border-white/5">
                                <span className="text-gray-400 text-sm">Total Cycle Payout</span>
                                <span className="font-bold">{payoutAmount.toFixed(decimals === 6 ? 2 : 4)} {currency}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-white/5">
                                <span className="text-gray-400 text-sm">Contribution</span>
                                <span className="font-bold text-white">{contributionAmount.toFixed(2)} {currency}</span>
                            </div>
                            <div className="flex justify-between items-center py-2.5 border-b border-white/5">
                                <span className="text-gray-400 text-sm italic">Platform Fee</span>
                                <span className="font-semibold text-white text-sm">{group.mint ? "1.21 USDC" : "0.01 SOL"} (Fixed)</span>
                            </div>
                            <div className="flex justify-between items-center py-2.5">
                                <span className="text-gray-400 text-sm italic">Fee Model</span>
                                <span className="text-[10px] text-purple-400 uppercase font-bold">Paid on Entry</span>
                            </div>
                            <div className="flex justify-between items-center py-2">
                                <span className="text-gray-400 text-sm">Interval</span>
                                <span className="font-bold text-white">{intervalLabel}</span>
                            </div>
                        </CardContent>
                    </Card>

                    {isUserMember && (
                        <Card className="bg-white/[0.03]">
                            <div className="flex items-center gap-3 mb-4">
                                <ShieldCheck className="w-6 h-6 text-green-500" />
                                <CardTitle className="text-lg">My Commitment</CardTitle>
                            </div>
                            <div className="space-y-4">
                                <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                                    <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">My Collateral Locked</p>
                                    <p className="text-xl font-bold">{(memberState.collateralBalance.toNumber() / factor).toFixed(decimals === 6 ? 2 : 4)} {currency}</p>
                                </div>
                                <div className="flex gap-2 text-[11px] text-gray-400 leading-tight p-2">
                                    <Info className="w-5 h-5 text-purple-400 shrink-0" />
                                    <span>Your collateral is fully refundable at the end of the cycle.</span>
                                </div>
                            </div>
                        </Card>
                    )}

                    <div className="p-6 rounded-3xl bg-yellow-500/5 border border-yellow-500/10">
                        <div className="flex items-center gap-2 mb-3 text-yellow-500">
                            <AlertCircle className="w-5 h-5" />
                            <p className="font-bold text-sm uppercase tracking-wider">Ajo Rules</p>
                        </div>
                        <ul className="space-y-3 text-[12px] text-gray-400 leading-relaxed">
                            <li className="flex gap-2">
                                <span className="text-yellow-500">•</span>
                                <span>Contributions are due by the deadline. Late payments trigger automatic collateral deduction.</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <ConfirmationModal
                isOpen={isLeaveModalOpen}
                onClose={() => setIsLeaveModalOpen(false)}
                onConfirm={handleLeaveGroup}
                title="Leave this Circle?"
                description="Your collateral and initial contribution will be fully refunded to your wallet. You can always join back later if there are open slots."
                confirmText="Leave Circle"
                variant="warning"
                loading={actionLoading}
            />

            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteGroup}
                title="Delete this Group?"
                description="This will permanently close the group and refund your gas reserve and collateral. This action cannot be undone."
                confirmText="Delete Permanently"
                variant="danger"
                loading={actionLoading}
            />
        </div>
    );
}
