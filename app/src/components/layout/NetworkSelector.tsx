"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

export default function NetworkSelector() {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1 md:py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-xs font-semibold"
            >
                <div className="relative flex h-2 w-2">
                    <span className="animate-beep absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
                </div>
                <span className="hidden md:inline text-gray-200">DEVNET</span>
                <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>

            {isOpen && (
                <div className="fixed md:absolute top-16 md:top-full mt-2 right-2 md:right-0 w-48 rounded-2xl bg-black border border-white/10 shadow-2xl overflow-hidden z-[60] py-1 animate-in fade-in slide-in-from-top-2 duration-200">
                    <button className="w-full flex items-center justify-between px-4 py-2 text-xs font-medium bg-white/5 text-white cursor-default">
                        <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-red-600"></div>
                            <span>DEVNET</span>
                        </div>
                        <span className="text-[10px] text-green-400 uppercase tracking-wider">Active</span>
                    </button>

                    <div className="w-full flex items-center justify-between px-4 py-2 text-xs font-medium text-gray-500 cursor-not-allowed grayscale">
                        <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-gray-600"></div>
                            <span>MAINNET</span>
                        </div>
                        <span className="text-[9px] text-gray-600 uppercase tracking-tight">Coming Soon</span>
                    </div>
                </div>
            )}
        </div>
    );
}
