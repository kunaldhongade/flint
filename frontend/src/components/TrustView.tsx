import swearTrust from '@/assets/swear-trust.svg';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { CheckCircle, Clock, ExternalLink, Link as LinkIcon, Lock, Search, Shield } from 'lucide-react';
import React, { useState } from 'react';

const TrustView: React.FC = () => {
    const [decisionId, setDecisionId] = useState('');
    const [searchResult, setSearchResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const handleVerify = (e: React.FormEvent) => {
        e.preventDefault();
        if (!decisionId.trim()) return;

        setLoading(true);
        // Simulate verification delay
        setTimeout(() => {
            setSearchResult({
                status: 'verified',
                timestamp: Date.now() - 3600000,
                decisionHash: "0x" + Math.random().toString(16).slice(2).repeat(4),
                modelId: "gemini-1.5-pro-001",
                ftsoBlock: 1245092,
                fdcProof: "0x9a8b...7f2c"
            });
            setLoading(false);
        }, 1500);
    };

    return (
        <div className="min-h-screen bg-transparent p-6 flex flex-col items-center">
            <div className="max-w-2xl w-full space-y-8 mt-12">
                <div className="text-center space-y-6 flex flex-col items-center">

                    <div>
                        <h1 className="text-3xl font-bold text-[#FAF3E1] mb-2">Trust Verification Center</h1>
                        <p className="text-neutral-400 max-w-lg mx-auto">
                            Verify any AI decision against the immutable Flare Data Connector logs.
                        </p>
                    </div>
                </div>

                <Card className="bg-neutral-900/50 border-neutral-800 backdrop-blur-sm">
                    <CardContent className="p-4">
                        <form onSubmit={handleVerify} className="flex gap-2 items-center bg-neutral-950/50 p-1.5 rounded-xl border border-neutral-800 focus-within:border-[#FA8112]/50 transition-colors">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-3 w-4 h-4 text-neutral-500" />
                                <Input
                                    placeholder="Enter Decision ID (UUID)..."
                                    className="pl-10 bg-transparent border-none text-[#FAF3E1] placeholder:text-neutral-600 focus-visible:ring-0 focus-visible:ring-offset-0 h-10 shadow-none text-base"
                                    value={decisionId}
                                    onChange={(e) => setDecisionId(e.target.value)}
                                />
                            </div>
                            <Button
                                type="submit"
                                disabled={loading || !decisionId}
                                className="bg-[#FA8112] hover:bg-[#d96d0d] text-white min-w-[100px] rounded-lg transition-all"
                            >
                                {loading ? "Verifying..." : "Verify"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {searchResult && (
                    <Card className="bg-[#FA8112]/5 border-[#FA8112]/20 animate-in fade-in slide-in-from-bottom-4">
                        <CardHeader className="border-b border-[#FA8112]/10 pb-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-[#FA8112]">
                                    <CheckCircle className="w-5 h-5" />
                                    <CardTitle className="text-lg text-[#FAF3E1]">Verified On-Chain</CardTitle>
                                </div>
                                <span className="text-xs font-mono text-[#FA8112]/90 bg-[#FA8112]/10 px-2 py-1 rounded border border-[#FA8112]/20">
                                    IMMUTABLE
                                </span>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-neutral-900/50 rounded-lg border border-neutral-800/50">
                                    <div className="flex items-center gap-2 text-neutral-500 text-xs mb-1">
                                        <Clock className="w-3 h-3" /> Timestamp
                                    </div>
                                    <div className="text-neutral-200 text-sm font-mono">
                                        {new Date(searchResult.timestamp).toLocaleString()}
                                    </div>
                                </div>
                                <div className="p-3 bg-neutral-900/50 rounded-lg border border-neutral-800/50">
                                    <div className="flex items-center gap-2 text-neutral-500 text-xs mb-1">
                                        <Lock className="w-3 h-3" /> Model ID
                                    </div>
                                    <div className="text-neutral-200 text-sm font-mono">
                                        {searchResult.modelId}
                                    </div>
                                </div>
                            </div>

                            <div className="p-3 bg-neutral-900/50 rounded-lg border border-neutral-800/50 overflow-hidden">
                                <div className="flex items-center gap-2 text-neutral-500 text-xs mb-2">
                                    <LinkIcon className="w-3 h-3" /> Decision Hash
                                </div>
                                <code className="text-[#FA8112] text-xs break-all">
                                    {searchResult.decisionHash}
                                </code>
                            </div>

                            <div className="p-3 bg-neutral-900/50 rounded-lg border border-neutral-800/50 overflow-hidden">
                                <div className="flex items-center gap-2 text-neutral-500 text-xs mb-2">
                                    <Shield className="w-3 h-3" /> FDC Proof
                                </div>
                                <code className="text-neutral-400 text-xs break-all">
                                    {searchResult.fdcProof}
                                </code>
                            </div>

                            <div className="pt-2">
                                <a href="#" className="flex items-center justify-center gap-2 w-full py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-sm transition-colors">
                                    <ExternalLink className="w-3 h-3" />
                                    View on Flare Explorer
                                </a>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
};

export default TrustView;
