"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { Suspense, useState, type ReactNode } from "react";
import { WagmiProvider, createConfig, http, injected } from "wagmi";

import { WalletProvider } from "@/context/wallet-context";
import { rootstockMainnet, rootstockTestnet } from "@/lib/chain/config";

const wagmiConfig = createConfig({
  chains: [rootstockTestnet, rootstockMainnet],
  connectors: [injected({ shimDisconnect: true })],
  transports: {
    [rootstockTestnet.id]: http(rootstockTestnet.rpcUrls.default.http[0]),
    [rootstockMainnet.id]: http(rootstockMainnet.rpcUrls.default.http[0]),
  },
  ssr: true,
});

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            staleTime: 5_000,
          },
        },
      }),
  );

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          modalSize="compact"
          theme={darkTheme({
            accentColor: "#059669",
            accentColorForeground: "#f9fafb",
            borderRadius: "medium",
            overlayBlur: "small",
          })}
        >
          <Suspense fallback={null}>
            <WalletProvider>{children}</WalletProvider>
          </Suspense>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
