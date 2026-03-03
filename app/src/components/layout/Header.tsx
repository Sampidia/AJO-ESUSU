"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";

const WalletMultiButtonDynamic = dynamic(
    async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
    { ssr: false }
);

import NotificationBell from "./NotificationBell";
import NetworkSelector from "./NetworkSelector";

export default function Header() {
    return (
        <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-black/50 backdrop-blur-md">
            <div className="container mx-auto px-2 md:px-4 h-16 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2 md:gap-3">
                    <Image
                        src="/ajo_brand_logo.png"
                        alt="Ajo Logo"
                        width={32}
                        height={32}
                        className="rounded-lg object-contain md:w-10 md:h-10"
                        priority
                    />
                    <span className="hidden sm:inline text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                        Ajo
                    </span>
                </Link>

                <nav className="hidden lg:flex items-center gap-8 text-sm font-medium">
                    <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors">Dashboard</Link>
                    <Link href="/explore" className="text-gray-400 hover:text-white transition-colors">Explore</Link>
                    <Link href="/create" className="text-gray-400 hover:text-white transition-colors">Create</Link>
                    <Link href="/settings" className="text-gray-400 hover:text-white transition-colors">Settings</Link>
                </nav>

                <div className="flex items-center gap-1.5 md:gap-4">
                    <NetworkSelector />
                    <NotificationBell />
                    <WalletMultiButtonDynamic className="!bg-purple-600 hover:!bg-purple-700 !rounded-full !h-9 md:!h-10 !px-4 md:!px-6 !text-[10px] md:!text-sm !font-semibold !transition-all shadow-lg shadow-purple-500/20" />
                </div>
            </div>
        </header>
    );
}
