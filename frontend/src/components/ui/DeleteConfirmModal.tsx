import { X } from 'lucide-react';
import React from 'react';

interface DeleteConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({ isOpen, onClose, onConfirm, title }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-neutral-900 border border-white/10 rounded-2xl shadow-2xl max-w-[320px] w-full animate-in zoom-in-95 duration-300 relative">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-1 rounded-lg hover:bg-neutral-800 transition-colors text-neutral-500 hover:text-white"
                >
                    <X className="w-4 h-4" />
                </button>

                <div className="p-8 pb-6 text-center">
                    <h2 className="text-xs font-bold text-[#FAF3E1] mb-2 tracking-widest uppercase">Delete Chat</h2>
                    <p className="text-neutral-500 text-sm leading-relaxed mb-6 px-2">
                        Are you sure you want to delete <span className="text-[#FAF3E1]">"{title}"</span>? This action cannot be undone.
                    </p>

                    {/* Action Row */}
                    <div className="flex items-center justify-center gap-8">
                        <button
                            onClick={onClose}
                            className="text-[10px] font-bold text-neutral-500 hover:text-neutral-300 transition-colors uppercase tracking-widest"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => {
                                onConfirm();
                                onClose();
                            }}
                            className="text-[10px] font-bold text-red-500 hover:text-red-400 transition-colors uppercase tracking-widest"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
