import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'FLINT - Flare Intelligence Network for Trust',
  description: 'AI-powered DeFi yield optimization platform on Flare Network',
}

import { PrivyContext } from '@/context/PrivyContext'
import { headers } from 'next/headers'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <PrivyContext>
          {children}
        </PrivyContext>
      </body>
    </html>
  )
}

