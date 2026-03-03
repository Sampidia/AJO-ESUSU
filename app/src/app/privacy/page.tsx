"use client";

import { Card, CardContent } from "@/components/ui/Card";
import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";

export default function PrivacyPolicy() {
    return (
        <div className="container mx-auto px-4 py-20 max-w-4xl">
            <Link href="/settings" className="inline-flex items-center gap-2 text-gray-500 hover:text-white mb-8 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back to Settings
            </Link>

            <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
                    <Lock className="w-6 h-6 text-indigo-400" />
                </div>
                <h1 className="text-4xl font-bold">Privacy Policy</h1>
            </div>

            <Card className="bg-white/[0.02] border-white/5">
                <CardContent className="prose prose-invert max-w-none pt-6 space-y-8 text-gray-300">
                    <p>
                        At Ajo, we prioritize your privacy while operating in a transparent blockchain environment.
                        This policy explains how information is handled when you use our decentralized application.
                    </p>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-4">1. Data Collection</h2>
                        <p>
                            Ajo does not collect personal identification information such as names, email addresses, or phone numbers.
                            The only information we access is your public wallet address when you connect your wallet to the Platform.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-4">2. Blockchain Transparency</h2>
                        <p>
                            All transactions performed on Ajo are recorded on the Solana blockchain.
                            Blockchain records are public by nature and permanent. Your wallet address and transaction history
                            related to Ajo circles are visible to anyone using a blockchain explorer.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-4">3. Cookies & Analytics</h2>
                        <p>
                            We may use local storage and basic cookies to remember your application state and preferences.
                            These are stored locally on your device and are not used for user tracking or profiling.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-4">4. Third Parties</h2>
                        <p>
                            Ajo does not sell or share user data with third parties.
                            However, the Platform interacts with your wallet provider and the Solana RPC network,
                            which have their own privacy policies.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-4">5. Your Rights</h2>
                        <p>
                            As a decentralized platform, we do not have the ability to delete or modify data once it
                            it is committed to the blockchain. You have full control over your wallet and can
                            disconnect from the Platform at any time.
                        </p>
                    </section>
                </CardContent>
            </Card>
        </div>
    );
}
