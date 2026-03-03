import type { Metadata, Viewport } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import SolanaProvider from "@/components/providers/SolanaProvider";
import Header from "@/components/layout/Header";
import MobileNav from "@/components/layout/MobileNav";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: "Ajo | Decentralized Rotating Savings & Credit",
  description: "Traditional Esusu/Ajo circles on Solana. Trustless, transparent, and rewarding community savings.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/ajo_brand_logo.png" },
      { url: "/ajo_brand_logo.png", sizes: "32x32", type: "image/png" },
    ],
    shortcut: "/ajo_brand_logo.png",
    apple: "/ajo_brand_logo.png",
    other: [
      {
        rel: "apple-touch-icon-precomposed",
        url: "/ajo_brand_logo.png",
      },
    ],
  },
  openGraph: {
    title: "Ajo | Decentralized Rotating Savings & Credit",
    description: "Traditional Esusu/Ajo circles on Solana.",
    images: [{ url: "/ajo_brand_logo.png" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ajo | Decentralized Rotating Savings & Credit",
    description: "Traditional Esusu/Ajo circles on Solana.",
    images: ["/ajo_brand_logo.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#9333ea",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${montserrat.variable} font-sans antialiased bg-black text-white`}
      >
        <SolanaProvider>
          <Header />
          <main className="pt-16 pb-24 md:pb-0 min-h-screen">
            {children}
          </main>
          <MobileNav />
          <script
            dangerouslySetInnerHTML={{
              __html: `
                if ('serviceWorker' in navigator) {
                  window.addEventListener('load', function() {
                    navigator.serviceWorker.register('/sw.js');
                  });
                }
              `,
            }}
          />
        </SolanaProvider>
      </body>
    </html>
  );
}

