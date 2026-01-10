'use client'

import { useState, useEffect } from 'react'
import { AIDecision } from '@flint/shared'

export function DecisionLogs() {
  const [decisions, setDecisions] = useState<AIDecision[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // TODO: Fetch decisions from API
    setLoading(false)
  }, [])

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-4">AI Decision Logs</h2>
      <p className="text-gray-500 mb-6">
        Complete audit trail of all AI decisions with full explainability and data sources.
      </p>
      
      {loading ? (
        <p className="text-gray-500">Loading decisions...</p>
      ) : decisions.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 mb-4">No decisions logged yet</p>
          <p className="text-sm text-gray-400">
            AI decisions will appear here with full explanations, data sources, and alternatives considered.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {decisions.map((decision) => (
            <div key={decision.id} className="border rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-semibold">{decision.action} - {decision.asset}</h3>
                  <p className="text-sm text-gray-500">{decision.timestamp.toLocaleString()}</p>
                </div>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                  Confidence: {(decision.confidenceScore / 100).toFixed(1)}%
                </span>
              </div>
              
              <div className="mt-4 space-y-2">
                <div>
                  <h4 className="text-sm font-medium mb-1">Reasons:</h4>
                  <ul className="list-disc list-inside text-sm text-gray-600">
                    {decision.reasons.map((reason, i) => (
                      <li key={i}>{reason}</li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium mb-1">Data Sources:</h4>
                  <p className="text-sm text-gray-600">{decision.dataSources.join(', ')}</p>
                </div>
                
                {decision.alternatives.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-1">Alternatives Considered:</h4>
                    <p className="text-sm text-gray-600">{decision.alternatives.join(', ')}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

