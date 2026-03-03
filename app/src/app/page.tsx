"use client";

import dynamic from "next/dynamic";
import { useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Shield, Zap, Users, Check, ChevronDown, ChevronUp, HelpCircle } from "lucide-react";
import { useState } from "react";
import MouseParticles from "@/components/layout/MouseParticles";

const WalletMultiButtonDynamic = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

export default function LandingPage() {
  const { connected } = useWallet();
  const router = useRouter();

  useEffect(() => {
    if (connected) {
      router.push("/dashboard");
    }
  }, [connected, router]);

  return (
    <div className="flex flex-col items-center">
      <MouseParticles />
      {/* Hero Section */}
      <section className="relative w-full py-12 md:py-20 px-4 flex flex-col items-center justify-center overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob"></div>
        <div className="absolute top-0 -right-4 w-72 h-72 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-4000"></div>

        <div className="relative text-center max-w-4xl mx-auto z-10">
          <h1 className="text-3xl sm:text-5xl md:text-7xl font-extrabold tracking-tight mb-6 flex flex-col items-center">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 leading-tight pb-1">
              Community Savings
            </span>
            <span className="text-[#9945FF] leading-tight mt-1 tracking-tighter">
              Decentralized on Solana
            </span>
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-gray-400 mb-8 md:mb-10 max-w-2xl mx-auto leading-relaxed">
            The traditional Esusu/Ajo rotating credit system, now trustless and transparent.
            Save together, grow together, powered by the speed of Solana.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <WalletMultiButtonDynamic className="!bg-purple-600 hover:!bg-purple-700 !rounded-full !h-12 md:!h-14 !px-6 md:!px-8 !text-base md:!text-lg !font-bold !transition-all shadow-xl shadow-purple-500/20" />
            <button
              onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
              className="h-12 md:h-14 px-6 md:px-8 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-base md:text-lg font-semibold flex items-center gap-2"
            >
              Learn How it Works <ArrowRight className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>
      </section>

      {/* Stats/Proof Section */}
      <section className="w-full py-12 px-4 border-y border-white/5 bg-white/[0.01]">
        <div className="container mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="flex flex-col items-center text-center">
            <span className="text-3xl font-bold text-white mb-1">0.5%</span>
            <span className="text-sm text-gray-500 uppercase tracking-widest font-medium">Low Fees</span>
          </div>
          <div className="flex flex-col items-center text-center">
            <span className="text-3xl font-bold text-white mb-1">Instant</span>
            <span className="text-sm text-gray-500 uppercase tracking-widest font-medium">Payouts</span>
          </div>
          <div className="flex flex-col items-center text-center">
            <span className="text-3xl font-bold text-white mb-1">100%</span>
            <span className="text-sm text-gray-500 uppercase tracking-widest font-medium">On-Chain</span>
          </div>
          <div className="flex flex-col items-center text-center">
            <span className="text-3xl font-bold text-white mb-1">Safe</span>
            <span className="text-sm text-gray-500 uppercase tracking-widest font-medium">Collateralized</span>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="w-full py-24 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Why use Ajo?</h2>
            <p className="text-gray-400 max-w-xl mx-auto text-lg">
              We've modernized traditional community banking with cutting-edge blockchain technology.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 rounded-3xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Shield className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">Trustless & Secure</h3>
              <p className="text-gray-400 leading-relaxed">
                Smart contracts handle all distributions. No more worrying about a "treasurer" running off with funds.
                Collateral ensures everyone stays committed.
              </p>
            </div>

            <div className="p-8 rounded-3xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Zap className="w-6 h-6 text-indigo-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">Solana Speed</h3>
              <p className="text-gray-400 leading-relaxed">
                Experience lightning-fast transactions and near-zero gas fees.
                Contributions and payouts happen in seconds, not days.
              </p>
            </div>

            <div className="p-8 rounded-3xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-pink-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6 text-pink-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">Community Driven</h3>
              <p className="text-gray-400 leading-relaxed">
                Create private groups with friends or join public ones.
                Choose your savings interval and payout rotation with ease.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works & FAQ Section */}
      <section id="how-it-works" className="w-full py-24 px-4 bg-gradient-to-b from-transparent to-white/[0.02]">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-bold mb-4">How it Works</h2>
            <p className="text-gray-400 text-lg">Four simple steps to decentralized community savings.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-24 relative">
            {/* Connection Line (Desktop) */}
            <div className="hidden lg:block absolute top-[2.1rem] left-[12%] right-[12%] h-[2px] bg-white/5 -z-10 overflow-hidden">
              <div
                className="absolute inset-0 w-full h-full"
                style={{
                  background: 'linear-gradient(to right, transparent, #f97316, #ec4899, #8b5cf6, transparent)',
                  backgroundSize: '200% 100%',
                  animation: 'moving-sunset 4s linear infinite'
                }}
              />
              <style jsx>{`
                @keyframes moving-sunset {
                  0% { transform: translateX(-100%); }
                  100% { transform: translateX(100%); }
                }
              `}</style>
            </div>

            {[
              { step: "01", title: "Create or Join", desc: "Start your own circle with custom rules or join a public group." },
              { step: "02", title: "Commit Funds", desc: "Each member contributes a fixed amount of SOL at set intervals." },
              { step: "03", title: "The Rotation", desc: "Every cycle, a different member receives the total pool payout." },
              { step: "04", title: "Cycle Completes", desc: "Once everyone has received a payout, the circle closes safely." }
            ].map((item, idx) => (
              <div key={idx} className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center mb-6 text-purple-400 font-bold text-xl">
                  {item.step}
                </div>
                <h3 className="text-lg font-bold mb-2 text-white">{item.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* FAQ Section */}
          <div className="max-w-3xl mx-auto">
            <h3 className="text-2xl font-bold mb-10 flex items-center gap-3 justify-center">
              <HelpCircle className="w-6 h-6 text-purple-500" /> Frequently Asked Questions
            </h3>

            <div className="space-y-4">
              <FAQItem
                question="Is Ajo trustless?"
                answer="Yes. Ajo uses smart contracts on the Solana blockchain to manage all funds. No central authority or person has access to your capital; it is distributed automatically by the code once payouts are triggered."
                defaultOpen={true}
              />
              <FAQItem
                question="What happens if a member stops contributing?"
                answer="Ajo requires collateral from the admin and contributions are enforced. If a group cannot proceed, contributors can trigger an emergency refund through the smart contract to reclaim their locked funds."
              />
              <FAQItem
                question="Are there any fees?"
                answer="Ajo charges a tiny 0.01 SOL flat entry fee to cover blockchain maintenance and gas reserves. Unlike traditional banks, we take 0% of your actual savings pool."
              />
              <FAQItem
                question="Do I need a Solana wallet?"
                answer="Yes, you need a Solana-compatible wallet (like Phantom or Solflare) to interact with the Ajo platform and secure your transactions on-chain."
              />
              <FAQItem
                question="What are the Terms of Service?"
                answer={
                  <div className="space-y-4 text-left">
                    <p>Ajo is a decentralized, non-custodial platform. By using it, you agree that you are responsible for your own funds, wallet security, and the inherent risks of blockchain interactions. We do not have control over user capital.</p>
                    <Link href="/terms" className="inline-flex items-center gap-1 text-purple-400 hover:text-purple-300 font-medium">
                      Read full Terms of Service <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                }
              />
              <FAQItem
                question="How do we handle privacy?"
                answer={
                  <div className="space-y-4 text-left">
                    <p>We respect your privacy. Ajo does not collect any personal identification like emails or names. Only your public wallet address is used to interact with the blockchain, and all transaction data is public on the Solana ledger.</p>
                    <Link href="/privacy" className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-medium">
                      Read full Privacy Policy <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                }
              />
            </div>
          </div>
        </div>
      </section>

      {/* Footer Decoration */}
      <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
    </div>
  );
}

function FAQItem({ question, answer, defaultOpen = false }: { question: string, answer: React.ReactNode, defaultOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`rounded-2xl border transition-all duration-300 ${isOpen ? 'bg-white/[0.04] border-purple-500/30' : 'bg-white/[0.02] border-white/5 hover:border-white/10'}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-5 flex items-center justify-between text-left"
      >
        <span className="font-semibold text-white">{question}</span>
        {isOpen ? <ChevronUp className="w-5 h-5 text-purple-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
      </button>
      {isOpen && (
        <div className="px-6 pb-5 text-gray-400 text-sm leading-relaxed animate-in fade-in slide-in-from-top-1 duration-200">
          {answer}
        </div>
      )}
    </div>
  );
}
