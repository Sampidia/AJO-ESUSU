"use client";

import { Card, CardContent } from "@/components/ui/Card";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export default function TermsOfService() {
    return (
        <div className="container mx-auto px-4 py-20 max-w-4xl">
            <Link href="/settings" className="inline-flex items-center gap-2 text-gray-500 hover:text-white mb-8 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back to Settings
            </Link>

            <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center">
                    <ShieldCheck className="w-6 h-6 text-purple-400" />
                </div>
                <h1 className="text-4xl font-bold">Terms of Service</h1>
            </div>

            <Card className="bg-white/[0.02] border-white/5">
                <CardContent className="prose prose-invert max-w-none pt-6 space-y-8 text-gray-300">
                    <section>
                        <h2 className="text-xl font-bold text-white mb-4">1. Acceptance of Terms</h2>
                        <p>
                            By accessing or using the Ajo platform ("the Platform"), you agree to be bound by these Terms of Service.
                            Ajo is a decentralized application operating on the Solana blockchain.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-4">2. The Service</h2>
                        <p>
                            Ajo provides a smart-contract based rotating savings platform.
                            All transactions are executed directly on the Solana blockchain through user-initiated wallet interactions.
                            Ajo does not have custody of user funds at any time.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-4">3. User Responsibility</h2>
                        <p>
                            Users are responsible for maintaining the security of their own private keys and wallets.
                            Ajo cannot recover lost funds, revert transactions, or access user accounts.
                            You agree that you are using the Platform at your own risk.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-4">4. Smart Contract Risks</h2>
                        <p>
                            While our smart contracts are designed with security in mind, decentralized finance (DeFi) involves inherent risks,
                            including potential vulnerabilities in code. By using Ajo, you acknowledge and accept these risks.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-4">5. Modifications</h2>
                        <p>
                            Ajo reserves the right to modify or discontinue the Platform interface at any time.
                            The underlying smart contracts on the blockchain are immutable.
                        </p>
                    </section>
                </CardContent>
            </Card>
        </div>
    );
}
