"use client";

import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { getProgram, getMemberAddress, getVaultAddress } from "../../../lib/anchor";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { parseError } from "../../../lib/errors";
import { Card, CardTitle, CardDescription, CardContent } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import {
    ShieldCheck,
    ArrowRight,
    Info,
    Lock,
    Loader2,
    AlertCircle,
    Mail,
    Send,
    Bell
} from "lucide-react";
import Link from "next/link";
import { Input } from "../../../components/ui/Input";
import { Label } from "../../../components/ui/Label";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";

export default function JoinGroup() {
    const { groupId } = useParams();
    const { connected, publicKey, wallet } = useWallet();
    const { connection } = useConnection();
    const router = useRouter();

    const [group, setGroup] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [email, setEmail] = useState("");
    const [telegramId, setTelegramId] = useState("");
    const [hasProfile, setHasProfile] = useState(false);

    const groupPubKey = useMemo(() => new PublicKey(groupId as string), [groupId]);

    useEffect(() => {
        async function fetchGroup() {
            try {
                const program = getProgram(connection, wallet?.adapter);
                try {
                    const data = await program.account.groupState.fetch(groupPubKey);
                    setGroup(data);
                } catch (e) {
                    console.error("Error decoding group state:", e);
                    setError("This group is from an older version of the program and is no longer compatible.");
                }
            } catch (err) {
                console.error("Error fetching group:", err);
            } finally {
                setLoading(false);
            }
        }
        fetchGroup();

        if (publicKey) {
            fetchUserProfile();
        }
    }, [groupPubKey, connection, wallet, publicKey]);

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

    const handleJoin = async () => {
        if (!publicKey || !wallet?.adapter) return;

        setActionLoading(true);
        setError(null);

        try {
            console.log("DIAG: Group State (join):", {
                mint: group.mint?.toString(),
                collateral: group.collateralAmount.toString(),
                contribution: group.contributionAmount.toString(),
                membersLen: group.members.length
            });

            const isUSDC = group.mint && group.mint.toString() !== SystemProgram.programId.toString();
            console.log("DIAG: isUSDC:", isUSDC);

            const program = getProgram(connection, wallet.adapter);
            const vaultPda = getVaultAddress(groupPubKey);
            const memberStatePda = getMemberAddress(groupPubKey, publicKey);
            const PLATFORM_WALLET = new PublicKey(process.env.NEXT_PUBLIC_PLATFORM_WALLET || "4qDEXD8BvsvUHikub5JDUR9ZCD27Dwc4s7Za87PBRDMk");

            let accounts: any = {
                member: publicKey,
                groupState: groupPubKey,
                memberState: memberStatePda,
                vault: vaultPda,
                platformWallet: PLATFORM_WALLET,
            };

            if (isUSDC) {
                console.log("DIAG: Entering USDC Flow");
                const memberAta = getAssociatedTokenAddressSync(group.mint, publicKey);
                const vaultAta = getAssociatedTokenAddressSync(group.mint, vaultPda, true);
                const platformAta = getAssociatedTokenAddressSync(group.mint, PLATFORM_WALLET);

                accounts = {
                    ...accounts,
                    mint: group.mint,
                    vaultTokenAccount: vaultAta,
                    memberTokenAccount: memberAta,
                    platformTokenAccount: platformAta,
                    systemProgram: SystemProgram.programId,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                };
            } else {
                console.log("DIAG: Entering SOL Flow");
                // SOL Group - Use dummy unique accounts for unused mut fields to avoid duplication revert.
                const dummy1 = Keypair.generate().publicKey;
                const dummy2 = Keypair.generate().publicKey;
                const dummy3 = Keypair.generate().publicKey;

                accounts = {
                    ...accounts,
                    mint: SystemProgram.programId,
                    vaultTokenAccount: dummy1,
                    memberTokenAccount: dummy2,
                    platformTokenAccount: dummy3,
                    systemProgram: SystemProgram.programId,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                };
            }

            console.log("DIAG: Accounts for joinGroup:", accounts);

            await program.methods
                .joinGroup()
                .accounts(accounts)
                .rpc();

            // Register with backend for notifications
            try {
                await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/register`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        publicKey: publicKey.toBase58(),
                        groupId: groupId,
                        email: email || undefined,
                        telegramId: telegramId || undefined,
                        rotationPosition: group.members.length
                    })
                });
            } catch (backendErr) {
                console.error("Backend registration failed:", backendErr);
                // Don't block navigation, this is non-critical for the tx
            }

            router.push(`/group/${groupId}`);
        } catch (err: any) {
            console.error("Join error:", err);
            setError(parseError(err));
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
            </div>
        );
    }

    if (!group) return null;

    const isUSDC = !!group.mint;
    const decimals = isUSDC ? 6 : 9;
    const factor = Math.pow(10, decimals);
    const symbol = isUSDC ? "USDC" : "SOL";

    const collateral = group.collateralAmount.toNumber() / factor;
    const contribution = group.contributionAmount.toNumber() / factor;
    const platformFee = isUSDC ? 1.21 : 0.01;
    const totalDeposit = collateral + contribution + platformFee;

    return (
        <div className="container mx-auto px-4 py-20 max-w-2xl">
            <div className="text-center mb-12">
                <h1 className="text-4xl font-extrabold mb-4 tracking-tight">Join Ajo Circle</h1>
                <p className="text-gray-400">You are joining <span className="text-white font-bold">{group.name}</span></p>
            </div>

            <Card className="border-purple-500/20 bg-gradient-to-br from-purple-500/[0.02] to-transparent mb-8 p-10">
                <div className="flex flex-col items-center text-center space-y-6">
                    <div className="w-20 h-20 rounded-3xl bg-purple-600/10 flex items-center justify-center mb-2">
                        <Lock className="w-10 h-10 text-purple-500" />
                    </div>

                    <div>
                        <h2 className="text-2xl font-bold mb-2">Initial Deposit Required</h2>
                        <p className="text-gray-400 text-sm leading-relaxed">
                            To join, you must pay your collateral and first round contribution up front.
                            Total: <span className="text-white font-bold ml-1">{totalDeposit.toFixed(isUSDC ? 2 : 4)} {symbol}</span>
                        </p>
                    </div>

                    <div className="w-full h-px bg-white/5"></div>

                    <div className="grid grid-cols-2 w-full gap-4">
                        <div className="bg-white/5 p-4 rounded-2xl text-left border border-white/5">
                            <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Circle Payout</p>
                            <p className="text-xl font-bold">{(group.payoutAmount.toNumber() / factor).toFixed(isUSDC ? 2 : 4)} {symbol}</p>
                        </div>
                        <div className="bg-white/5 p-4 rounded-2xl text-left border border-white/5">
                            <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Rotation Spot</p>
                            <p className="text-xl font-bold">#{group.members.length + 1} / {group.memberCount}</p>
                        </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-indigo-500/5 text-indigo-400 text-[11px] flex gap-3 text-left leading-relaxed">
                        <ShieldCheck className="w-6 h-6 shrink-0" />
                        <div className="space-y-1">
                            <p>Collateral: {collateral.toFixed(isUSDC ? 2 : 4)} {symbol} (Refundable)</p>
                            <p>First Round: {contribution.toFixed(isUSDC ? 2 : 4)} {symbol} (Pre-paid)</p>
                            <p>Platform Fee: {platformFee.toFixed(isUSDC ? 2 : 4)} {symbol} (Entry fix)</p>
                            <p className="opacity-70 text-[9px] mt-2 italic">Your collateral is returned after the cycle ends.</p>
                        </div>
                    </div>
                </div>

                {!hasProfile && (
                    <div className="mt-8 space-y-6">
                        <div className="w-full h-px bg-white/5"></div>

                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <Mail className="w-5 h-5 text-purple-400" />
                            Notification Preferences
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
                    </div>
                )}

                {hasProfile && (
                    <div className="mt-8 p-4 rounded-xl bg-purple-500/5 border border-purple-500/10 flex items-center gap-3">
                        <Bell className="w-5 h-5 text-purple-400" />
                        <div className="text-xs text-gray-400">
                            Notifications will be sent to your saved <span className="text-white font-medium">Email</span> and <span className="text-white font-medium">Telegram</span>.
                            <Link href="/settings" className="text-purple-400 hover:underline ml-1">Update in Settings</Link>
                        </div>
                    </div>
                )}

                {
                    error && (
                        <div className="mt-8 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm flex gap-3">
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )
                }

                <div className="mt-10 flex flex-col gap-4">
                    <Button
                        variant="primary"
                        size="lg"
                        className="w-full h-16 text-xl gap-2"
                        onClick={handleJoin}
                        isLoading={actionLoading}
                        disabled={!connected || group.members.length >= group.memberCount}
                    >
                        {!connected ? "Connect Wallet First" :
                            group.members.length >= group.memberCount ? "Group is Full" :
                                `Deposit ${totalDeposit.toFixed(isUSDC ? 2 : 4)} ${symbol} & Join`}
                        {!actionLoading && group.members.length < group.memberCount && <ArrowRight className="w-5 h-5" />}
                    </Button>

                    <Button variant="ghost" onClick={() => router.back()}>
                        Cancel
                    </Button>
                </div>
            </Card >

            <div className="flex items-center justify-center gap-2 text-gray-500 text-xs">
                <Info className="w-3 h-3" />
                <span>Transactions are irreversible. Please ensure you trust the group admin.</span>
            </div>
        </div >
    );
}
