import { Brain, Check, Rocket, Sparkles, X, Zap } from 'lucide-react';
import React, { useState } from 'react';

interface ModelRunSelectorProps {
    onConfirm: (selectedModels: string[]) => void;
    initialSelected?: string[];
}

const AVAILABLE_MODELS = [
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', description: 'Fast, conservative, low latency.', icon: Zap, color: 'text-blue-400' },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', description: 'Deep reasoning & complex tasks.', icon: Brain, color: 'text-purple-400' },
    { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash', description: 'Next-gen speed & efficiency.', icon: Rocket, color: 'text-orange-400' },
];

export const ModelRunSelector: React.FC<ModelRunSelectorProps> = ({ onConfirm, initialSelected = [] }) => {
    const [selected, setSelected] = useState<string[]>(initialSelected);

    const toggleModel = (id: string) => {
        setSelected(prev =>
            prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
        );
    };

    const handleDeselectAll = () => setSelected([]);

    return (
        <div className="bg-neutral-900/90 border border-white/10 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] max-w-2xl w-full p-8 animate-in zoom-in-95 duration-300 relative backdrop-blur-xl">
            {/* Background Accent */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#FA8112]/10 rounded-full blur-[80px] pointer-events-none"></div>
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-blue-500/5 rounded-full blur-[80px] pointer-events-none"></div>

            {/* Close Button */}
            <button
                onClick={() => onConfirm(selected)}
                className="absolute top-6 right-6 p-2.5 hover:bg-white/5 rounded-full transition-all text-neutral-500 hover:text-white group active:scale-95"
            >
                <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center text-center mb-10 mt-4 relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FA8112]/10 border border-[#FA8112]/20 mb-4">
                    <Sparkles className="w-3.5 h-3.5 text-[#FA8112]" />
                    <span className="text-[10px] font-bold text-[#FA8112] tracking-[0.2em] uppercase">Intelligence Layer</span>
                </div>
                <h2 className="text-2xl font-black text-white mb-2 tracking-tight">Select AI Agents</h2>
                <p className="text-neutral-400 text-sm max-w-sm leading-relaxed">
                    Deploy parallel models for cross-verification, debate, and verifiable consensus.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10 px-2 relative z-10">
                {AVAILABLE_MODELS.map((model) => {
                    const isSelected = selected.includes(model.id);
                    const Icon = model.icon;
                    return (
                        <button
                            key={model.id}
                            onClick={() => toggleModel(model.id)}
                            className={`group relative p-5 rounded-2xl border transition-all duration-300 text-left ${isSelected
                                ? 'bg-[#FA8112]/10 border-[#FA8112]/40 shadow-[0_0_25px_rgba(250,129,18,0.1)]'
                                : 'bg-white/5 border-white/5 hover:border-white/10 hover:bg-white/10'
                                }`}
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className={`p-2 rounded-xl transition-colors ${isSelected ? 'bg-[#FA8112]/20' : 'bg-neutral-800'}`}>
                                    <Icon className={`w-5 h-5 ${isSelected ? 'text-[#FA8112]' : model.color}`} />
                                </div>
                                {isSelected && (
                                    <div className="bg-[#FA8112] rounded-full p-1 shadow-[0_0_10px_rgba(250,129,18,0.5)] animate-in zoom-in duration-300">
                                        <Check className="w-3 h-3 text-white" strokeWidth={4} />
                                    </div>
                                )}
                            </div>
                            <div>
                                <h3 className={`font-bold text-sm tracking-tight mb-1 transition-colors ${isSelected ? 'text-white' : 'text-neutral-200'}`}>
                                    {model.name}
                                </h3>
                                <p className="text-[11px] text-neutral-500 group-hover:text-neutral-400 transition-colors leading-relaxed">
                                    {model.description}
                                </p>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Action Row */}
            <div className="flex items-center justify-between mt-4 pb-2 px-2 relative z-10">
                <button
                    onClick={handleDeselectAll}
                    disabled={selected.length === 0}
                    className="text-[10px] font-bold text-neutral-500 hover:text-white transition-colors uppercase tracking-widest disabled:opacity-30 disabled:cursor-not-allowed"
                >
                    Clear All
                </button>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#FA8112] animate-pulse"></span>
                        <span className="text-[10px] text-neutral-300 uppercase tracking-widest font-bold">
                            {selected.length} Selected
                        </span>
                    </div>

                    <button
                        onClick={() => onConfirm(selected)}
                        className="px-6 py-2.5 bg-[#FA8112] hover:bg-[#ff8f29] text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(250,129,18,0.2)] hover:shadow-[0_0_30px_rgba(250,129,18,0.4)] active:scale-95"
                    >
                        Deploy Strategy
                    </button>
                </div>
            </div>
        </div>
    );
};

