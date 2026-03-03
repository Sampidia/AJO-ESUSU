"use client";

import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useEffect, useState, useMemo } from "react";
import { getProgram, getMemberAddress, getVaultAddress } from "../../lib/anchor";
import { Card, CardTitle, CardDescription, CardContent, CardFooter } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Plus, Users, Wallet, ArrowUpRight, Loader2, Trash2, LogOut, CircleDollarSign } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ConfirmationModal } from "../../components/ui/ConfirmationModal";
import { parseError } from "../../lib/errors";
import { Tooltip } from "../../components/ui/Tooltip";
import { SystemProgram } from "@solana/web3.js";
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from "@solana/spl-token";

export default function Dashboard() {
    const { connected, publicKey, wallet } = useWallet();
    const { connection } = useConnection();
    const router = useRouter();

    const [groups, setGroups] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState<any>(null);
    const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [activeStatusFilters, setActiveStatusFilters] = useState<string[]>(['filling', 'active', 'completed']);
    const [error, setError] = useState<string | null>(null);

    const fetchGroups = async () => {
        if (!publicKey) return;
        setLoading(true);
        try {
            const program = getProgram(connection, wallet?.adapter);

            // Manual fetch to handle legacy accounts gracefully
            const accounts = await connection.getProgramAccounts(program.programId, {
                filters: [
                    {
                        memcmp: program.coder.accounts.memcmp("groupState")
                    }
                ]
            });

            const allGroups = accounts.map(acc => {
                try {
                    return {
                        publicKey: acc.pubkey,
                        account: program.coder.accounts.decode("groupState", acc.account.data)
                    };
                } catch (e) {
                    console.warn(`Skipping incompatible group account: ${acc.pubkey.toString()}`);
                    return null;
                }
            }).filter((g): g is any => g !== null);

            const userGroups = allGroups.filter((g: any) => {
                const isAdmin = g.account.admin.equals(publicKey);
                const isMember = g.account.members.some((m: any) => m.equals(publicKey));
                return isAdmin || isMember;
            });
            setGroups(userGroups);
        } catch (err) {
            console.error("Error fetching groups:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!connected && !loading) {
            router.push("/");
        }
    }, [connected, loading, router]);

    useEffect(() => {
        fetchGroups();
    }, [publicKey, connection, wallet]);

    const handleLeaveGroup = async () => {
        if (!publicKey || !wallet?.adapter || !selectedGroup) return;
        setActionLoading(true);
        try {
            const program = getProgram(connection, wallet.adapter);
            const vaultPda = getVaultAddress(selectedGroup.publicKey);
            const memberPda = getMemberAddress(selectedGroup.publicKey, publicKey);

            let accounts: any = {
                member: publicKey,
                groupState: selectedGroup.publicKey,
                memberState: memberPda,
                vault: vaultPda,
                systemProgram: SystemProgram.programId,
            };

            if (selectedGroup.account.mint) {
                const memberAta = getAssociatedTokenAddressSync(selectedGroup.account.mint, publicKey);
                const vaultAta = getAssociatedTokenAddressSync(selectedGroup.account.mint, vaultPda, true);

                accounts = {
                    ...accounts,
                    mint: selectedGroup.account.mint,
                    vaultTokenAccount: vaultAta,
                    memberTokenAccount: memberAta,
                    tokenProgram: TOKEN_PROGRAM_ID,
                };
            } else {
                accounts = {
                    ...accounts,
                    mint: SystemProgram.programId,
                    vaultTokenAccount: vaultPda,
                    memberTokenAccount: publicKey,
                    tokenProgram: TOKEN_PROGRAM_ID,
                };
            }
            await program.methods
                .leaveGroup()
                .accounts(accounts)
                .rpc();
            await fetchGroups();
            setIsLeaveModalOpen(false);
        } catch (err: any) {
            console.error("Error leaving group:", err);
            setError(parseError(err));
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteGroup = async () => {
        if (!publicKey || !wallet?.adapter || !selectedGroup) return;
        setActionLoading(true);
        try {
            const program = getProgram(connection, wallet.adapter);
            const vaultPda = getVaultAddress(selectedGroup.publicKey);
            const memberPda = getMemberAddress(selectedGroup.publicKey, publicKey);

            let accounts: any = {
                admin: publicKey,
                groupState: selectedGroup.publicKey,
                memberState: memberPda,
                vault: vaultPda,
                systemProgram: SystemProgram.programId,
            };

            if (selectedGroup.account.mint) {
                const adminAta = getAssociatedTokenAddressSync(selectedGroup.account.mint, publicKey);
                const vaultAta = getAssociatedTokenAddressSync(selectedGroup.account.mint, vaultPda, true);

                accounts = {
                    ...accounts,
                    mint: selectedGroup.account.mint,
                    vaultTokenAccount: vaultAta,
                    adminTokenAccount: adminAta,
                    tokenProgram: TOKEN_PROGRAM_ID,
                };
            } else {
                accounts = {
                    ...accounts,
                    mint: SystemProgram.programId,
                    vaultTokenAccount: vaultPda,
                    adminTokenAccount: publicKey,
                    tokenProgram: TOKEN_PROGRAM_ID,
                };
            }
            await program.methods
                .deleteGroup()
                .accounts(accounts)
                .rpc();
            await fetchGroups();
            setIsDeleteModalOpen(false);
        } catch (err: any) {
            console.error("Error deleting group:", err);
            setError(parseError(err));
        } finally {
            setActionLoading(false);
        }
    };

    const toggleFilter = (filter: string) => {
        if (filter === 'ongoing') {
            const hasOngoing = activeStatusFilters.includes('filling') || activeStatusFilters.includes('active');
            if (hasOngoing) {
                setActiveStatusFilters(prev => prev.filter(f => f !== 'filling' && f !== 'active'));
            } else {
                setActiveStatusFilters(prev => [...prev, 'filling', 'active']);
            }
        } else {
            setActiveStatusFilters(prev =>
                prev.includes(filter)
                    ? prev.filter(f => f !== filter)
                    : [...prev, filter]
            );
        }
    };

    const filteredGroups = useMemo(() => {
        return groups.filter(g => {
            const statusKey = Object.keys(g.account.status)[0];
            return activeStatusFilters.includes(statusKey);
        });
    }, [groups, activeStatusFilters]);

    const reconciledGroups = useMemo(() => {
        return filteredGroups.map(g => {
            return {
                ...g,
                isCompleted: !!g.account.status.completed
            };
        });
    }, [filteredGroups]);

    const ongoingGroups = reconciledGroups.filter(g => !g.isCompleted);
    const completedGroups = reconciledGroups.filter(g => g.isCompleted);

    const totalContributionsSOL = useMemo(() => groups.filter(g => !g.account.mint).reduce((acc, g) => acc + (g.account.contributionAmount.toNumber() / 1e9), 0), [groups]);
    const totalContributionsUSDC = useMemo(() => groups.filter(g => g.account.mint).reduce((acc, g) => acc + (g.account.contributionAmount.toNumber() / 1e6), 0), [groups]);

    const totalPayoutSOL = useMemo(() => {
        if (!publicKey) return 0;
        return groups.filter(g => !g.account.mint).reduce((acc, g) => {
            const memberIdx = g.account.members.findIndex((m: any) => m.equals(publicKey));
            if (memberIdx === -1) return acc;

            const ourPayoutRound = memberIdx + 1;
            const statusKey = Object.keys(g.account.status)[0];

            if (statusKey === 'completed' || g.account.currentRound > ourPayoutRound) {
                return acc + (g.account.payoutAmount.toNumber() / 1e9);
            }
            return acc;
        }, 0);
    }, [groups, publicKey]);

    const totalPayoutUSDC = useMemo(() => {
        if (!publicKey) return 0;
        return groups.filter(g => g.account.mint).reduce((acc, g) => {
            const memberIdx = g.account.members.findIndex((m: any) => m.equals(publicKey));
            if (memberIdx === -1) return acc;

            const ourPayoutRound = memberIdx + 1;
            const statusKey = Object.keys(g.account.status)[0];

            if (statusKey === 'completed' || g.account.currentRound > ourPayoutRound) {
                return acc + (g.account.payoutAmount.toNumber() / 1e6);
            }
            return acc;
        }, 0);
    }, [groups, publicKey]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
            </div>
        );
    }

    if (!connected) return null;

    return (
        <div className="container mx-auto px-4 py-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
                <div>
                    <h1 className="text-3xl font-bold mb-2">My Dashboard</h1>
                    <p className="text-gray-400">Manage your Ajo circles and track your savings.</p>
                </div>

                <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5 backdrop-blur-sm">
                    <button
                        onClick={() => toggleFilter('ongoing')}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 ${activeStatusFilters.includes('filling') || activeStatusFilters.includes('active')
                            ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
                            : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        Ongoing
                    </button>
                    <button
                        onClick={() => toggleFilter('completed')}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 ${activeStatusFilters.includes('completed')
                            ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
                            : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        Completed
                    </button>
                </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                <Card className="bg-gradient-to-br from-purple-600/10 to-transparent border-purple-500/10 h-32 flex flex-col justify-center">
                    <CardDescription className="flex items-center gap-2">
                        <Users className="w-4 h-4" /> Active Circles
                    </CardDescription>
                    <CardTitle className="text-3xl mt-2">{groups.filter(g => !g.account.status.completed).length}</CardTitle>
                </Card>

                <Card className="h-32 flex flex-col justify-center">
                    <CardDescription className="flex items-center gap-2">
                        <Wallet className="w-4 h-4" /> Total Contributions
                    </CardDescription>
                    <div className="mt-2 text-2xl font-bold flex flex-col items-start leading-tight">
                        <div className="text-white">{totalContributionsSOL.toFixed(4)} SOL</div>
                        {totalContributionsUSDC > 0 && <div className="text-blue-400 text-sm mt-0.5">{totalContributionsUSDC.toFixed(2)} USDC</div>}
                    </div>
                </Card>

                <Card className="bg-gradient-to-br from-green-600/10 to-transparent border-green-500/10 h-32 flex flex-col justify-center">
                    <CardDescription className="flex items-center gap-2 text-green-400">
                        <CircleDollarSign className="w-4 h-4" /> Total Received
                    </CardDescription>
                    <div className="mt-2 text-2xl font-bold flex flex-col items-start leading-tight text-white">
                        <div className="text-white">{totalPayoutSOL.toFixed(4)} SOL</div>
                        {totalPayoutUSDC > 0 && <div className="text-blue-400 text-sm mt-0.5">{totalPayoutUSDC.toFixed(2)} USDC</div>}
                    </div>
                </Card>

                <Card className="border-dashed flex items-center justify-center h-32 p-0">
                    <Link href="/create" className="w-full h-full flex items-center justify-center p-4">
                        <Button variant="outline" className="gap-2 w-full whitespace-nowrap border-purple-500/20 hover:border-purple-500/40 text-sm">
                            <Plus className="w-4 h-4 shrink-0" /> Create New Circle
                        </Button>
                    </Link>
                </Card>
            </div>

            {/* Sections */}
            {(activeStatusFilters.includes('filling') || activeStatusFilters.includes('active')) && ongoingGroups.length > 0 && (
                <div className="mb-12">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                        Ongoing Circles
                        <span className="bg-purple-600/20 text-purple-400 text-xs px-2 py-0.5 rounded-full">{ongoingGroups.length}</span>
                    </h2>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {ongoingGroups.map((group) => (
                            <CircleCard key={group.publicKey.toString()} group={group} publicKey={publicKey} onAction={(g, type) => {
                                setSelectedGroup(g);
                                if (type === 'leave') setIsLeaveModalOpen(true);
                                if (type === 'delete') setIsDeleteModalOpen(true);
                            }} />
                        ))}
                    </div>
                </div>
            )}

            {activeStatusFilters.includes('completed') && completedGroups.length > 0 && (
                <div className="mb-12">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                        Completed Circles
                        <span className="bg-green-600/20 text-green-400 text-xs px-2 py-0.5 rounded-full">{completedGroups.length}</span>
                    </h2>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {completedGroups.map((group) => (
                            <CircleCard key={group.publicKey.toString()} group={group} publicKey={publicKey} onAction={() => { }} />
                        ))}
                    </div>
                </div>
            )}

            {groups.length === 0 && (
                <div className="text-center py-20 rounded-3xl border border-dashed border-white/10 bg-white/[0.01]">
                    <p className="text-gray-500 mb-6">You are not part of any savings circles yet.</p>
                    <Link href="/explore">
                        <Button variant="primary">Explore Public Groups</Button>
                    </Link>
                </div>
            )}

            {/* Modals */}
            <ConfirmationModal
                isOpen={isLeaveModalOpen}
                onClose={() => setIsLeaveModalOpen(false)}
                onConfirm={handleLeaveGroup}
                title="Leave this Circle?"
                description={`You are about to leave '${selectedGroup?.account.name}'. Your collateral and initial contribution will be fully returned to your wallet.`}
                confirmText="Leave Circle"
                variant="warning"
                loading={actionLoading}
            />

            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteGroup}
                title="Delete this Group?"
                description={`Are you sure you want to delete '${selectedGroup?.account.name}'? This will refund your gas reserve, collateral, and the initial contribution. This action is irreversible.`}
                confirmText="Delete Group"
                variant="danger"
                loading={actionLoading}
            />
        </div>
    );
}

function CircleCard({ group, publicKey, onAction }: { group: any, publicKey: any, onAction: (g: any, type: string) => void }) {
    const isCompleted = group.isCompleted; // Use the pre-calculated isCompleted from reconciledGroups

    return (
        <Card key={group.publicKey.toString()} className="group hover:scale-[1.02]">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <CardTitle className="text-lg">{group.account.name}</CardTitle>
                    <CardDescription>
                        {group.account.members.length} / {group.account.memberCount} Members
                    </CardDescription>
                </div>
                <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${group.account.status.filling ? 'bg-yellow-500/10 text-yellow-500' :
                    isCompleted ? 'bg-green-500/10 text-green-500' : 'bg-green-500/10 text-green-500'
                    }`}>
                    {group.account.status.filling ? 'filling' : isCompleted ? 'completed' : 'active'}
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Payout</span>
                    <span className="font-semibold text-white">
                        {group.account.mint
                            ? `${(group.account.payoutAmount.toNumber() / 1e6).toFixed(2)} USDC`
                            : `${(group.account.payoutAmount.toNumber() / 1e9).toFixed(4)} SOL`}
                    </span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Contribution</span>
                    <span className="font-semibold text-white">
                        {group.account.mint
                            ? `${(group.account.contributionAmount.toNumber() / 1e6).toFixed(2)} USDC`
                            : `${(group.account.contributionAmount.toNumber() / 1e9).toFixed(4)} SOL`}
                    </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-purple-600 rounded-full transition-all duration-1000"
                        style={{ width: `${(group.account.members.length / group.account.memberCount) * 100}%` }}
                    ></div>
                </div>
            </div>

            <CardFooter className="mt-8 flex gap-2">
                <Link href={`/group/${group.publicKey.toString()}`} className="flex-1">
                    <Button variant="outline" className="w-full gap-2 group-hover:bg-purple-600 group-hover:border-purple-600 group-hover:text-white transition-all">
                        View Details <ArrowUpRight className="w-4 h-4" />
                    </Button>
                </Link>
                {group.account.status.filling && (
                    <>
                        {group.account.admin.equals(publicKey) ? (
                            group.account.members.length === 1 ? (
                                <Tooltip content="Delete Group">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="w-12 h-12 border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            onAction(group, 'delete');
                                        }}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </Tooltip>
                            ) : (
                                <Tooltip content="Admin cannot leave. All members must leave group first.">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="w-12 h-12 border-gray-500/20 text-gray-500 cursor-not-allowed opacity-50"
                                        disabled
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </Tooltip>
                            )
                        ) : (
                            <Tooltip content="Leave Circle">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="w-12 h-12 border-yellow-500/20 text-yellow-500 hover:bg-yellow-500 hover:text-white"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        onAction(group, 'leave');
                                    }}
                                >
                                    <LogOut className="w-4 h-4" />
                                </Button>
                            </Tooltip>
                        )}
                    </>
                )}
            </CardFooter>
        </Card>
    );
}
