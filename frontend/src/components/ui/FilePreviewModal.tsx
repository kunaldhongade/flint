import { X } from 'lucide-react';
import React from 'react';

interface FilePreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    file: File | null;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({ isOpen, onClose, file }) => {
    if (!isOpen || !file) return null;

    const isImage = file.type.startsWith('image/');
    const fileUrl = URL.createObjectURL(file);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-neutral-950/90 backdrop-blur-md animate-in fade-in duration-300">
            {/* Header Actions */}
            <div className="absolute top-0 left-0 right-0 p-8 flex items-center justify-between z-10 backdrop-blur-sm bg-neutral-950/20">
                <div className="flex flex-col">
                    <h3 className="text-[#FAF3E1] font-bold text-xs uppercase tracking-widest truncate max-w-[200px] md:max-w-md">
                        {file.name}
                    </h3>
                    <p className="text-neutral-600 text-[10px] uppercase tracking-wider mt-1">
                        {(file.size / 1024).toFixed(1)} KB • {file.type.split('/')[1] || file.type}
                    </p>
                </div>

                <div className="flex items-center gap-8">
                    <a
                        href={fileUrl}
                        download={file.name}
                        className="text-[10px] font-bold text-[#FA8112] hover:text-[#FA8112]/80 transition-colors uppercase tracking-widest"
                    >
                        Download
                    </a>
                    <button
                        onClick={onClose}
                        className="text-[10px] font-bold text-neutral-400 hover:text-white transition-colors uppercase tracking-widest"
                    >
                        Close
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="relative w-full h-full flex items-center justify-center p-8 md:p-24 animate-in zoom-in-95 duration-500">
                {isImage ? (
                    <img
                        src={fileUrl}
                        alt={file.name}
                        className="max-w-full max-h-full object-contain rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/5"
                    />
                ) : (
                    <div className="flex flex-col items-center gap-8 p-12 bg-neutral-900 border border-white/10 rounded-2xl shadow-2xl max-w-[320px] w-full text-center">
                        <div className="w-16 h-16 bg-neutral-800 rounded-2xl flex items-center justify-center mb-2 border border-white/5 font-mono text-xl font-bold text-[#FA8112] uppercase">
                            {file.name.split('.').pop()}
                        </div>
                        <div>
                            <h4 className="text-xs font-bold text-[#FAF3E1] mb-2 uppercase tracking-widest">{file.name}</h4>
                            <p className="text-neutral-500 text-xs leading-relaxed mb-8">This file type cannot be previewed. Please download to view.</p>

                            <a
                                href={fileUrl}
                                download={file.name}
                                className="text-[10px] font-bold text-[#FA8112] hover:text-[#FA8112]/80 transition-colors uppercase tracking-widest"
                            >
                                Get File
                            </a>
                        </div>
                    </div>
                )}
            </div>

            {/* Backdrop Tap to Close */}
            <div
                className="absolute inset-0 -z-10"
                onClick={onClose}
            />
        </div>
    );
};
