import { AlertCircle, CheckCircle, ChevronRight, Scale, ShieldCheck, Sparkles, Zap } from 'lucide-react';
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
        <div className="w-full bg-neutral-900/40 border border-white/5 rounded-3xl overflow-hidden backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-700 shadow-[0_20px_50px_rgba(0,0,0,0.3)]">

            {/* Header */}
            <div className="p-6 border-b border-white/5 bg-white/[0.02]">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FA8112]/20 to-[#FA8112]/5 border border-[#FA8112]/20 flex items-center justify-center shadow-inner">
                            <ShieldCheck className="w-6 h-6 text-[#FA8112]" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-white tracking-tight">Agent Consensus</h3>
                            <p className="text-xs text-neutral-400 font-medium">Evaluate and select the authoritative response</p>
                        </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                        <div className="relative w-16 h-16 flex items-center justify-center">
                            <svg className="w-full h-full -rotate-90">
                                <circle
                                    cx="32" cy="32" r="28"
                                    className="stroke-neutral-800 fill-none"
                                    strokeWidth="4"
                                />
                                <circle
                                    cx="32" cy="32" r="28"
                                    className="stroke-[#FA8112] fill-none transition-all duration-1000 ease-out"
                                    strokeWidth="4"
                                    strokeDasharray={175.9}
                                    strokeDashoffset={175.9 - (175.9 * consensusPercent) / 100}
                                    strokeLinecap="round"
                                />
                            </svg>
                            <span className="absolute text-[10px] font-black text-[#FA8112]">{consensusPercent}%</span>
                        </div>
                        <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">{approvals}/{total} Approval</span>
                    </div>
                </div>
            </div>

            {/* Grid of Choices */}
            <div className="p-6">
                <div className="grid grid-cols-1 gap-4">
                    {results?.map((res, idx) => {
                        const isSelected = selectedId === res.name;
                        const isApprove = res.decision === 'approve';

                        return (
                            <div
                                key={idx}
                                onClick={() => handleSelection(res.name)}
                                className={`
                                    relative cursor-pointer transition-all duration-500 rounded-2xl border p-5 group overflow-hidden
                                    ${isSelected
                                        ? 'bg-[#FA8112]/10 border-[#FA8112]/50 shadow-[0_0_40px_rgba(250,129,18,0.1)] scale-[1.01]'
                                        : 'bg-white/[0.03] border-white/5 hover:border-white/10 hover:bg-white/[0.05]'
                                    }
                                `}
                            >
                                {/* Animated background element for selection */}
                                {isSelected && (
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#FA8112]/20 blur-[60px] -mr-16 -mt-16 pointer-events-none animate-pulse"></div>
                                )}

                                <div className="flex items-start justify-between relative z-10">
                                    <div className="flex-1 pr-10">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className={`
                                                flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-black text-[9px] uppercase tracking-wider
                                                ${res.role === 'Aggressive' ? 'bg-red-500/20 text-red-400 border border-red-500/20' :
                                                    res.role === 'Conservative' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/20' :
                                                        'bg-purple-500/20 text-purple-400 border border-purple-500/20'
                                                }
                                            `}>
                                                {res.role === 'Aggressive' ? <Zap className="w-3 h-3" /> :
                                                    res.role === 'Conservative' ? <ShieldCheck className="w-3 h-3" /> :
                                                        <Scale className="w-3 h-3" />}
                                                {res.role}
                                            </div>
                                            <h4 className="font-bold text-white text-sm">{res.name}</h4>
                                        </div>

                                        <p className="text-sm text-neutral-300 leading-relaxed mb-4 italic font-medium">
                                            "{res.reason}"
                                        </p>

                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">Verdict</span>
                                                <span className={`
                                                    text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded
                                                    ${isApprove
                                                        ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                                                        : 'text-red-400 bg-red-500/10 border border-red-500/20'
                                                    }
                                                `}>
                                                    {res.decision}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Selection Indicator */}
                                    <div className={`
                                        w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-500 shrink-0
                                        ${isSelected
                                            ? 'bg-[#FA8112] border-[#FA8112] scale-110 shadow-[0_0_15px_rgba(250,129,18,0.5)]'
                                            : 'border-white/10 bg-black/20 group-hover:border-white/20'
                                        }
                                    `}>
                                        {isSelected && <CheckCircle className="w-4 h-4 text-white" strokeWidth={3} />}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Confirmation Footer */}
            <div className="px-6 pb-6 space-y-4 relative z-10">
                <div className="h-px bg-white/5" />

                <div className="flex items-center justify-between text-[10px] text-neutral-500 font-bold uppercase tracking-widest px-2">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-3 h-3 text-[#FA8112]" />
                        <span>Verifiable Decision Path</span>
                    </div>
                    <span>Manual Override Required</span>
                </div>

                <button
                    onClick={handleConfirm}
                    disabled={!selectedId}
                    className={`
                        group w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3
                        ${selectedId
                            ? 'bg-[#FA8112] text-white hover:bg-[#ff8f29] shadow-[0_10px_30px_rgba(250,129,18,0.2)] hover:scale-[1.02] active:scale-[0.98]'
                            : 'bg-white/5 text-neutral-600 cursor-not-allowed border border-white/5'
                        }
                    `}
                >
                    Confirm Choice
                    <ChevronRight className={`w-4 h-4 transition-transform ${selectedId ? 'group-hover:translate-x-1' : ''}`} />
                </button>
            </div>

        </div>
    );
};

