import { Check, X } from 'lucide-react';
import React, { useState } from 'react';

interface ModelRunSelectorProps {
    onConfirm: (selectedModels: string[]) => void;
    initialSelected?: string[];
}

const AVAILABLE_MODELS = [
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: 'Fast, conservative, low latency.' },
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', description: 'Deep reasoning & complex tasks.' },
    { id: 'gemini-2.5-vision', name: 'Gemini 2.5 Vision', description: 'Multimodal analysis capabilities.' },
    { id: 'gemini-3.0-flash', name: 'Gemini 3.0 Flash', description: 'Next-gen speed & efficiency.' },
    { id: 'gemini-3.0-pro', name: 'Gemini 3.0 Pro', description: 'Advanced reasoning engine.' },
    { id: 'gemini-3.5-ultra', name: 'Gemini 3.5 Ultra', description: 'State-of-the-art intelligence.' },
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
        <div className="bg-neutral-900 border border-white/10 rounded-2xl shadow-2xl max-w-2xl w-full p-8 animate-in zoom-in-95 duration-200 relative">
            {/* Close Button */}
            <button
                onClick={() => onConfirm(selected)}
                className="absolute top-6 right-6 p-2 hover:bg-neutral-800 rounded-full transition-colors text-neutral-500 hover:text-white"
            >
                <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center text-center mb-10 mt-4">
                <h2 className="text-xs font-bold text-[#FAF3E1] mb-2 tracking-widest uppercase">Intelligence Agents</h2>
                <p className="text-neutral-500 text-sm max-w-xs leading-relaxed">Choose multiple models for parallel debate and flare verification.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-10 px-2">
                {AVAILABLE_MODELS.map((model) => (
                    <button
                        key={model.id}
                        onClick={() => toggleModel(model.id)}
                        className={`group relative p-4 rounded-xl border transition-all duration-300 text-left ${selected.includes(model.id)
                            ? 'bg-[#FA8112]/5 border-[#FA8112]/50 shadow-[0_0_20px_rgba(250,129,18,0.05)]'
                            : 'bg-neutral-800/30 border-white/5 hover:border-white/10 hover:bg-neutral-800/50'
                            }`}
                    >
                        <div className="flex items-center justify-between mb-1.5">
                            <span className={`font-semibold text-xs tracking-wide transition-colors ${selected.includes(model.id) ? 'text-[#FA8112]' : 'text-[#FAF3E1]'}`}>
                                {model.name}
                            </span>
                            {selected.includes(model.id) && (
                                <Check className="w-3 h-3 text-[#FA8112] animate-in zoom-in duration-200" />
                            )}
                        </div>
                        <p className="text-[10px] text-neutral-500 group-hover:text-neutral-400 transition-colors leading-relaxed">
                            {model.description}
                        </p>
                    </button>
                ))}
            </div>

            {/* Action Row */}
            <div className="flex items-center justify-center gap-12 mt-4 pb-2">
                <button
                    onClick={handleDeselectAll}
                    className="text-[10px] font-bold text-neutral-500 hover:text-neutral-300 transition-colors uppercase tracking-widest"
                >
                    Deselect All
                </button>

                <div className="h-4 w-[1px] bg-white/5"></div>

                <div className="flex items-center gap-6">
                    <span className="text-[10px] text-neutral-600 uppercase tracking-widest font-bold">
                        {selected.length} Active
                    </span>
                    <button
                        onClick={() => onConfirm(selected)}
                        className="text-[10px] font-bold text-[#FA8112] hover:text-[#FA8112]/80 transition-colors uppercase tracking-widest"
                    >
                        Confirm Choice
                    </button>
                </div>
            </div>
        </div>
    );
};
