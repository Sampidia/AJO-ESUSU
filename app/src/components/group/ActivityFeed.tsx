"use client";

import { useEffect, useState } from "react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Clock, User, Zap, CircleDollarSign, Play, Rocket } from "lucide-react";

interface Activity {
    id: string;
    type: string;
    message: string;
    createdAt: string;
    user?: {
        handle?: string;
        publicKey: string;
        avatarUrl?: string;
    };
}

export function ActivityFeed({ groupId }: { groupId: string }) {
    const [activities, setActivities] = useState<Activity[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchActivities = async () => {
        try {
            const resp = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/group/${groupId}/activities`);
            const data = await resp.json();
            if (data.success) {
                setActivities(data.activities);
            }
        } catch (error) {
            console.error("Failed to fetch activities:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchActivities();
        const interval = setInterval(fetchActivities, 15000);
        return () => clearInterval(interval);
    }, [groupId]);

    const getIcon = (type: string) => {
        switch (type) {
            case "JOIN": return <User className="w-4 h-4 text-blue-400" />;
            case "CONTRIBUTION": return <CircleDollarSign className="w-4 h-4 text-green-400" />;
            case "PAYOUT_EXECUTED": return <Rocket className="w-4 h-4 text-purple-400" />;
            case "CYCLE_STARTED": return <Play className="w-4 h-4 text-yellow-400" />;
            case "GROUP_ALERT": return <AlertCircle className="w-4 h-4 text-orange-400" />;
            default: return <Zap className="w-4 h-4 text-gray-400" />;
        }
    };

    if (loading && activities.length === 0) {
        return (
            <div className="animate-pulse space-y-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-16 bg-white/5 rounded-2xl" />
                ))}
            </div>
        );
    }

    return (
        <Card className="border-white/5 bg-white/[0.02]">
            <CardTitle className="text-lg mb-6 flex items-center gap-2">
                <Clock className="w-5 h-5 text-purple-400" />
                Recent Events
            </CardTitle>
            <div className="space-y-4">
                {activities.length === 0 ? (
                    <p className="text-center py-8 text-gray-500 text-sm italic">No recent activity found.</p>
                ) : (
                    activities.map((activity) => (
                        <div key={activity.id} className="flex gap-4 group">
                            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center shrink-0 border border-white/5 group-hover:bg-white/10 transition-colors">
                                {getIcon(activity.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-300 leading-tight">
                                    <span className="text-white font-medium">
                                        {activity.user?.handle ? `@${activity.user.handle}` :
                                            activity.user?.publicKey ? `${activity.user.publicKey.slice(0, 6)}...` : "System"}
                                    </span>{" "}
                                    {activity.message}
                                </p>
                                <span className="text-[10px] text-gray-500 mt-1 block uppercase">
                                    {new Date(activity.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </Card>
    );
}
