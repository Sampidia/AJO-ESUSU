"use client";

import { useEffect, useState } from "react";
import { Card, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Globe, Users, Target, ShieldCheck, ArrowRight, TrendingUp } from "lucide-react";
import Link from "next/link";

export default function EcosystemPage() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const resp = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/stats/global`);
                const data = await resp.json();
                if (data.success) {
                    setStats(data);
                }
            } catch (error) {
                console.error("Failed to fetch global stats:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    return (
        <div className="container mx-auto px-4 py-20 max-w-6xl">
            {/* Hero Section */}
            <div className="text-center mb-20 space-y-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-sm font-bold uppercase tracking-widest">
                    <Globe className="w-4 h-4" /> Global Ecosystem
                </div>
                <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-gray-500">
                    Transparency at Scale
                </h1>
                <p className="text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
                    Real-time verification of all ESUSU circles running on Solana.
                    Decentralized savings, provable statistics.
                </p>
            </div>

            {/* Metrics Grid */}
            <div className="grid md:grid-cols-3 gap-8 mb-20">
                <Card className="bg-gradient-to-br from-purple-600/10 to-indigo-600/5 border-purple-500/20 pt-10 pb-8 text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <TrendingUp className="w-20 h-20" />
                    </div>
                    <p className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-2">Total Value Locked</p>
                    <h2 className="text-5xl font-black text-white">{loading ? "---" : stats?.tvl.toFixed(2)} <span className="text-2xl font-normal text-gray-500">SOL</span></h2>
                </Card>

                <Card className="bg-white/[0.02] border-white/5 pt-10 pb-8 text-center">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Active Circles</p>
                    <h2 className="text-5xl font-black text-white">{loading ? "---" : stats?.circles}</h2>
                    <div className="flex items-center justify-center gap-1 mt-4 text-green-500 text-xs font-bold">
                        <Target className="w-3 h-3" /> Growing Ecosystem
                    </div>
                </Card>

                <Card className="bg-white/[0.02] border-white/5 pt-10 pb-8 text-center">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Total Savers</p>
                    <h2 className="text-5xl font-black text-white">{loading ? "---" : stats?.users}</h2>
                    <div className="flex items-center justify-center gap-1 mt-4 text-indigo-400 text-xs font-bold">
                        <Users className="w-3 h-3" /> Community Powered
                    </div>
                </Card>
            </div>

            {/* Trust Section */}
            <div className="grid lg:grid-cols-2 gap-12 items-center bg-white/[0.01] border border-white/5 rounded-[40px] p-8 md:p-16">
                <div>
                    <h3 className="text-3xl font-bold mb-6">Why ESUSU?</h3>
                    <div className="space-y-6">
                        <div className="flex gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center shrink-0">
                                <ShieldCheck className="w-6 h-6 text-green-400" />
                            </div>
                            <div>
                                <h4 className="font-bold text-lg">Fully Non-Custodial</h4>
                                <p className="text-gray-500 text-sm">Your funds are governed by smart contracts, not individuals.</p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center shrink-0">
                                <Globe className="w-6 h-6 text-blue-400" />
                            </div>
                            <div>
                                <h4 className="font-bold text-lg">On-Chain Verifiable</h4>
                                <p className="text-gray-500 text-sm">Every contribution is etched into the Solana blockchain.</p>
                            </div>
                        </div>
                    </div>
                    <div className="mt-10">
                        <Link href="/">
                            <Button variant="primary" size="lg" className="px-10 gap-2">
                                Launch Your Circle <ArrowRight className="w-4 h-4" />
                            </Button>
                        </Link>
                    </div>
                </div>
                <div className="relative">
                    <div className="aspect-square bg-gradient-to-tr from-purple-600/20 to-indigo-600/20 rounded-[80px] blur-3xl absolute inset-0 -z-10" />
                    <img
                        src="https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&q=80&w=2832"
                        alt="Blockchain Visualization"
                        className="rounded-[40px] border border-white/10 shadow-2xl"
                    />
                </div>
            </div>
        </div>
    );
}
