import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'FLINT - Flare Intelligence Network for Trust',
  description: 'AI-powered DeFi yield optimization platform on Flare Network',
}

import { Web3ModalProvider } from '@/context/Web3Modal'
import { headers } from 'next/headers'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookies = headers().get('cookie')

  return (
    <html lang="en">
      <body className={inter.className}>
        <Web3ModalProvider cookies={cookies}>
          {children}
        </Web3ModalProvider>
      </body>
    </html>
  )
}

