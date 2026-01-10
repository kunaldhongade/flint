'use client'

import { UserPortfolio } from '@flint/shared'
import { formatUSD, formatPercent } from '@flint/shared'

interface PortfolioTrackerProps {
  portfolio: UserPortfolio | null
}

export function PortfolioTracker({ portfolio }: PortfolioTrackerProps) {
  if (!portfolio) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <p className="text-gray-500">Loading portfolio...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Portfolio Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Total Value</h3>
          <p className="text-3xl font-bold">{formatUSD(portfolio.totalValueUSD)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Average APY</h3>
          <p className="text-3xl font-bold text-green-600">{formatPercent(portfolio.totalYieldAPY)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Average Risk</h3>
          <p className="text-3xl font-bold">{portfolio.averageRiskScore.toFixed(1)}</p>
        </div>
      </div>

      {/* Positions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-4">Positions</h2>
        {portfolio.positions.length === 0 ? (
          <p className="text-gray-500">No positions yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Asset</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">APY</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Risk</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Protocol</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {portfolio.positions.map((position, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap">{position.asset}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{position.amount}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{formatUSD(position.valueUSD)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-green-600">{formatPercent(position.yieldAPY)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{position.riskScore.toFixed(1)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{position.protocol}</td>
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

