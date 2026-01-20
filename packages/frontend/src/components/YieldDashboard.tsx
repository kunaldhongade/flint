'use client'


import { formatPercent, formatUSD, YieldOpportunity } from '@flint/shared';
import { useState } from 'react';

interface YieldDashboardProps {
  opportunities: YieldOpportunity[]
}


export function YieldDashboard({ opportunities }: YieldDashboardProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleAllocate = async (opp: YieldOpportunity) => {
    setLoadingId(opp.id);
    try {
      const response = await fetch('http://localhost:3333/api/decision/allocate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.NEXT_PUBLIC_API_KEY || 'flint-staging-key-123'
        },
        body: JSON.stringify({
          userId: 'user123',
          asset: opp.asset,
          amount: '100',
          opportunities: [opp]
        })
      });

      const data = await response.json();
      if (response.ok) {
        alert(`Success! Decision Logged. TX: ${data.attestation ? 'Verified' : 'Unverified'}`);
      } else {
        alert(`Error: ${data.message || 'Failed to allocate'}`);
      }
    } catch (error) {
      console.error('Allocation failed:', error);
      alert('Failed to connect to backend');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-xl p-6">
        <h2 className="text-xl font-bold mb-6 text-white tracking-tight flex items-center gap-2">
          <span className="text-cyan-400">Yield</span> Opportunities
          <span className="text-xs font-normal text-gray-500 ml-2 border border-gray-700 rounded px-2 py-0.5">Live Data</span>
        </h2>

        {opportunities.length === 0 ? (
          <div className="text-center py-12">
            <div className="h-8 w-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500">Scanning liquidity pools...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Protocol</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Asset</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">APY</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Risk Score</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">TVL</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Source</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {opportunities.map((opp) => (
                  <tr key={opp.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white group-hover:text-cyan-400 transition-colors">
                      {opp.protocol}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {opp.asset}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-400 text-glow">
                      {formatPercent(opp.apy)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-16 rounded-full overflow-hidden bg-gray-700`}>
                          <div className={`h-full rounded-full ${opp.riskScore < 30 ? 'bg-green-500' : opp.riskScore < 60 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${100 - opp.riskScore}%` }}></div>
                        </div>
                        <span className="text-xs text-gray-400">{opp.riskScore.toFixed(0)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 font-mono">
                      {formatUSD(opp.tvl)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {opp.source}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleAllocate(opp)}
                        disabled={loadingId === opp.id}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all shadow-lg ${loadingId === opp.id
                          ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                          : 'bg-gradient-to-r from-flare-primary to-rose-600 text-white hover:scale-105 hover:shadow-[0_0_15px_rgba(255,107,53,0.4)]'
                          }`}
                      >
                        {loadingId === opp.id ? 'Verifying...' : 'Test Allocate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

