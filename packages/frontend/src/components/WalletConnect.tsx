'use client'

import { usePrivy } from '@privy-io/react-auth'

export function WalletConnect() {
    const { login, ready, authenticated, user, logout } = usePrivy()

    if (!ready) return null // Or a loader

    if (authenticated && user?.wallet) {
        const address = user.wallet.address
        const shortAddr = `${address.slice(0, 6)}...${address.slice(-4)}`

        return (
            <button
                onClick={logout}
                className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-700 transition-colors"
                title="Disconnect"
            >
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="font-mono text-sm">{shortAddr}</span>
            </button>
        )
    }

    return (
        <button
            onClick={login}
            className="bg-flare-primary hover:bg-opacity-90 text-white px-6 py-2 rounded-full font-bold transition-all shadow-lg hover:shadow-orange-500/20"
        >
            Connect Wallet
        </button>
    )
}
