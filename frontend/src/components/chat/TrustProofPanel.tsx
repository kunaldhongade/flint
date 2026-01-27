import { Check, Copy, ExternalLink, Shield } from 'lucide-react';
import React from 'react';

interface TrustProofPanelProps {
    decisionId: string;
    decisionHash: string;
    txHash?: string;
    ipfsCid?: string;
    timestamp: number;
    modelId?: string;
}

export const TrustProofPanel: React.FC<TrustProofPanelProps> = ({
    decisionId,
    txHash,
    ipfsCid,
    timestamp,
    modelId
}) => {
    const [copied, setCopied] = React.useState(false);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="mt-2 text-xs border border-neutral-800 bg-neutral-900/50 rounded-lg overflow-hidden">
            <div className="px-3 py-2 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-400 font-medium">
                    <Shield className="w-3 h-3" />
                    <span>Verifiable Decision Proof</span>
                </div>
                <div className="text-neutral-500">
                    {new Date(timestamp).toLocaleTimeString()}
                </div>
            </div>

            <div className="p-3 space-y-2">
                <div className="flex items-center justify-between group">
                    <span className="text-neutral-500">Decision ID</span>
                    <div className="flex items-center gap-2">
                        <code className="text-neutral-300 font-mono bg-neutral-950 px-1.5 py-0.5 rounded">
                            {decisionId.slice(0, 8)}...{decisionId.slice(-8)}
                        </code>
                        <button onClick={() => copyToClipboard(decisionId)} className="text-neutral-600 hover:text-white transition-colors">
                            {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                        </button>
                    </div>
                </div>

                {ipfsCid && (
                    <div className="flex items-center justify-between">
                        <span className="text-neutral-500">IPFS Source</span>
                        <a
                            href={`https://gateway.pinata.cloud/ipfs/${ipfsCid}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 transition-colors"
                        >
                            <span className="font-mono text-[10px]">{ipfsCid.slice(0, 6)}...{ipfsCid.slice(-4)}</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                    </div>
                )}

                {modelId && (
                    <div className="flex items-center justify-between group">
                        <span className="text-neutral-500">AI Model</span>
                        <span className="text-neutral-300 font-medium bg-neutral-800 px-1.5 py-0.5 rounded text-[10px]">
                            {modelId}
                        </span>
                    </div>
                )}

                {txHash && (
                    <div className="border-t border-neutral-800 mt-2 pt-2">
                        <a
                            href={`https://testnet.flarescan.com/tx/${txHash}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-center gap-2 w-full py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded transition-colors"
                        >
                            <ExternalLink className="w-3 h-3" />
                            View on Flare Explorer
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
};
