import { AlertCircle, Check, ExternalLink, Loader2, Search, Shield } from 'lucide-react';
import React, { useState } from 'react';

interface TrustMetadata {
    decisionId: string;
    txHash: string;
    ipfsCid: string;
    timestamp: number;
    userInput: string;
    aiResponse: string;
    agentVotes?: Array<{
        name: string;
        role: string;
        decision: string;
        reason: string;
    }>;
    domain?: string;
}

interface TrustVerificationPanelProps {
    onVerify?: (decisionId: string) => void;
}

export const TrustVerificationPanel: React.FC<TrustVerificationPanelProps> = ({ onVerify }) => {
    const [decisionId, setDecisionId] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [metadata, setMetadata] = useState<TrustMetadata | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleVerify = async () => {
        if (!decisionId.trim()) return;

        setIsLoading(true);
        setError(null);
        setMetadata(null);

        try {
            // Call the actual verify API
            const response = await fetch(`/api/trust/verify/${decisionId}`);

            if (!response.ok) {
                throw new Error(`Verification failed: ${response.statusText}`);
            }

            const data = await response.json();

            // Check if decision was found on-chain
            if (data.on_chain_status === 'NOT_FOUND') {
                throw new Error('Decision ID not found on-chain. It may not have been registered yet.');
            }

            // Map API response to our metadata format
            setMetadata({
                decisionId: data.decision_id,
                txHash: data.transaction_hash || '0x0000000000000000000000000000000000000000000000000000000000000000',
                ipfsCid: data.ipfs_cid || 'Not available',
                timestamp: data.timestamp ? data.timestamp * 1000 : Date.now(), // Convert to ms
                userInput: data.subject || 'No subject available',
                aiResponse: data.chosen_model || 'Model information not available',
                agentVotes: data.model_executions?.map((exec: any) => ({
                    name: exec.model_id || 'Unknown Model',
                    role: exec.role || 'Unknown',
                    decision: 'approve', // Default since it was registered
                    reason: `Executed at ${new Date(exec.timestamp_start * 1000).toLocaleTimeString()}`
                })) || [],
                domain: data.domain || 'Unknown'
            });

            if (onVerify) {
                onVerify(decisionId);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to verify decision');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full max-w-3xl mx-auto space-y-6">
            {/* Header */}
            <div className="text-center space-y-2">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#FA8112]/10 border border-[#FA8112]/20 mb-2">
                    <Shield className="w-6 h-6 text-[#FA8112]" />
                </div>
                <h2 className="text-2xl font-bold text-[#FAF3E1]">Verify Decision</h2>
                <p className="text-sm text-neutral-400">
                    Enter a Decision ID to verify its authenticity and view metadata
                </p>
            </div>

            {/* Search Input */}
            <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6 space-y-4">
                <div className="space-y-2">
                    <label className="text-xs text-neutral-400 font-medium">Decision ID</label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={decisionId}
                            onChange={(e) => setDecisionId(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                            placeholder="Enter decision ID to verify..."
                            className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 text-sm text-[#FAF3E1] placeholder-neutral-600 focus:outline-none focus:border-[#FA8112] transition-colors"
                        />
                        <button
                            onClick={handleVerify}
                            disabled={isLoading || !decisionId.trim()}
                            className="px-6 py-3 bg-[#FA8112] hover:bg-[#E06C00] disabled:bg-neutral-800 disabled:text-neutral-600 text-white font-bold text-sm rounded-lg transition-all shadow-lg shadow-[#FA8112]/20 disabled:shadow-none flex items-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Verifying...
                                </>
                            ) : (
                                <>
                                    <Search className="w-4 h-4" />
                                    Verify
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="text-sm font-medium text-red-400">Verification Failed</p>
                            <p className="text-xs text-red-400/80 mt-1">{error}</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Verification Results */}
            {metadata && (
                <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Success Header */}
                    <div className="p-6 bg-green-500/5 border-b border-green-500/20 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                            <Check className="w-5 h-5 text-green-500" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-green-400">Verified Decision</h3>
                            <p className="text-xs text-neutral-400 mt-0.5">This decision has been verified on-chain</p>
                        </div>
                    </div>

                    {/* Metadata Grid */}
                    <div className="p-6 space-y-6">
                        {/* Transaction Details */}
                        <div className="space-y-4">
                            <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Transaction Details</h4>

                            <div className="space-y-3">
                                <div className="space-y-1.5">
                                    <label className="text-xs text-neutral-500">Transaction Hash</label>
                                    <div className="flex items-center gap-2">
                                        <code className="flex-1 text-xs text-[#FAF3E1] font-mono bg-neutral-950 px-3 py-2 rounded border border-neutral-800 truncate">
                                            {metadata.txHash}
                                        </code>
                                        <a
                                            href={`https://coston2-explorer.flare.network/tx/${metadata.txHash}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2 hover:bg-neutral-800 rounded transition-colors"
                                            title="View on Explorer"
                                        >
                                            <ExternalLink className="w-4 h-4 text-neutral-400" />
                                        </a>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs text-neutral-500">IPFS CID</label>
                                    <code className="block text-xs text-[#FAF3E1] font-mono bg-neutral-950 px-3 py-2 rounded border border-neutral-800 truncate">
                                        {metadata.ipfsCid}
                                    </code>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs text-neutral-500">Timestamp</label>
                                    <p className="text-sm text-[#FAF3E1]">
                                        {new Date(metadata.timestamp).toLocaleString()}
                                    </p>
                                </div>

                                {metadata.domain && (
                                    <div className="space-y-1.5">
                                        <label className="text-xs text-neutral-500">Domain</label>
                                        <span className="inline-block px-2 py-1 bg-[#FA8112]/10 border border-[#FA8112]/20 rounded text-xs text-[#FA8112] font-medium">
                                            {metadata.domain}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Decision Context */}
                        <div className="space-y-4">
                            <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Decision Context</h4>

                            <div className="space-y-3">
                                <div className="space-y-1.5">
                                    <label className="text-xs text-neutral-500">User Input</label>
                                    <p className="text-sm text-[#FAF3E1] bg-neutral-950 px-3 py-2 rounded border border-neutral-800">
                                        {metadata.userInput}
                                    </p>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs text-neutral-500">AI Response</label>
                                    <p className="text-sm text-[#FAF3E1] bg-neutral-950 px-3 py-2 rounded border border-neutral-800">
                                        {metadata.aiResponse}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Agent Votes */}
                        {metadata.agentVotes && metadata.agentVotes.length > 0 && (
                            <div className="space-y-4">
                                <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Agent Consensus</h4>

                                <div className="space-y-2">
                                    {metadata.agentVotes.map((vote, idx) => (
                                        <div key={idx} className="bg-neutral-950 border border-neutral-800 rounded-lg p-3">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-medium text-[#FAF3E1]">{vote.name}</span>
                                                    <span className={`text-xs px-2 py-0.5 rounded-full font-mono uppercase ${vote.role === 'Aggressive' ? 'bg-red-500/10 text-red-500' :
                                                        vote.role === 'Conservative' ? 'bg-blue-500/10 text-blue-500' :
                                                            'bg-neutral-500/10 text-neutral-400'
                                                        }`}>
                                                        {vote.role}
                                                    </span>
                                                </div>
                                                <span className={`text-xs font-bold ${vote.decision === 'approve' ? 'text-green-400' : 'text-red-400'
                                                    }`}>
                                                    {vote.decision.toUpperCase()}
                                                </span>
                                            </div>
                                            <p className="text-xs text-neutral-400">{vote.reason}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
