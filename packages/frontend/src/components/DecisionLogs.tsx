'use client'

import { AIDecision } from '@flint/shared'
import { useEffect, useState } from 'react'

export function DecisionLogs() {
  const [decisions, setDecisions] = useState<AIDecision[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDecisions = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/decision', {
          headers: {
            'x-api-key': 'flint-staging-key-123',
            'Content-Type': 'application/json'
          }
        })
        if (!response.ok) throw new Error('Failed to fetch')
        const data = await response.json()
        setDecisions(data)
      } catch (error) {
        console.error('Error fetching decisions:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchDecisions()
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
                <div className="flex flex-col items-end gap-2">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                    Confidence: {(decision.confidenceScore / 100).toFixed(1)}%
                  </span>
                  {decision.onChainHash && (
                    <div className="flex items-center gap-1 text-xs text-green-600 font-medium">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                      TEE Attested
                    </div>
                  )}
                </div>
              </div>

              {decision.onChainHash && (
                <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700 space-y-2">
                  <div className="flex justify-between items-center">
                    <p className="text-xs font-mono text-gray-500 break-all">
                      Attestation Hash: {decision.onChainHash}
                    </p>
                    {decision.modelCid && (
                      <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-mono">
                        Model: {decision.modelCid}
                      </span>
                    )}
                  </div>
                  {decision.xaiTrace && (
                    <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                      <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">XAI Forensic Trace:</p>
                      <div className="grid grid-cols-3 gap-2">
                        {decision.xaiTrace.feature_importance?.map((item: any, i: number) => (
                          <div key={i} className="text-[10px] text-gray-600 bg-white dark:bg-gray-800 p-1 rounded border">
                            <span className="font-semibold">{item.agent}:</span> {Math.round(item.score * 100)}%
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

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

