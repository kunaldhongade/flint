'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { WagmiProvider, createConfig } from '@privy-io/wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http } from 'viem';
import { flareTestnet } from 'viem/chains';

// Define Coston2 Chain (Flare Testnet)
const coston2 = {
    ...flareTestnet,
    hasIcon: true,
    iconUrl: 'https://avatars.githubusercontent.com/u/37784886?s=200&v=4', // Flare Logo
};

// 1. Configure Wagmi
const wagmiConfig = createConfig({
    chains: [coston2],
    transports: {
        [coston2.id]: http('https://coston2-api.flare.network/ext/bc/C/rpc'),
    },
});

// 2. Configure Query Client
const queryClient = new QueryClient();

export function PrivyContext({ children }: { children: React.ReactNode }) {
    const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

    if (!appId) {
        console.error("Privy App ID is missing! Please set NEXT_PUBLIC_PRIVY_APP_ID in .env");
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-red-500 mb-2">Configuration Error</h1>
                    <p>Missing NEXT_PUBLIC_PRIVY_APP_ID in environment variables.</p>
                </div>
            </div>
        );
    }

    return (
        <PrivyProvider
            appId={appId}
            config={{
                loginMethods: ['wallet', 'email', 'google'],
                appearance: {
                    theme: 'dark',
                    accentColor: '#FF6B35', // Flare Primary
                    logo: 'https://avatars.githubusercontent.com/u/37784886?s=200&v=4',
                },
                supportedChains: [coston2],
                embeddedWallets: {
                    createOnLogin: 'users-without-wallets',
                },
            }}
        >
            <QueryClientProvider client={queryClient}>
                <WagmiProvider config={wagmiConfig}>
                    {children}
                </WagmiProvider>
            </QueryClientProvider>
        </PrivyProvider>
    );
}
