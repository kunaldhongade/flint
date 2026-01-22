import { ArrowLeft, CheckCircle, Clock, Database, ExternalLink, Globe, Search, Shield, XCircle } from 'lucide-react';
import React, { useState } from 'react';
import { useNavigate } from 'react-router';

interface VerificationResult {
    decision_id: string;
    on_chain_status: string;
    transaction_hash?: string;
    block_number?: number;
    timestamp?: number;
    decision_hash?: string;
    model_hash?: string;
    ftso_round_id?: number;
    fdc_proof_hash?: string;
    backend_signer?: string;
    verification_status: string;
}

const TrustView = () => {
    const navigate = useNavigate();
    const [decisionId, setDecisionId] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<VerificationResult | null>(null);
    const [error, setError] = useState('');

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!decisionId.trim()) return;

        setLoading(true);
        setError('');
        setResult(null);

        try {
            // Assuming relative API path. In dev, Vite proxy handles strict CORS or we rely on same-origin.
            // Need to ensuring /api prefix matches backend.
            const response = await fetch(`/api/trust/verify/${decisionId.trim()}`);

            if (!response.ok) {
                throw new Error('Verification failed. Invalid ID or network error.');
            }

            const data = await response.json();
            setResult(data);
        } catch (err: any) {
            setError(err.message || 'An error occurred during verification.');
        } finally {
            setLoading(false);
        }
    };

    const ExplorerLink = ({ tx }: { tx?: string }) => {
        if (!tx) return <span className="text-neutral-500">Pending / Not Found</span>;
        // Coston2 Explorer
        const url = `https://coston2-explorer.flare.network/tx/${tx}`;
        return (
            <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
            >
                {tx.slice(0, 8)}...{tx.slice(-6)}
                <ExternalLink className="w-3 h-3" />
            </a>
        );
    };

    return (
        <div className="min-h-screen bg-neutral-950 text-white p-6 font-sans">
            <div className="max-w-4xl mx-auto">
                <button
                    onClick={() => navigate('/')}
                    className="flex items-center gap-2 text-neutral-400 hover:text-white mb-8 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Home
                </button>

                <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-blue-500/20 border border-emerald-500/30">
                        <Shield className="w-8 h-8 text-emerald-400" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-blue-500">
                            Trust Center
                        </h1>
                        <p className="text-neutral-400">Verify AI decisions on the Flare Blockchain</p>
                    </div>
                </div>

                {/* Search Card */}
                <div className="bg-neutral-900/50 backdrop-blur-xl border border-neutral-800 rounded-3xl p-8 shadow-2xl mb-8">
                    <form onSubmit={handleVerify} className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 w-5 h-5" />
                        <div className="flex gap-4">
                            <input
                                type="text"
                                value={decisionId}
                                onChange={(e) => setDecisionId(e.target.value)}
                                placeholder="Enter Decision UUID (e.g. 550e8400-e29b-41d4-a716-446655440000)"
                                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-4 pl-12 pr-4 text-white placeholder-neutral-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono"
                            />
                            <button
                                type="submit"
                                disabled={loading || !decisionId}
                                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 rounded-xl font-medium transition-colors min-w-[120px]"
                            >
                                {loading ? 'Verifying...' : 'Verify'}
                            </button>
                        </div>
                    </form>
                    {error && (
                        <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center gap-3">
                            <XCircle className="w-5 h-5" />
                            {error}
                        </div>
                    )}
                </div>

                {/* Results Card */}
                {result && (
                    <div className="bg-neutral-900/50 backdrop-blur-xl border border-neutral-800 rounded-3xl p-8 shadow-2xl animate-fadeIn">
                        <div className="flex items-center justify-between mb-8 pb-8 border-b border-neutral-800">
                            <div className="flex items-center gap-4">
                                <div className={`p-2 rounded-full ${result.verification_status === 'VERIFIED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                    {result.verification_status === 'VERIFIED' ? <CheckCircle className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold">{result.on_chain_status}</h3>
                                    <p className="text-sm text-neutral-400">On-Chain Status</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-sm font-mono text-neutral-500">Backend Signer</div>
                                <div className="text-sm font-mono text-neutral-300">{result.backend_signer?.slice(0, 10)}...</div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-6">
                                <div className="bg-neutral-950/50 rounded-2xl p-4 border border-neutral-800">
                                    <div className="flex items-center gap-2 text-neutral-400 mb-2">
                                        <Globe className="w-4 h-4" />
                                        <span className="text-xs font-medium uppercase tracking-wider">Blockchain Proof</span>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-neutral-500">Transaction</span>
                                            <ExplorerLink tx={result.transaction_hash} />
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-neutral-500">Block Number</span>
                                            <span className="text-sm font-mono">{result.block_number || 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-neutral-950/50 rounded-2xl p-4 border border-neutral-800">
                                    <div className="flex items-center gap-2 text-neutral-400 mb-2">
                                        <Clock className="w-4 h-4" />
                                        <span className="text-xs font-medium uppercase tracking-wider">FTSO Context</span>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-neutral-500">Round ID</span>
                                            <span className="text-sm font-mono text-emerald-400">{result.ftso_round_id || 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="bg-neutral-950/50 rounded-2xl p-4 border border-neutral-800">
                                    <div className="flex items-center gap-2 text-neutral-400 mb-2">
                                        <Database className="w-4 h-4" />
                                        <span className="text-xs font-medium uppercase tracking-wider">Data Consistency</span>
                                    </div>
                                    <div className="space-y-3">
                                        <div>
                                            <span className="text-xs text-neutral-500 block mb-1">Decision Hash</span>
                                            <code className="text-xs bg-black/50 p-1.5 rounded block truncate text-neutral-300 border border-neutral-800">
                                                {result.decision_hash}
                                            </code>
                                        </div>
                                        <div>
                                            <span className="text-xs text-neutral-500 block mb-1">Model Hash</span>
                                            <code className="text-xs bg-black/50 p-1.5 rounded block truncate text-neutral-300 border border-neutral-800">
                                                {result.model_hash}
                                            </code>
                                        </div>
                                        {result.fdc_proof_hash && (
                                            <div>
                                                <span className="text-xs text-neutral-500 block mb-1">FDC/Event Proof</span>
                                                <code className="text-xs bg-black/50 p-1.5 rounded block truncate text-purple-300/80 border border-purple-500/20">
                                                    {result.fdc_proof_hash}
                                                </code>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out forwards;
        }
      `}</style>
        </div>
    );
};

export default TrustView;
