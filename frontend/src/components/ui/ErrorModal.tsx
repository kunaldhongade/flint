import { ChevronDown, ChevronUp, X } from 'lucide-react';
import React, { useState } from 'react';

interface ErrorModalProps {
    isOpen: boolean;
    onClose: () => void;
    error: {
        message: string;
        detail?: string;
    } | null;
}

export const ErrorModal: React.FC<ErrorModalProps> = ({ isOpen, onClose, error }) => {
    const [showDetail, setShowDetail] = useState(false);

    if (!isOpen || !error) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-neutral-900 border border-white/10 rounded-2xl shadow-2xl max-w-[320px] w-full animate-in zoom-in-95 duration-300 relative">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-1 rounded-lg hover:bg-neutral-800 transition-colors text-neutral-500 hover:text-white"
                >
                    <X className="w-4 h-4" />
                </button>

                <div className="p-8 pb-6 text-center">
                    <h2 className="text-xs font-bold text-[#FAF3E1] mb-2 tracking-widest uppercase">Something went wrong</h2>
                    <p className="text-neutral-500 text-sm leading-relaxed mb-6">
                        We encountered an unexpected issue.
                    </p>

                    {/* Action Row */}
                    <div className="flex items-center justify-center gap-6 mb-2">
                        <a
                            href="https://x.com/KunalDhongade"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] font-bold text-[#FA8112] hover:text-[#FA8112]/80 transition-colors uppercase tracking-widest"
                        >
                            Contact
                        </a>

                        <button
                            onClick={() => setShowDetail(!showDetail)}
                            className="text-[10px] font-bold text-neutral-400 hover:text-white transition-colors uppercase tracking-widest flex items-center gap-1"
                        >
                            Details
                            {showDetail ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                    </div>
                </div>

                {/* Error Details Section */}
                {showDetail && (
                    <div className="px-6 pb-8 animate-in slide-in-from-top-2 duration-300">
                        <div className="p-4 bg-black/40 border border-white/5 rounded-xl overflow-hidden">
                            <div className="text-[10px] uppercase tracking-widest text-neutral-600 mb-2 font-bold">Issue Detected</div>
                            <div className="text-[11px] text-red-500/70 font-mono break-all leading-relaxed max-h-[100px] overflow-y-auto custom-scrollbar">
                                {error.detail || error.message || 'No detailed information available.'}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
