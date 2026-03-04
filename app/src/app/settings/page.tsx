"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { Card, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
    Check, User, Smartphone, Bell, BellOff, Download, Loader2,
    Copy, Mail, Send, Shield, ExternalLink, Rocket, CreditCard, Info
} from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { useState, useEffect } from "react";
import Link from "next/link";
import { DashboardCharts } from "@/components/analytics/DashboardCharts";
import { useRouter } from "next/navigation";

const AVATARS = [
    "/avatar_default.png",
    "/avatar_female1.png",
    "/avatar-female2.png",
    "/avatar_male1.png",
    "/avatar_male2.png",
];

export default function SettingsPage() {
    const { publicKey, connected, disconnect } = useWallet();
    const [copied, setCopied] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [prefLoading, setPrefLoading] = useState(false);
    const [memberData, setMemberData] = useState<any>(null);
    const [email, setEmail] = useState("");
    const [telegramId, setTelegramId] = useState("");
    const [handle, setHandle] = useState("");
    const [avatarUrl, setAvatarUrl] = useState("");
    const [saveLoading, setSaveLoading] = useState(false);
    const [exportLoading, setExportLoading] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [showAllNotifications, setShowAllNotifications] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);

    useEffect(() => {
        const handler = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handler);

        // Detect device/env
        setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream);
        setIsStandalone(window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true);

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    useEffect(() => {
        if (publicKey) {
            fetchSettings();
        }
    }, [publicKey]);

    const fetchSettings = async () => {
        try {
            // Fetch notification history
            const resp = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/notifications/${publicKey?.toBase58()}`);
            const data = await resp.json();
            if (data.success) {
                setNotifications(data.notifications);
            }

            // Fetch user profile
            const userResp = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user/${publicKey?.toBase58()}`);
            const userData = await userResp.json();
            if (userData.success && userData.user) {
                setEmail(userData.user.email || "");
                setTelegramId(userData.user.telegramId || "");
                setHandle(userData.user.handle || "");
                setAvatarUrl(userData.user.avatarUrl || "");
            }
        } catch (error) {
            console.error("Settings fetch failed:", error);
        }
    };

    const handleSaveProfile = async () => {
        if (!publicKey) return;
        setSaveLoading(true);
        setSaveSuccess(false);
        setErrorMessage("");

        try {
            const resp = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user/${publicKey.toBase58()}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, telegramId, handle, avatarUrl })
            });

            const data = await resp.json();
            if (resp.ok) {
                setSaveSuccess(true);
                setTimeout(() => setSaveSuccess(false), 3000);
            } else {
                setErrorMessage(data.error || "Failed to save profile");
            }
        } catch (error) {
            console.error("Failed to save profile:", error);
            setErrorMessage("Network error, please try again.");
        } finally {
            setSaveLoading(false);
        }
    };

    const handleDownloadStatement = async () => {
        if (!publicKey) return;
        setExportLoading(true);
        try {
            window.location.href = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/reports/statement/${publicKey.toBase58()}`;
        } catch (error) {
            console.error("Failed to download statement:", error);
        } finally {
            setTimeout(() => setExportLoading(false), 2000);
        }
    };

    const handleInstall = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setDeferredPrompt(null);
        }
    };

    const copyAddress = () => {
        if (publicKey) {
            navigator.clipboard.writeText(publicKey.toString());
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (!connected) {
        return (
            <div className="container mx-auto px-4 py-20 text-center">
                <h1 className="text-2xl font-bold">Please connect your wallet</h1>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 md:py-12 max-w-4xl pb-32 md:pb-12">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2">Settings & Analytics</h1>
            <p className="text-sm md:base text-gray-400 mb-8 md:mb-12">Manage your profile and track your savings performance.</p>

            <div className="space-y-8 md:space-y-12">
                {/* Performance Metrics */}
                <section>
                    <h2 className="text-[10px] md:text-sm font-bold text-gray-500 uppercase tracking-widest mb-4 md:mb-6">Savings Performance</h2>
                    {publicKey && <DashboardCharts publicKey={publicKey.toBase58()} />}
                </section>

                {/* Profile Card */}
                <Card>
                    <div className="flex flex-col md:flex-row items-center gap-6 md:gap-6 text-center md:text-left">
                        {avatarUrl ? (
                            <img src={avatarUrl} alt="Avatar" className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover border-2 border-purple-500/50" />
                        ) : (
                            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-2xl md:text-3xl font-bold capitalize">
                                {handle ? handle.charAt(0) : publicKey?.toString().charAt(0)}
                            </div>
                        )}
                        <div className="flex-1 w-full overflow-hidden">
                            <CardTitle className="text-lg md:text-xl truncate">{handle ? `@${handle}` : "Connected Wallet"}</CardTitle>
                            <div className="flex items-center justify-center md:justify-start gap-2 mt-2">
                                <code className="bg-white/5 px-2 md:px-3 py-1 rounded text-[10px] md:text-sm text-gray-400 font-mono">
                                    {publicKey?.toString().slice(0, 6)}...{publicKey?.toString().slice(-6)}
                                </code>
                                <button onClick={copyAddress} className="p-1 text-gray-500 hover:text-white transition-colors">
                                    {copied ? <Check className="w-3 h-3 md:w-4 md:h-4 text-green-500" /> : <Copy className="w-3 h-3 md:w-4 md:h-4" />}
                                </button>
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row md:flex-row gap-3 w-full md:w-auto">
                            <Button
                                variant="outline"
                                className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10 gap-2 w-full md:w-auto text-xs md:text-sm h-10"
                                onClick={handleDownloadStatement}
                                disabled={exportLoading}
                            >
                                {exportLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Export CSV
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => disconnect()}
                                className="w-full md:w-auto text-xs md:text-sm h-10"
                            >
                                Disconnect
                            </Button>
                        </div>
                    </div>
                </Card>

                {/* Profile Details */}
                <Card>
                    <div className="flex items-center gap-3 mb-6">
                        <User className="w-5 h-5 text-purple-400" />
                        <CardTitle className="text-lg">Profile Details</CardTitle>
                    </div>
                    <CardDescription className="mb-6">Update your contact information to receive important alerts.</CardDescription>

                    <div className="grid md:grid-cols-2 gap-6 mb-6">
                        <div className="space-y-2">
                            <Label htmlFor="handle" className="text-gray-400">Handle</Label>
                            <div className="relative">
                                <Input
                                    id="handle"
                                    type="text"
                                    placeholder="crypto_king"
                                    value={handle}
                                    onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                                    className="bg-white/[0.02] border-white/10 h-12 rounded-xl focus:border-purple-500/50 transition-all pl-10"
                                />
                                <User className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                            </div>
                        </div>
                        <div className="space-y-3 col-span-2">
                            <Label className="text-gray-400">Select Avatar</Label>
                            <div className="grid grid-cols-5 md:grid-cols-5 gap-3">
                                {AVATARS.map((url: string) => (
                                    <button
                                        key={url}
                                        onClick={() => setAvatarUrl(url)}
                                        className={`relative rounded-xl overflow-hidden aspect-square border-2 transition-all hover:scale-105 ${avatarUrl === url
                                            ? "border-purple-500 ring-2 ring-purple-500/20"
                                            : "border-white/10 hover:border-white/30"
                                            }`}
                                    >
                                        <img src={url} alt="Avatar Option" className="w-full h-full object-cover" />
                                        {avatarUrl === url && (
                                            <div className="absolute inset-0 bg-purple-500/20 flex items-center justify-center">
                                                <Check className="w-5 h-5 text-white bg-purple-600 rounded-full p-0.5" />
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-gray-400">Email Address</Label>
                            <div className="relative">
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="name@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="bg-white/[0.02] border-white/10 h-12 rounded-xl focus:border-purple-500/50 transition-all pl-10"
                                />
                                <Mail className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="telegram" className="text-gray-400">Telegram Chat ID</Label>
                            <div className="relative">
                                <Input
                                    id="telegram"
                                    type="text"
                                    placeholder="Numeric ID"
                                    value={telegramId}
                                    onChange={(e) => setTelegramId(e.target.value)}
                                    className="bg-white/[0.02] border-white/10 h-12 rounded-xl focus:border-purple-500/50 transition-all pl-10"
                                />
                                <Send className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                            </div>
                            <p className="text-[10px] text-gray-500 italic">
                                Tip: Message <a href="https://t.me/Ajo_EsusuBot" target="_blank" rel="noopener noreferrer" className="text-purple-500 hover:underline">@Ajo_EsusuBot</a> to get your ID.
                            </p>
                        </div>
                    </div>

                    <div className="mt-6 flex items-center justify-end gap-4">
                        {errorMessage && (
                            <span className="text-sm text-red-500 animate-pulse">
                                {errorMessage}
                            </span>
                        )}
                        {saveSuccess && (
                            <span className="text-sm text-green-500 flex items-center gap-1 animate-in fade-in slide-in-from-right-2">
                                <Check className="w-4 h-4" /> Changes saved!
                            </span>
                        )}
                        <Button
                            onClick={handleSaveProfile}
                            disabled={saveLoading}
                            className="bg-purple-600 hover:bg-purple-700 min-w-[120px]"
                        >
                            {saveLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
                        </Button>
                    </div>
                </Card>

                <div className="grid md:grid-cols-2 gap-6">
                    {/* Notifications */}
                    <Card>
                        <div className="flex items-center gap-3 mb-4">
                            <Bell className="w-5 h-5 text-purple-400" />
                            <CardTitle className="text-lg">Notifications</CardTitle>
                        </div>
                        <CardDescription className="mb-6">Stay updated on your saving rounds.</CardDescription>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                                <span className="text-sm font-medium">Round Reminders</span>
                                <div className="w-10 h-5 bg-purple-600 rounded-full relative">
                                    <div className="absolute right-0.5 top-0.5 w-4 h-4 bg-white rounded-full"></div>
                                </div>
                            </div>
                            <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                                <span className="text-sm font-medium">Payout Alerts</span>
                                <div className="w-10 h-5 bg-purple-600 rounded-full relative">
                                    <div className="absolute right-0.5 top-0.5 w-4 h-4 bg-white rounded-full"></div>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Device / PWA */}
                    <Card>
                        <div className="flex items-center gap-3 mb-4">
                            <Smartphone className="w-5 h-5 text-indigo-400" />
                            <CardTitle className="text-lg">Desktop & Mobile</CardTitle>
                        </div>
                        <CardDescription className="mb-6">Access Ajo quickly from your home screen.</CardDescription>
                        <div className="space-y-4">
                            {isStandalone ? (
                                <div className="p-4 rounded-2xl bg-green-500/5 border border-green-500/10 flex items-center justify-center gap-2 text-green-400 text-sm font-bold">
                                    <Check className="w-4 h-4" /> APP INSTALLED
                                </div>
                            ) : deferredPrompt ? (
                                <Button
                                    variant="outline"
                                    className="w-full justify-between bg-purple-500/5 border-purple-500/20 text-purple-400 hover:bg-purple-500/10"
                                    onClick={handleInstall}
                                >
                                    Install as Web App <Smartphone className="w-4 h-4" />
                                </Button>
                            ) : isIOS ? (
                                <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10 space-y-2">
                                    <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider">How to Install on iOS:</p>
                                    <ol className="text-[10px] text-gray-400 space-y-1 list-decimal list-inside">
                                        <li>Tap the <span className="text-white">Share</span> button in Safari</li>
                                        <li>Scroll down and tap <span className="text-white">Add to Home Screen</span></li>
                                    </ol>
                                </div>
                            ) : (
                                <Button
                                    variant="outline"
                                    className="w-full justify-between opacity-50 cursor-not-allowed"
                                    disabled
                                >
                                    Install via Browser Menu <Download className="w-4 h-4" />
                                </Button>
                            )}
                            <p className="text-[10px] text-gray-500 text-center leading-relaxed">
                                PWA support allows for offline viewing and mobile-centric features.
                            </p>
                        </div>
                    </Card>
                </div>

                {/* Security / Links */}
                <Card className="bg-red-500/[0.02] border-red-500/10">
                    <div className="flex items-center gap-3 mb-4">
                        <Shield className="w-5 h-5 text-red-500" />
                        <CardTitle className="text-lg">Security & Analytics</CardTitle>
                    </div>
                    <div className="flex flex-wrap gap-4">
                        <a
                            href={`https://explorer.solana.com/address/${publicKey?.toString()}?cluster=devnet`}
                            target="_blank"
                            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-all"
                        >
                            View on Solana Explorer <ExternalLink className="w-4 h-4" />
                        </a>
                        <Link
                            href="/terms"
                            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-all"
                        >
                            Terms of Service
                        </Link>
                        <Link
                            href="/privacy"
                            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-all"
                        >
                            Privacy Policy
                        </Link>
                    </div>
                </Card>

                {/* Notification History */}
                <Card>
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <Bell className="w-5 h-5 text-purple-400" />
                            <CardTitle className="text-lg">Notification History</CardTitle>
                        </div>
                        <Button variant="ghost" size="sm" onClick={fetchSettings} className="text-xs">
                            Refresh
                        </Button>
                    </div>

                    <div className="space-y-3">
                        {notifications.length === 0 ? (
                            <div className="text-center py-12 bg-white/[0.02] rounded-3xl border border-white/5">
                                <p className="text-gray-500 text-sm italic">No history found for this wallet.</p>
                            </div>
                        ) : (
                            <>
                                <div className="space-y-3">
                                    {(showAllNotifications ? notifications : notifications.slice(0, 5)).map((n) => (
                                        <div key={n.id} className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex gap-4 animate-in fade-in slide-in-from-bottom-2">
                                            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                                                {n.type === 'PAYOUT_RECEIVED' ? <Rocket className="w-4 h-4 text-green-400" /> :
                                                    n.type === 'CONTRIBUTION_DUE_NOW' ? <CreditCard className="w-4 h-4 text-amber-400" /> :
                                                        <Info className="w-4 h-4 text-purple-400" />}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between mb-1">
                                                    <h4 className="text-sm font-bold text-white">{n.title}</h4>
                                                    <span className="text-[10px] text-gray-500">
                                                        {new Date(n.createdAt).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-400 leading-relaxed">{n.message}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {notifications.length > 5 && (
                                    <Button
                                        variant="ghost"
                                        className="w-full mt-4 text-gray-400 hover:text-white"
                                        onClick={() => setShowAllNotifications(!showAllNotifications)}
                                    >
                                        {showAllNotifications ? "Show Less" : `View All (${notifications.length})`}
                                    </Button>
                                )}
                            </>
                        )}
                    </div>

                    <div className="mt-8 p-4 rounded-2xl bg-purple-500/5 border border-purple-500/10 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                                <Send className="w-4 h-4 text-purple-400" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-white uppercase tracking-tight">Telegram Linked</p>
                                <p className="text-[10px] text-gray-400">Receive alerts on your phone</p>
                            </div>
                        </div>
                        <a
                            href="https://t.me/AjoNotifyBot"
                            target="_blank"
                            className="text-[10px] font-bold text-purple-400 hover:text-white transition-colors flex items-center gap-1"
                        >
                            BOT STATUS <ExternalLink className="w-3 h-3" />
                        </a>
                    </div>
                </Card>
            </div>
        </div>
    );
}
