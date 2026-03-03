"use client";

import { useEffect, useState } from "react";
import { Card, CardTitle, CardContent } from "@/components/ui/Card";
import { TrendingUp, Wallet, Award, Activity } from "lucide-react";

export function DashboardCharts({ publicKey }: { publicKey: string }) {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const resp = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/stats/user/${publicKey}`);
                const result = await resp.json();
                if (result.success) {
                    setData(result.chartData);
                }
            } catch (error) {
                console.error("Failed to fetch performance stats:", error);
            } finally {
                setLoading(false);
            }
        };

        if (publicKey) fetchStats();
    }, [publicKey]);

    if (loading) return <div className="h-64 bg-white/5 animate-pulse rounded-3xl" />;

    const totalSaved = data.length > 0 ? data[data.length - 1].saved : 0;
    const lastContribution = data.filter(d => d.type === "CONTRIBUTION").pop();

    return (
        <div className="grid md:grid-cols-2 gap-6">
            <Card className="bg-gradient-to-br from-purple-600/10 to-indigo-600/5 border-purple-500/20">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-purple-500/20 flex items-center justify-center">
                        <TrendingUp className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                        <CardTitle className="text-lg">Assets Saved Over Time</CardTitle>
                        <p className="text-3xl font-bold mt-1 text-white">{totalSaved.toFixed(2)} <span className="text-sm font-normal text-gray-500">Value</span></p>
                    </div>
                </div>

                <div className="h-32 flex items-end gap-1 px-2">
                    {data.slice(-20).map((d, i) => (
                        <div
                            key={i}
                            className="bg-purple-500/40 hover:bg-purple-400 transition-all rounded-t-sm flex-1"
                            style={{ height: `${(d.saved / (totalSaved || 1)) * 100}%` }}
                            title={`${d.date}: ${d.saved.toFixed(2)}`}
                        />
                    ))}
                    {data.length === 0 && <div className="w-full text-center text-gray-500 text-sm mb-8 italic">Start contributing to see your growth</div>}
                </div>
            </Card>

            <div className="grid grid-rows-2 gap-4">
                <Card className="flex items-center gap-4 py-4">
                    <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                        <Award className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 uppercase font-bold">Total History</p>
                        <p className="font-bold text-white">{data.length} Transactions</p>
                    </div>
                </Card>
                <Card className="flex items-center gap-4 py-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                        <Activity className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 uppercase font-bold">Latest Impact</p>
                        <p className="font-bold text-white">
                            {lastContribution ? `+${lastContribution.amount.toFixed(2)}` : "No savings yet"}
                        </p>
                    </div>
                </Card>
            </div>
        </div>
    );
}
