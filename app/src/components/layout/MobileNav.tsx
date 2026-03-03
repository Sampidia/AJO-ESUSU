"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Compass,
    PlusCircle,
    Settings,
    Home
} from "lucide-react";

const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Explore", href: "/explore", icon: Compass },
    { name: "Create", href: "/create", icon: PlusCircle },
    { name: "Settings", href: "/settings", icon: Settings },
];

export default function MobileNav() {
    const pathname = usePathname();

    return (
        <div className="lg:hidden fixed bottom-6 left-0 right-0 z-[100] px-4 flex justify-center animate-in fade-in slide-in-from-bottom-5 duration-500">
            <nav className="w-full max-w-[400px] h-16 bg-black/60 backdrop-blur-xl border border-white/10 rounded-[2.5rem] shadow-2xl flex items-center justify-around px-2 relative">
                {/* Subtle top glare */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="relative flex flex-col items-center justify-center py-1 group min-w-[64px]"
                        >
                            <div className={`
                                flex items-center justify-center rounded-2xl transition-all duration-300
                                w-9 h-9
                                ${isActive
                                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                                    : 'text-gray-400 group-hover:text-white group-hover:bg-white/5'
                                }
                            `}>
                                <Icon className="w-5 h-5" />
                            </div>

                            <span className={`
                                mt-1 text-[9px] font-bold tracking-tight uppercase transition-colors
                                ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-300'}
                            `}>
                                {item.name}
                            </span>

                            {/* Active indicator dot */}
                            {isActive && (
                                <div className="absolute -bottom-1 w-1 h-1 bg-purple-500 rounded-full shadow-sm shadow-purple-500/50" />
                            )}
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
