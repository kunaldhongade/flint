'use client'

import { DecisionLogs } from '@/components/DecisionLogs'
import { PortfolioTracker } from '@/components/PortfolioTracker'
import { RiskScoring } from '@/components/RiskScoring'
import { WalletConnect } from '@/components/WalletConnect'
import { YieldDashboard } from '@/components/YieldDashboard'
import { UserPortfolio, YieldOpportunity } from '@flint/shared'
import { useEffect, useState } from 'react'

export default function Home() {
  const [opportunities, setOpportunities] = useState<YieldOpportunity[]>([])
  const [portfolio, setPortfolio] = useState<UserPortfolio | null>(null)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'portfolio' | 'risk' | 'decisions'>('dashboard')

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

    const headers = {
      'x-api-key': 'flint-staging-key-123',
      'Content-Type': 'application/json'
    }

    // Fetch yield opportunities
    fetch(`${apiUrl}/api/yield/opportunities`, { headers })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
        return res.json()
      })
      .then(data => {
        if (Array.isArray(data)) {
          setOpportunities(data)
        } else {
          console.error('Expected array of opportunities, got:', data)
          setOpportunities([])
        }
      })
      .catch(err => console.error('Failed to fetch opportunities:', err))

    // Fetch portfolio
    fetch(`${apiUrl}/api/portfolio/user123`, { headers })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
        return res.json()
      })
      .then(data => setPortfolio(data))
      .catch(err => console.error('Failed to fetch portfolio:', err))
  }, [])

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold text-flare-primary mb-2">
              FLINT
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Flare Intelligence Network for Trust
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Transparent, auditable, and scalable infrastructure for DeFi yield optimization
            </p>
          </div>
          <WalletConnect />
        </header>

        {/* Navigation Tabs */}
        <nav className="mb-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex space-x-4">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`py-2 px-4 border-b-2 ${activeTab === 'dashboard'
                ? 'border-flare-primary text-flare-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
            >
              Yield Dashboard
            </button>
            <button
              onClick={() => setActiveTab('portfolio')}
              className={`py-2 px-4 border-b-2 ${activeTab === 'portfolio'
                ? 'border-flare-primary text-flare-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
            >
              Portfolio
            </button>
            <button
              onClick={() => setActiveTab('risk')}
              className={`py-2 px-4 border-b-2 ${activeTab === 'risk'
                ? 'border-flare-primary text-flare-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
            >
              Risk Scoring
            </button>
            <button
              onClick={() => setActiveTab('decisions')}
              className={`py-2 px-4 border-b-2 ${activeTab === 'decisions'
                ? 'border-flare-primary text-flare-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
            >
              Decision Logs
            </button>
          </div>
        </nav>

        {/* Content */}
        <div className="mt-6">
          {activeTab === 'dashboard' && <YieldDashboard opportunities={opportunities} />}
          {activeTab === 'portfolio' && <PortfolioTracker portfolio={portfolio} />}
          {activeTab === 'risk' && <RiskScoring opportunities={opportunities} />}
          {activeTab === 'decisions' && <DecisionLogs />}
        </div>
      </div>
    </main>
  )
}

