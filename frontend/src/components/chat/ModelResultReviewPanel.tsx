import { AlertCircle, CheckCircle, ChevronRight, Cpu } from 'lucide-react';
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

    return (
        <div className="w-full bg-neutral-900/50 border border-neutral-800 rounded-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700">

            {/* Header */}
            <div className="p-4 border-b border-neutral-800 bg-neutral-900/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#FA8112]/10 flex items-center justify-center">
                        <Cpu className="w-4 h-4 text-[#FA8112]" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-[#FAF3E1]">Model Output Review</h3>
                        <p className="text-xs text-neutral-400">Select the authoritative response.</p>
                    </div>
                </div>
                <div className="px-2 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded text-[10px] text-yellow-500 font-mono flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    ACTION REQUIRED
                </div>
            </div>

            {/* Grid of Choices */}
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {results?.map((res, idx) => {
                    const isSelected = selectedId === res.name;
                    const isApprove = res.decision === 'approve';

                    return (
                        <div
                            key={idx}
                            onClick={() => handleSelection(res.name)}
                            className={`
                        relative cursor-pointer transition-all duration-200 rounded-xl border p-4 group
                        ${isSelected
                                    ? 'bg-[#FA8112]/5 border-[#FA8112] shadow-[0_0_20px_rgba(250,129,18,0.1)]'
                                    : 'bg-neutral-950 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900'
                                }
                    `}
                        >
                            {/* Selection Indicator */}
                            <div className={`absolute top-4 right-4 w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${isSelected ? 'bg-[#FA8112] border-[#FA8112]' : 'border-neutral-700 bg-neutral-900'}`}>
                                {isSelected && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                            </div>

                            <div className="flex items-center gap-2 mb-3">
                                <span className={`text-xs px-2 py-0.5 rounded-full font-mono uppercase ${res.role === 'Aggressive' ? 'bg-red-500/10 text-red-500' :
                                        res.role === 'Conservative' ? 'bg-blue-500/10 text-blue-500' :
                                            'bg-neutral-500/10 text-neutral-400'
                                    }`}>
                                    {res.role}
                                </span>
                                <h4 className="font-semibold text-neutral-200 text-sm">{res.name}</h4>
                            </div>

                            <div className="mb-3">
                                <p className="text-xs text-neutral-400 line-clamp-3 leading-relaxed">
                                    {res.reason}
                                </p>
                            </div>

                            <div className="flex items-center gap-2 text-xs font-medium">
                                Verdict:
                                <span className={isApprove ? 'text-green-400' : 'text-red-400 uppercase'}>
                                    {res.decision}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Confirmation Footer */}
            <div className="p-4 border-t border-neutral-800 bg-neutral-900/30 flex flex-col items-center gap-3">
                <p className="text-xs text-neutral-500 text-center italic">
                    "I am choosing which AI output becomes authoritative."
                </p>
                <button
                    onClick={handleConfirm}
                    disabled={!selectedId}
                    className={`
                w-full py-3 rounded-lg font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2
                ${selectedId
                            ? 'bg-[#FA8112] text-white hover:bg-[#E06C00] shadow-lg shadow-[#FA8112]/20'
                            : 'bg-neutral-800 text-neutral-600 cursor-not-allowed'
                        }
            `}
                >
                    Confirm Selection <ChevronRight className="w-4 h-4" />
                </button>
            </div>

        </div>
    );
};
