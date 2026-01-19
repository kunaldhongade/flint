'use client'

import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { flare, flareTestnet } from '@reown/appkit/networks'
import { createAppKit } from '@reown/appkit/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React, { ReactNode } from 'react'
import { cookieToInitialState, WagmiProvider, type Config } from 'wagmi'

// 1. Get projectId from https://cloud.reown.com
// 1. Get projectId from https://cloud.reown.com
const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID;

if (!projectId) {
    throw new Error("NEXT_PUBLIC_REOWN_PROJECT_ID is missing. Cannot proceed with wallet connection in staging.");
}

// 2. Create a metadata object - optional
const metadata = {
    name: 'FLINT',
    description: 'Flare Intelligence Network for Trust',
    url: 'https://flint.flare.network', // origin must match your domain & subdomain
    icons: ['https://avatars.githubusercontent.com/u/37784886']
}

// 3. Set the networks
const networks = [flareTestnet] as [any, ...any[]]

// 4. Create Wagmi Adapter
const wagmiAdapter = new WagmiAdapter({
    projectId,
    networks
})

// 5. Create Modal
createAppKit({
    adapters: [wagmiAdapter],
    networks,
    projectId,
    metadata,
    features: {
        analytics: true // Optional - defaults to your Cloud configuration
    }
})

export function Web3ModalProvider({ children, cookies }: { children: ReactNode; cookies?: string | null }) {
    const [queryClient] = React.useState(() => new QueryClient())

    const initialState = cookieToInitialState(wagmiAdapter.wagmiConfig as Config, cookies)

    return (
        <WagmiProvider config={wagmiAdapter.wagmiConfig as Config} initialState={initialState}>
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        </WagmiProvider>
    )
}
