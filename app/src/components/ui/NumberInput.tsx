"use client";

import React from "react";
import { Minus, Plus } from "lucide-react";

interface NumberInputProps {
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    icon: React.ReactNode;
    label: string;
    unit?: string;
}

export function NumberInput({
    value,
    onChange,
    min = 0,
    max = 100,
    step = 1,
    icon,
    label,
    unit
}: NumberInputProps) {
    const handleDecrement = () => {
        const newValue = Math.max(min, value - step);
        onChange(Number(newValue.toFixed(3)));
    };

    const handleIncrement = () => {
        const newValue = Math.min(max, value + step);
        onChange(Number(newValue.toFixed(3)));
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center px-1">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{label}</span>
                {unit && <span className="text-[10px] font-medium text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full">{unit}</span>}
            </div>

            <div className="relative group">
                <div className="flex items-center h-16 bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden transition-all duration-300 group-hover:border-purple-500/30 group-hover:bg-white/[0.05]">
                    {/* Icon Section */}
                    <div className="w-12 h-full flex items-center justify-center border-r border-white/5 bg-white/[0.02]">
                        <div className="text-gray-400 group-hover:text-purple-400 transition-colors">
                            {icon}
                        </div>
                    </div>

                    {/* Value Section */}
                    <div className="flex-1 px-4 min-w-0 overflow-hidden">
                        <span className="text-lg font-bold tracking-tight text-white leading-none truncate">
                            {value.toLocaleString(undefined, { minimumFractionDigits: step < 1 ? 2 : 0 })}
                        </span>
                    </div>

                    {/* Controls Section */}
                    <div className="flex items-center h-full border-l border-white/10 bg-white/[0.02]">
                        <button
                            type="button"
                            onClick={handleDecrement}
                            disabled={value <= min}
                            className="w-11 h-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5 transition-all disabled:opacity-20 disabled:pointer-events-none active:scale-90"
                        >
                            <Minus className="w-4 h-4" />
                        </button>

                        <div className="w-[1px] h-8 bg-white/10" />

                        <button
                            type="button"
                            onClick={handleIncrement}
                            disabled={value >= max}
                            className="w-11 h-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5 transition-all disabled:opacity-20 disabled:pointer-events-none active:scale-90"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Subtle outer glow on hover */}
                <div className="absolute inset-0 rounded-2xl bg-purple-500/5 opacity-0 group-hover:opacity-100 blur-xl -z-10 transition-opacity" />
            </div>
        </div>
    );
}
