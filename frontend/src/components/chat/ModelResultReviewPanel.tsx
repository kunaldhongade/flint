import { AlertCircle, CheckCircle, ChevronRight, Sparkles } from 'lucide-react';
import React, { useState } from 'react';

interface AgentVote {
    name: string;
    role: 'Conservative' | 'Neutral' | 'Aggressive';
    decision: 'approve' | 'reject';
    reason: string;
}

interface ModelResultReviewPanelProps {
    results: AgentVote[];
    onSelect: (modelName: string) => void;
}

export const ModelResultReviewPanel: React.FC<ModelResultReviewPanelProps> = ({ results, onSelect }) => {
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const handleSelection = (name: string) => {
        setSelectedId(name);
    };

    const handleConfirm = () => {
        if (selectedId) {
            onSelect(selectedId);
        }
    };

    // Calculate consensus
    const approvals = results.filter(r => r.decision === 'approve').length;
    const total = results.length;
    const consensusPercent = Math.round((approvals / total) * 100);

    return (
        <div className="w-full bg-gradient-to-b from-neutral-900/50 to-neutral-900/30 border border-neutral-800/50 rounded-2xl overflow-hidden backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4 duration-700 shadow-2xl">

            {/* Header */}
            <div className="p-6 border-b border-neutral-800/50 bg-neutral-900/60">
                <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FA8112]/20 to-[#FA8112]/5 border border-[#FA8112]/20 flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-[#FA8112]" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-[#FAF3E1]">Agent Consensus</h3>
                            <p className="text-xs text-neutral-400 mt-1">Select the response you trust most</p>
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        <div className="px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-[10px] text-yellow-500 font-bold flex items-center gap-1.5">
                            <AlertCircle className="w-3 h-3" />
                            ACTION REQUIRED
                        </div>
                        <div className="text-xs text-neutral-500">
                            {approvals}/{total} approve ({consensusPercent}%)
                        </div>
                    </div>
                </div>
            </div>

            {/* Grid of Choices */}
            <div className="p-6">
                <div className="grid grid-cols-1 gap-3">
                    {results?.map((res, idx) => {
                        const isSelected = selectedId === res.name;
                        const isApprove = res.decision === 'approve';

                        return (
                            <div
                                key={idx}
                                onClick={() => handleSelection(res.name)}
                                className={`
                                    relative cursor-pointer transition-all duration-300 rounded-xl border p-4 group
                                    ${isSelected
                                        ? 'bg-[#FA8112]/5 border-[#FA8112] shadow-[0_0_30px_rgba(250,129,18,0.15)] scale-[1.02]'
                                        : 'bg-neutral-950/50 border-neutral-800/50 hover:border-neutral-700 hover:bg-neutral-900/50 hover:scale-[1.01]'
                                    }
                                `}
                            >
                                {/* Selection Indicator */}
                                <div className={`
                                    absolute top-4 right-4 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300
                                    ${isSelected
                                        ? 'bg-[#FA8112] border-[#FA8112] scale-110'
                                        : 'border-neutral-700 bg-neutral-900/50 group-hover:border-neutral-600'
                                    }
                                `}>
                                    {isSelected && <CheckCircle className="w-4 h-4 text-white" strokeWidth={3} />}
                                </div>

                                <div className="pr-8">
                                    {/* Header */}
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className={`
                                            text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider
                                            ${res.role === 'Aggressive' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                                res.role === 'Conservative' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                                    'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                            }
                                        `}>
                                            {res.role}
                                        </span>
                                        <h4 className="font-bold text-neutral-200 text-sm">{res.name}</h4>
                                    </div>

                                    {/* Reason */}
                                    <p className="text-sm text-neutral-400 leading-relaxed mb-3">
                                        {res.reason}
                                    </p>

                                    {/* Verdict */}
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-neutral-500 font-medium">Verdict:</span>
                                        <span className={`
                                            text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded
                                            ${isApprove
                                                ? 'text-green-400 bg-green-500/10'
                                                : 'text-red-400 bg-red-500/10'
                                            }
                                        `}>
                                            {res.decision}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Confirmation Footer */}
            <div className="px-6 pb-6 space-y-3">
                <div className="h-px bg-neutral-800/50" />

                <p className="text-xs text-neutral-500 text-center italic">
                    You are choosing which AI output becomes the authoritative response
                </p>

                <button
                    onClick={handleConfirm}
                    disabled={!selectedId}
                    className={`
                        w-full py-3.5 rounded-xl font-bold text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2
                        ${selectedId
                            ? 'bg-gradient-to-r from-[#FA8112] to-[#E06C00] text-white hover:shadow-xl hover:shadow-[#FA8112]/30 hover:scale-[1.02] active:scale-[0.98]'
                            : 'bg-neutral-800/50 text-neutral-600 cursor-not-allowed'
                        }
                    `}
                >
                    Confirm Selection
                    <ChevronRight className={`w-4 h-4 transition-transform ${selectedId ? 'group-hover:translate-x-1' : ''}`} />
                </button>
            </div>

        </div>
    );
};
