"use client";

import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useState, useMemo, useEffect } from "react";
import { getProgram, getGroupAddress, getMemberAddress, getVaultAddress } from "../../lib/anchor";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { Button } from "../../components/ui/Button";
import { Card, CardTitle, CardDescription, CardContent } from "../../components/ui/Card";
import Link from "next/link";
import { Input } from "../../components/ui/Input";
import { Label } from "../../components/ui/Label";
import { Info, HelpCircle, Loader2, CheckCircle2, AlertCircle, Users, Wallet, Mail, Send, Bell } from "lucide-react";
import { NumberInput } from "../../components/ui/NumberInput";
import { BN } from "@coral-xyz/anchor";
import { SystemProgram, PublicKey } from "@solana/web3.js";
import { useRouter } from "next/navigation";
import { parseError } from "../../lib/errors";

export default function CreateGroup() {
    const { connected, publicKey, wallet } = useWallet();
    const { connection } = useConnection();
    const router = useRouter();

    const [name, setName] = useState("");
    const [memberCount, setMemberCount] = useState(2);
    const [payoutAmount, setPayoutAmount] = useState(1); // Default to 1 (SOL or USDC)
    const [interval, setInterval] = useState(1); // 0: Daily, 1: Weekly, 2: Monthly, 3: Yearly
    const [email, setEmail] = useState("");
    const [telegramId, setTelegramId] = useState("");
    const [hasProfile, setHasProfile] = useState(false);
    const [currency, setCurrency] = useState<"SOL" | "USDC">("SOL");

    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Redirect to home if wallet disconnects
    useEffect(() => {
        if (!connected) {
            router.push("/");
        } else if (publicKey) {
            fetchUserProfile();
        }
    }, [connected, router, publicKey]);

    const fetchUserProfile = async () => {
        if (!publicKey) return;
        try {
            const resp = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user/${publicKey.toBase58()}`);
            const data = await resp.json();
            if (data.success && data.user) {
                setEmail(data.user.email || "");
                setTelegramId(data.user.telegramId || "");
                if (data.user.email && data.user.telegramId) {
                    setHasProfile(true);
                }
            }
        } catch (err) {
            console.error("Failed to fetch user profile:", err);
        }
    };

    // Constants
    const PLATFORM_FEE = 0.01; // SOL
    const GAS_RESERVE = 0.005; // SOL (Fixed reserve for rent + gas)
    const PLATFORM_WALLET = new PublicKey(process.env.NEXT_PUBLIC_PLATFORM_WALLET || "4qDEXD8BvsvUHikub5JDUR9ZCD27Dwc4s7Za87PBRDMk");
    const PLATFORM_FEE_SOL = 0.01;
    const PLATFORM_FEE_USDC = 0.5;
    const USDC_MINT = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");

    // Calculations
    const contributionPerRound = useMemo(() => (payoutAmount / memberCount), [payoutAmount, memberCount]);
    const collateralRequired = useMemo(() => payoutAmount, [payoutAmount]);
    const platformFee = currency === "SOL" ? PLATFORM_FEE_SOL : PLATFORM_FEE_USDC;

    const totalDueAtInit = useMemo(() =>
        (currency === "SOL" ? (collateralRequired + contributionPerRound + PLATFORM_FEE_SOL + GAS_RESERVE) : 0),
        [collateralRequired, contributionPerRound, currency, GAS_RESERVE]
    );
    const tokenDueAtInit = useMemo(() =>
        currency === "USDC" ? (collateralRequired + contributionPerRound + PLATFORM_FEE_USDC) : 0,
        [collateralRequired, contributionPerRound, currency]
    );

    const { suggestedAmount, needsAdjustment } = useMemo(() => {
        const factor = Math.pow(10, currency === "USDC" ? 6 : 9);
        const isDivisible = (Math.round(payoutAmount * factor) % memberCount === 0);

        if (isDivisible) {
            return { suggestedAmount: payoutAmount, needsAdjustment: false };
        }

        const shareStep = currency === "USDC" ? 1.0 : 0.1;
        const minShare = currency === "USDC" ? 1.0 : 0.02;
        const totalStep = shareStep * memberCount;
        const minTotal = minShare * memberCount;

        let suggested = Math.floor(payoutAmount / totalStep) * totalStep;
        if (suggested < minTotal) suggested = minTotal;

        // Round to 2 decimals for precision issues
        suggested = Math.round(suggested * 100) / 100;

        return { suggestedAmount: suggested, needsAdjustment: true };
    }, [payoutAmount, memberCount, currency]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!publicKey || !wallet?.adapter) return;

        setLoading(true);
        setError(null);

        try {
            const program = getProgram(connection, wallet.adapter);
            const groupPda = getGroupAddress(publicKey, name);
            const PLATFORM_WALLET = new PublicKey(process.env.NEXT_PUBLIC_PLATFORM_WALLET || "4qDEXD8BvsvUHikub5JDUR9ZCD27Dwc4s7Za87PBRDMk");
            const USDC_MINT = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");

            let accounts: any = {
                admin: publicKey,
                groupState: groupPda,
                vault: getVaultAddress(groupPda),
                platformWallet: PLATFORM_WALLET,
                memberState: getMemberAddress(groupPda, publicKey),
                mint: SystemProgram.programId, // Placeholder
                vaultTokenAccount: groupPda,     // Placeholder
                adminTokenAccount: publicKey,    // Placeholder
                platformTokenAccount: PLATFORM_WALLET, // Placeholder
                systemProgram: SystemProgram.programId,
                tokenProgram: TOKEN_PROGRAM_ID,
                associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            };

            if (currency === "USDC") {
                const vaultPda = getVaultAddress(groupPda);
                const adminAta = getAssociatedTokenAddressSync(USDC_MINT, publicKey);
                const vaultAta = getAssociatedTokenAddressSync(USDC_MINT, vaultPda, true);
                const platformAta = getAssociatedTokenAddressSync(USDC_MINT, PLATFORM_WALLET);

                accounts = {
                    ...accounts,
                    mint: USDC_MINT,
                    adminTokenAccount: adminAta,
                    vaultTokenAccount: vaultAta,
                    platformTokenAccount: platformAta,
                };
            }
            const decimals = currency === "USDC" ? 6 : 9;
            const amountBN = new BN(Math.round(payoutAmount * Math.pow(10, decimals)));

            await program.methods
                .initializeGroup(
                    name,
                    memberCount,
                    amountBN,
                    interval,
                    currency === "USDC" ? USDC_MINT : null
                )
                .accounts(accounts)
                .rpc();

            // Register with backend for notifications (Admin is the first member)
            try {
                await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/register`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        publicKey: publicKey.toBase58(),
                        groupId: groupPda.toBase58(),
                        email: email || undefined,
                        telegramId: telegramId || undefined,
                        rotationPosition: 0 // Admin is always the first member
                    })
                });
            } catch (backendErr) {
                console.error("Backend registration failed:", backendErr);
            }

            setSuccess(true);
            setTimeout(() => router.push(`/group/${groupPda.toBase58()}`), 2000);
        } catch (err: any) {
            console.error("Create group error:", err);
            setError(parseError(err));
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle2 className="w-10 h-10 text-green-500" />
                </div>
                <h1 className="text-3xl font-bold mb-2">Circle Created!</h1>
                <p className="text-gray-400">Redirecting to your new group dashboard...</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-12 max-w-5xl">
            <div className="mb-12">
                <h1 className="text-3xl font-bold mb-2">Create a New Circle</h1>
                <p className="text-gray-400">Set up your community savings group on the blockchain.</p>
            </div>

            <div className="grid lg:grid-cols-2 gap-12">
                <form onSubmit={handleSubmit} className="space-y-8">
                    <Card>
                        <CardContent className="space-y-6 pt-6">
                            <div className="space-y-2">
                                <Label htmlFor="name">Group Name</Label>
                                <Input
                                    id="name"
                                    placeholder="e.g. Family Savings"
                                    value={name}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="grid md:grid-cols-2 gap-8">
                                <NumberInput
                                    label="Member Count"
                                    unit="Participants"
                                    value={memberCount}
                                    onChange={setMemberCount}
                                    min={2}
                                    max={20}
                                    step={1}
                                    icon={<Users className="w-6 h-6" />}
                                />

                                <NumberInput
                                    label="Total Payout"
                                    unit={currency}
                                    value={payoutAmount}
                                    onChange={setPayoutAmount}
                                    min={currency === "SOL" ? 0.01 : 1}
                                    max={currency === "SOL" ? 100 : 10000}
                                    step={currency === "SOL" ? 0.05 : 1}
                                    icon={<Wallet className="w-6 h-6" />}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Currency</Label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => { setCurrency("SOL"); setPayoutAmount(0.4); }}
                                        className={`h-12 rounded-xl border text-sm font-bold flex items-center justify-center gap-2 transition-all ${currency === "SOL" ? 'bg-purple-600 border-purple-500 text-white' : 'bg-white/5 border-white/5 text-gray-400'}`}
                                    >
                                        SOL
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setCurrency("USDC"); setPayoutAmount(1); }}
                                        className={`h-12 rounded-xl border text-sm font-bold flex items-center justify-center gap-2 transition-all ${currency === "USDC" ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white/5 border-white/5 text-gray-400'}`}
                                    >
                                        USDC
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Savings Interval</Label>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {[
                                        { label: "Daily", value: 0 },
                                        { label: "Weekly", value: 1 },
                                        { label: "Monthly", value: 2 },
                                        { label: "Yearly", value: 3 }
                                    ].map((opt) => (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => setInterval(opt.value)}
                                            className={`h-11 rounded-xl border text-xs font-semibold transition-all ${interval === opt.value ? 'bg-purple-600 border-purple-500 text-white' : 'bg-white/5 border-white/5 text-gray-400'}`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {!hasProfile && (
                                <>
                                    <div className="w-full h-px bg-white/5 my-6"></div>

                                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                        <Mail className="w-5 h-5 text-purple-400" />
                                        Setup Notification
                                    </h3>

                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="email" className="text-gray-400">Email Address (Optional)</Label>
                                            <Input
                                                id="email"
                                                type="email"
                                                placeholder="name@example.com"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className="bg-white/[0.02] border-white/10 h-12 rounded-xl focus:border-purple-500/50 transition-all"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="telegram" className="text-gray-400">Telegram Chat ID (Optional)</Label>
                                            <div className="relative">
                                                <Input
                                                    id="telegram"
                                                    type="text"
                                                    placeholder="Click the link below to get your ID"
                                                    value={telegramId}
                                                    onChange={(e) => setTelegramId(e.target.value)}
                                                    className="bg-white/[0.02] border-white/10 h-12 rounded-xl focus:border-purple-500/50 transition-all"
                                                />
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                    <Send className="w-4 h-4 text-gray-600" />
                                                </div>
                                            </div>
                                            <p className="text-[10px] text-gray-500 italic">
                                                Tip: Message <a href="https://t.me/Ajo_EsusuBot" target="_blank" rel="noopener noreferrer" className="text-purple-500 hover:underline">@Ajo_EsusuBot</a> to <strong>Get your TelegramID here</strong>.
                                            </p>
                                        </div>
                                    </div>
                                </>
                            )}

                            {hasProfile && (
                                <div className="mt-6 p-4 rounded-xl bg-purple-500/5 border border-purple-500/10 flex items-center gap-3">
                                    <Bell className="w-5 h-5 text-purple-400" />
                                    <div className="text-xs text-gray-400">
                                        Notifications will be sent to your saved <span className="text-white font-medium">Email</span> and <span className="text-white font-medium">Telegram</span>.
                                        <Link href="/settings" className="text-purple-400 hover:underline ml-1">Update in Settings</Link>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {error && (
                        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm flex items-center gap-3 animate-in fade-in slide-in-from-top-1">
                            <AlertCircle className="w-5 h-5" />
                            <span>{error}</span>
                        </div>
                    )}

                    <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        className="w-full h-16"
                        isLoading={loading}
                        disabled={!connected || !name || (Math.round(payoutAmount * 1e9) % memberCount !== 0)}
                    >
                        {connected ? "Initialize On-Chain" : "Connect Wallet First"}
                    </Button>

                    {needsAdjustment && (
                        <div className="p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/10 flex flex-col gap-3">
                            <p className="text-[10px] text-yellow-500 leading-relaxed text-center">
                                Notice: {payoutAmount} {currency} doesn't split perfectly among {memberCount} members in base units.
                            </p>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 text-[10px] border-yellow-500/20 text-yellow-500 hover:bg-yellow-500/10"
                                onClick={() => setPayoutAmount(suggestedAmount)}
                            >
                                Use {suggestedAmount} {currency} instead
                            </Button>
                        </div>
                    )}
                </form>

                <div className="space-y-8">
                    <Card className="bg-purple-600/5 border-purple-500/20">
                        <CardTitle className="text-lg">Circle Economics</CardTitle>
                        <CardContent className="space-y-4 pt-4">
                            <div className="flex justify-between items-center py-3 border-b border-white/5 text-sm">
                                <span className="text-gray-400">Individual Contribution</span>
                                <span className="font-bold">{(payoutAmount / memberCount).toFixed(currency === "USDC" ? 2 : 4)} {currency}</span>
                            </div>
                            <div className="flex justify-between items-center py-3 border-b border-white/5 text-sm">
                                <span className="text-gray-400">Locked Collateral (per member)</span>
                                <span className="font-bold">{payoutAmount.toFixed(2)} {currency}</span>
                            </div>
                            <div className="pt-6">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-purple-400 font-semibold text-sm">Total Due Now</span>
                                    <div className="text-right">
                                        {currency === "SOL" && <div className="font-bold text-white tracking-tight">{totalDueAtInit.toFixed(4)} SOL</div>}
                                        {tokenDueAtInit > 0 && <div className="font-bold text-blue-400 tracking-tight">{tokenDueAtInit.toFixed(2)} USDC</div>}
                                    </div>
                                </div>
                                <p className="text-[10px] text-gray-500 leading-relaxed">
                                    Includes {platformFee} {currency} platform fee + your first round contribution (+ ~0.015 SOL for Solana Network Rent).
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div >
    );
}
