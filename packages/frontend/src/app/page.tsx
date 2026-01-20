'use client'


import { AgentSwarm } from '@/components/AgentSwarm'
import { DecisionLogs } from '@/components/DecisionLogs'
import { PortfolioTracker } from '@/components/PortfolioTracker'
import { RiskScoring } from '@/components/RiskScoring'
import { TrustDashboard } from '@/components/TrustDashboard'
import { WalletConnect } from '@/components/WalletConnect'
import { YieldDashboard } from '@/components/YieldDashboard'
import { UserPortfolio, YieldOpportunity } from '@flint/shared'
import { useEffect, useState } from 'react'

export default function Home() {
  const [opportunities, setOpportunities] = useState<YieldOpportunity[]>([])
  const [portfolio, setPortfolio] = useState<UserPortfolio | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'swarm' | 'audit' | 'logs'>('overview')

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

    const headers = {
      'x-api-key': process.env.NEXT_PUBLIC_API_KEY || 'flint-staging-key-123',
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
    <main className="dark min-h-screen bg-gray-900 text-gray-100 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-8 flex justify-between items-center border-b border-gray-800 pb-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-flare-primary rounded-lg flex items-center justify-center shadow-lg shadow-pink-500/20">
              <span className="text-2xl font-bold text-white">F</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                FLINT <span className="text-gray-500 font-normal">| AI Trust Layer</span>
              </h1>
              <p className="text-sm text-gray-400">
                Verifiable Intelligence Network secured by Flare
              </p>
            </div>
          </div>
          <WalletConnect />
        </header>

        {/* Navigation Tabs */}
        <nav className="mb-8">
          <div className="flex space-x-2 bg-gray-800 p-1 rounded-lg inline-flex">
            {[
              { id: 'overview', label: 'Trust Dashboard' },
              { id: 'swarm', label: 'Swarm Intelligence' },
              { id: 'audit', label: 'Live Audit' },
              { id: 'logs', label: 'Decision Logs' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-6 rounded-md text-sm font-medium transition-all ${activeTab === tab.id
                  ? 'bg-gray-700 text-white shadow-sm'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </nav>

        {/* Content */}
        <div className="min-h-[600px]">
          {activeTab === 'overview' && (
            <div className="space-y-8 animate-fade-in">
              <TrustDashboard />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                  <h3 className="text-lg font-bold mb-4">Risk Models</h3>
                  <RiskScoring opportunities={opportunities} />
                </div>
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                  <h3 className="text-lg font-bold mb-4">Portfolio State</h3>
                  <PortfolioTracker portfolio={portfolio} />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'swarm' && <AgentSwarm />}

          {activeTab === 'audit' && (
            <div className="animate-fade-in">
              <div className="mb-6">
                <h2 className="text-2xl font-bold mb-2">Live Execution Audit</h2>
                <p className="text-gray-400">Trigger real-time strategies and watch the Trust Layer verify them.</p>
              </div>
              <YieldDashboard opportunities={opportunities} />
            </div>
          )}

          {activeTab === 'logs' && <DecisionLogs />}
        </div>
      </div>
    </main>
  )
}

