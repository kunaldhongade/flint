import { Check, Copy, ExternalLink, Loader2, X } from 'lucide-react';
import React, { useState } from 'react';

interface VerificationStep {
    id: string;
    label: string;
    status: 'pending' | 'loading' | 'success' | 'error';
    detail?: string;
    hash?: string;
}

interface VerificationProgressModalProps {
    isOpen: boolean;
    onClose: () => void;
    steps: VerificationStep[];
    decisionId?: string;
    txHash?: string;
    ipfsCid?: string;
}

export const VerificationProgressModal: React.FC<VerificationProgressModalProps> = ({
    isOpen,
    onClose,
    steps,
    decisionId,
    txHash,
    ipfsCid
}) => {
    const [copiedField, setCopiedField] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleCopy = (text: string, field: string) => {
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const allComplete = steps.every(s => s.status === 'success');
    const hasError = steps.some(s => s.status === 'error');

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-300">

                {/* Header */}
                <div className="p-6 border-b border-neutral-800 flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-bold text-[#FAF3E1]">
                            {allComplete ? 'Verification Complete' : hasError ? 'Verification Failed' : 'Creating Proof'}
                        </h3>
                        <p className="text-xs text-neutral-400 mt-1">
                            {allComplete ? 'Your decision has been verified on-chain' : 'Please wait while we verify your decision'}
                        </p>
                    </div>
                    {allComplete && (
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
                        >
                            <X className="w-4 h-4 text-neutral-400" />
                        </button>
                    )}
                </div>

                {/* Progress Steps */}
                <div className="p-6 space-y-4">
                    {steps.map((step, index) => (
                        <div key={step.id} className="flex items-start gap-4">
                            {/* Status Icon */}
                            <div className={`
                flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300
                ${step.status === 'success' ? 'bg-green-500/10 border border-green-500/20' :
                                    step.status === 'loading' ? 'bg-[#FA8112]/10 border border-[#FA8112]/20' :
                                        step.status === 'error' ? 'bg-red-500/10 border border-red-500/20' :
                                            'bg-neutral-800 border border-neutral-700'}
              `}>
                                {step.status === 'success' && <Check className="w-4 h-4 text-green-500" />}
                                {step.status === 'loading' && <Loader2 className="w-4 h-4 text-[#FA8112] animate-spin" />}
                                {step.status === 'error' && <X className="w-4 h-4 text-red-500" />}
                                {step.status === 'pending' && <div className="w-2 h-2 rounded-full bg-neutral-600" />}
                            </div>

                            {/* Step Content */}
                            <div className="flex-1 min-w-0">
                                <p className={`text-sm font-medium ${step.status === 'success' ? 'text-green-400' :
                                        step.status === 'loading' ? 'text-[#FA8112]' :
                                            step.status === 'error' ? 'text-red-400' :
                                                'text-neutral-500'
                                    }`}>
                                    {step.label}
                                </p>
                                {step.detail && (
                                    <p className="text-xs text-neutral-400 mt-1">{step.detail}</p>
                                )}
                                {step.hash && (
                                    <div className="mt-2 flex items-center gap-2">
                                        <code className="text-xs text-neutral-400 font-mono bg-neutral-950 px-2 py-1 rounded border border-neutral-800 truncate flex-1">
                                            {step.hash.slice(0, 20)}...{step.hash.slice(-10)}
                                        </code>
                                        <button
                                            onClick={() => handleCopy(step.hash!, step.id)}
                                            className="p-1.5 hover:bg-neutral-800 rounded transition-colors"
                                            title="Copy"
                                        >
                                            {copiedField === step.id ? (
                                                <Check className="w-3.5 h-3.5 text-green-500" />
                                            ) : (
                                                <Copy className="w-3.5 h-3.5 text-neutral-400" />
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Connector Line */}
                            {index < steps.length - 1 && (
                                <div className="absolute left-[2.5rem] mt-10 w-0.5 h-8 bg-neutral-800" />
                            )}
                        </div>
                    ))}
                </div>

                {/* Results Section (shown when complete) */}
                {allComplete && (decisionId || txHash || ipfsCid) && (
                    <div className="px-6 pb-6 space-y-3">
                        <div className="h-px bg-neutral-800 mb-4" />

                        {decisionId && (
                            <div className="space-y-1.5">
                                <label className="text-xs text-neutral-400 font-medium">Decision ID</label>
                                <div className="flex items-center gap-2">
                                    <code className="text-xs text-[#FAF3E1] font-mono bg-neutral-950 px-3 py-2 rounded border border-neutral-800 flex-1 truncate">
                                        {decisionId}
                                    </code>
                                    <button
                                        onClick={() => handleCopy(decisionId, 'decisionId')}
                                        className="p-2 hover:bg-neutral-800 rounded transition-colors"
                                        title="Copy Decision ID"
                                    >
                                        {copiedField === 'decisionId' ? (
                                            <Check className="w-4 h-4 text-green-500" />
                                        ) : (
                                            <Copy className="w-4 h-4 text-neutral-400" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}

                        {txHash && (
                            <div className="space-y-1.5">
                                <label className="text-xs text-neutral-400 font-medium">Transaction Hash</label>
                                <div className="flex items-center gap-2">
                                    <code className="text-xs text-[#FAF3E1] font-mono bg-neutral-950 px-3 py-2 rounded border border-neutral-800 flex-1 truncate">
                                        {txHash}
                                    </code>
                                    <button
                                        onClick={() => handleCopy(txHash, 'txHash')}
                                        className="p-2 hover:bg-neutral-800 rounded transition-colors"
                                        title="Copy Transaction Hash"
                                    >
                                        {copiedField === 'txHash' ? (
                                            <Check className="w-4 h-4 text-green-500" />
                                        ) : (
                                            <Copy className="w-4 h-4 text-neutral-400" />
                                        )}
                                    </button>
                                    <a
                                        href={`https://coston2-explorer.flare.network/tx/${txHash}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2 hover:bg-neutral-800 rounded transition-colors"
                                        title="View on Explorer"
                                    >
                                        <ExternalLink className="w-4 h-4 text-neutral-400" />
                                    </a>
                                </div>
                            </div>
                        )}

                        {ipfsCid && (
                            <div className="space-y-1.5">
                                <label className="text-xs text-neutral-400 font-medium">IPFS CID</label>
                                <div className="flex items-center gap-2">
                                    <code className="text-xs text-[#FAF3E1] font-mono bg-neutral-950 px-3 py-2 rounded border border-neutral-800 flex-1 truncate">
                                        {ipfsCid}
                                    </code>
                                    <button
                                        onClick={() => handleCopy(ipfsCid, 'ipfsCid')}
                                        className="p-2 hover:bg-neutral-800 rounded transition-colors"
                                        title="Copy IPFS CID"
                                    >
                                        {copiedField === 'ipfsCid' ? (
                                            <Check className="w-4 h-4 text-green-500" />
                                        ) : (
                                            <Copy className="w-4 h-4 text-neutral-400" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Action Button */}
                {allComplete && (
                    <div className="p-6 pt-0">
                        <button
                            onClick={onClose}
                            className="w-full py-3 bg-[#FA8112] hover:bg-[#E06C00] text-white font-bold text-sm rounded-lg transition-all shadow-lg shadow-[#FA8112]/20"
                        >
                            Done
                        </button>
                    </div>
                )}

                {hasError && (
                    <div className="p-6 pt-0">
                        <button
                            onClick={onClose}
                            className="w-full py-3 bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-sm rounded-lg transition-all"
                        >
                            Close
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
