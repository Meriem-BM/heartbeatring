import "@rainbow-me/rainbowkit/styles.css";
import "./globals.css";
import type { Metadata } from "next";
import { Suspense } from "react";

import { Providers } from "@/app/providers";
import { BrandLink } from "@/components/primitives/brand-link";
import { ConnectWallet } from "@/components/primitives/connect-wallet";
import { NetworkSupportWarning } from "@/components/primitives/network-support-warning";

export const metadata: Metadata = {
  title: "HeartbeatRing",
  description: "On-chain coordination rings on Rootstock mainnet and testnet.",
};

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
              <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
                <Suspense
                  fallback={
                    <span className="text-lg font-semibold tracking-tight text-gray-50">
                      HeartbeatRing
                    </span>
                  }
                >
                  <BrandLink />
                </Suspense>
                <div className="flex items-center justify-end">
                  <Suspense
                    fallback={
                      <button
                        type="button"
                        disabled
                        className="rounded-xl bg-gray-800 px-4 py-2 text-sm font-medium text-gray-400"
                      >
                        Connect Wallet
                      </button>
                    }
                  >
                    <ConnectWallet />
                  </Suspense>
                </div>
              </div>
            </header>
            <Suspense fallback={null}>
              <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <NetworkSupportWarning />
              </div>
            </Suspense>
            <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
