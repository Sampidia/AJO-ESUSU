"use client";

import { CheckCircle2, Circle, ArrowRight } from "lucide-react";
import { PublicKey } from "@solana/web3.js";

interface PayoutTimelineProps {
    members: PublicKey[];
    currentRound: number;
    memberCount: number;
    status: any;
    payoutSent?: boolean;
}

export function PayoutTimeline({ members, currentRound, memberCount, status, payoutSent }: PayoutTimelineProps) {
    const isCompleted = !!status.completed;
    const isActive = !!status.active;

    return (
        <div className="w-full py-8">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-6 px-1">Payout Progression</h3>
            <div className="relative flex items-center justify-between">
                {/* Connector Line */}
                <div className="absolute left-0 right-0 h-0.5 bg-white/5 -z-0" />
                <div
                    className="absolute left-0 h-0.5 bg-gradient-to-r from-purple-500 to-indigo-500 -z-0 transition-all duration-1000"
                    style={{ width: `${Math.min(100, (isCompleted ? memberCount : (currentRound - (isActive ? (payoutSent ? 0 : 0.5) : 1))) / (memberCount - 1) * 100)}%` }}
                />

                {members.map((member, idx) => {
                    const pos = idx + 1;
                    const isPast = isCompleted || pos < currentRound || (pos === currentRound && payoutSent);
                    const isCurrent = isActive && pos === currentRound && !payoutSent;

                    return (
                        <div key={member.toString()} className="relative z-10 flex flex-col items-center">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${isPast ? 'bg-purple-600 border-purple-500 scale-110 shadow-[0_0_15px_rgba(147,51,234,0.3)]' :
                                isCurrent ? 'bg-indigo-900 border-indigo-400 animate-pulse' :
                                    'bg-gray-900 border-gray-800'
                                }`}>
                                {isPast ? (
                                    <CheckCircle2 className="w-5 h-5 text-white" />
                                ) : isCurrent ? (
                                    <Rocket className="w-5 h-5 text-indigo-400" />
                                ) : (
                                    <span className="text-xs font-bold text-gray-500">{pos}</span>
                                )}
                            </div>

                            <div className="absolute top-12 flex flex-col items-center whitespace-nowrap">
                                <p className={`text-[10px] font-bold uppercase tracking-tighter ${isCurrent ? 'text-indigo-400' : isPast ? 'text-purple-400' : 'text-gray-600'
                                    }`}>
                                    {isCurrent ? "Collecting" : isPast ? "Paid Outs" : `Round ${pos}`}
                                </p>
                                <p className="text-[10px] font-mono text-gray-500 mt-0.5">
                                    {member.toString().slice(0, 4)}...
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function Rocket(props: any) {
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
            <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.4 1.22-1.3 2-2" />
            <path d="M11.5 9.5 7 14" />
            <path d="M16 5c1.1 0 2 1.1 2 2 .4.7 1.3 1.2 2 2 0 1.1-1.1 2-2 2-.7.4-1.2 1.3-2 2 0 1.1-1.1 2-2 2-.7.4-1.3 1.2-2 2-1.1 0-2-1.1-2-2-.4-.7-1.2-1.2-2-2 0-1.1 1.1-2 2-2 .7-.4 1.2-1.3 2-2 0-1.1 1.1-2 2-2 .7-.4 1.3-1.2 2-2Z" />
            <path d="M19 15h2" />
            <path d="M15 19v2" />
            <path d="M13 15v2" />
            <path d="M15 13h2" />
        </svg>
    )
}
