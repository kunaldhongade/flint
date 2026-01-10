'use client'

import { YieldOpportunity } from '@flint/shared'

interface RiskScoringProps {
  opportunities: YieldOpportunity[]
}

export function RiskScoring({ opportunities }: RiskScoringProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-4">Risk Analysis</h2>
      <p className="text-gray-500 mb-6">
        Risk scores are calculated using FTSO price data, FDC attestations, and protocol metrics.
        Lower scores indicate lower risk.
      </p>
      
      {opportunities.length === 0 ? (
        <p className="text-gray-500">No opportunities to analyze</p>
      ) : (
        <div className="space-y-4">
          {opportunities.map((opp) => (
            <div key={opp.id} className="border rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold">{opp.protocol} - {opp.asset}</h3>
                <span className={`px-3 py-1 rounded ${
                  opp.riskScore < 30 ? 'bg-green-100 text-green-800' :
                  opp.riskScore < 60 ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  Risk: {opp.riskScore.toFixed(1)}
                </span>
              </div>
              <p className="text-sm text-gray-600">
                APY: {opp.apy.toFixed(2)}% | TVL: ${opp.tvl.toLocaleString()} | Source: {opp.source}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

