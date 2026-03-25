import "@rainbow-me/rainbowkit/styles.css";
import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Providers } from "@/app/providers";
import { BrandLink } from "@/components/layout/brand-link";
import { ConnectWallet } from "@/components/layout/connect-wallet";
import { NetworkSwitcher } from "@/components/layout/network-switcher";

export const metadata: Metadata = {
  title: "HeartbeatRing",
  description: "On-chain coordination rings on Rootstock mainnet and testnet.",
};

function BrandLinkFallback() {
  return (
    <Link href="/" className="text-lg font-semibold tracking-tight text-gray-50">
      HeartbeatRing
    </Link>
  );
}

function NetworkSwitcherFallback() {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-xs uppercase tracking-[0.22em] text-gray-500">
      Network
    </div>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-gray-950 text-gray-100 antialiased">
        <Providers>
          <div className="min-h-screen bg-gray-950 text-gray-100">
            <header className="border-b border-gray-800">
              <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
                <Suspense fallback={<BrandLinkFallback />}>
                  <BrandLink />
                </Suspense>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                  <Suspense fallback={<NetworkSwitcherFallback />}>
                    <NetworkSwitcher />
                  </Suspense>
                  <ConnectWallet />
                </div>
              </div>
            </header>
            <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
