"use client";

import { useConnection } from "@solana/wallet-adapter-react";
import { useEffect, useState } from "react";
import { getProgram } from "@/lib/anchor";
import { Card, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Search, Filter, Loader2, ArrowRight, UserPlus } from "lucide-react";
import { Input } from "@/components/ui/Input";
import Link from "next/link";

export default function ExploreGroups() {
    const { connection } = useConnection();
    const [groups, setGroups] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [activeIntervalFilters, setActiveIntervalFilters] = useState<number[]>([0, 1, 2, 3]);

    useEffect(() => {
        async function fetchAllGroups() {
            try {
                const program = getProgram(connection, { publicKey: null }); // Public fetch
                // Manual fetch to handle legacy accounts gracefully
                const accounts = await connection.getProgramAccounts(program.programId, {
                    filters: [{ memcmp: program.coder.accounts.memcmp("groupState") }]
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

                // Only show groups that are in "filling" status and not full
                const fillingGroups = allGroups.filter((g: any) =>
                    g.account.status.filling &&
                    g.account.members.length < g.account.memberCount
                );
                setGroups(fillingGroups);
            } catch (err) {
                console.error("Error fetching public groups:", err);
            } finally {
                setLoading(false);
            }
        }
        fetchAllGroups();
    }, [connection]);

    const toggleIntervalFilter = (interval: number) => {
        setActiveIntervalFilters(prev =>
            prev.includes(interval)
                ? prev.filter(i => i !== interval)
                : [...prev, interval]
        );
    };

    const filteredGroups = groups.filter(g =>
        g.account.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        activeIntervalFilters.includes(g.account.roundInterval)
    );

    const intervalLabels: { [key: number]: string } = {
        0: 'Daily',
        1: 'Weekly',
        2: 'Monthly',
        3: 'Yearly'
    };

    return (
        <div className="container mx-auto px-4 py-12 max-w-6xl">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                <div>
                    <h1 className="text-3xl font-bold mb-2 font-montserrat">Explore Circles</h1>
                    <p className="text-gray-400 font-sans">Discover and join community savings groups on-chain.</p>
                </div>

                <div className="flex w-full md:w-auto gap-4">
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <Input
                            placeholder="Search groups..."
                            className="pl-12 bg-white/5 border-white/5"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Interval Filters */}
            <div className="flex flex-wrap gap-2 mb-12 bg-white/5 p-2 rounded-2xl border border-white/5 backdrop-blur-sm w-fit">
                {[0, 1, 2, 3].map((idx) => (
                    <button
                        key={idx}
                        onClick={() => toggleIntervalFilter(idx)}
                        className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all duration-300 ${activeIntervalFilters.includes(idx)
                            ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        {intervalLabels[idx]}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex items-center justify-center min-h-[40vh]">
                    <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
                </div>
            ) : filteredGroups.length === 0 ? (
                <div className="text-center py-24 rounded-3xl border border-dashed border-white/10 bg-white/[0.01]">
                    <Search className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                    <h3 className="text-xl font-bold mb-2">No groups found</h3>
                    <p className="text-gray-500">Try a different filter or search term.</p>
                </div>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredGroups.map((group) => {
                        const slotsLeft = group.account.memberCount - group.account.members.length;
                        const isUSDC = !!group.account.mint;
                        const factor = isUSDC ? 1e6 : 1e9;
                        const currency = isUSDC ? "USDC" : "SOL";
                        const currDecimals = isUSDC ? 2 : 4;
                        const contributionAmt = group.account.contributionAmount.toNumber() / factor;
                        const payoutAmt = group.account.payoutAmount.toNumber() / factor;

                        return (
                            <Card key={group.publicKey.toString()} className="hover:border-purple-500/30">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <CardTitle className="text-lg">{group.account.name}</CardTitle>
                                        <CardDescription className="flex items-center gap-1 mt-1">
                                            <Clock className="w-3 h-3" /> {intervalLabels[group.account.roundInterval] || 'Unknown'}
                                        </CardDescription>
                                    </div>
                                    <div className="px-2 py-1 rounded bg-purple-500/10 text-purple-400 text-[10px] font-bold uppercase tracking-wider">
                                        {slotsLeft} slots remaining
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div className="p-3 rounded-2xl bg-white/5">
                                        <p className="text-[10px] text-gray-500 font-bold uppercase mb-1 tracking-tight">Per Round</p>
                                        <p className="font-bold text-white">{contributionAmt.toFixed(currDecimals)} {currency}</p>
                                    </div>
                                    <div className="p-3 rounded-2xl bg-white/5">
                                        <p className="text-[10px] text-gray-400 font-bold uppercase mb-1 tracking-tight italic">Total Payout</p>
                                        <p className="font-bold text-purple-400">{payoutAmt.toFixed(currDecimals)} {currency}</p>
                                    </div>
                                </div>

                                {/* Slots Visual Indicator */}
                                <div className="flex gap-1 mb-8">
                                    {Array.from({ length: group.account.memberCount }).map((_, i) => (
                                        <div
                                            key={i}
                                            className={`h-1.5 flex-1 rounded-full ${i < group.account.members.length ? 'bg-purple-600' : 'bg-white/10'}`}
                                        ></div>
                                    ))}
                                </div>

                                <CardFooter>
                                    <Link href={`/join/${group.publicKey.toString()}`} className="w-full">
                                        <Button variant="primary" className="w-full gap-2">
                                            Join Group <UserPlus className="w-4 h-4" />
                                        </Button>
                                    </Link>
                                </CardFooter>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// Missing component from Lucide
function Clock(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
        </svg>
    );
}
