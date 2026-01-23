import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronDown, FileText, Paperclip, Send, Shield, X } from 'lucide-react';
import React, { useMemo, useRef } from 'react';
import { useError } from '../../lib/ErrorContext';
import { FilePreviewModal } from '../ui/FilePreviewModal';

interface ChatInputProps {
    onSend: (text: string, file: File | null) => void;
    isLoading: boolean;
    placeholder?: string;
    selectedModels?: string[] | null;
    onModelChange?: () => void;
    onPreviewRequest?: (file: File) => void;
    onVerify?: () => void;
    canVerify?: boolean;
}

const AVAILABLE_MODELS = [
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', maxSizeMB: 5 },
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', maxSizeMB: 10 },
    { id: 'gemini-2.5-vision', name: 'Gemini 2.5 Vision', maxSizeMB: 20 },
    { id: 'gemini-3.0-flash', name: 'Gemini 3.0 Flash', maxSizeMB: 5 },
    { id: 'gemini-3.0-pro', name: 'Gemini 3.0 Pro', maxSizeMB: 10 },
    { id: 'gemini-3.5-ultra', name: 'Gemini 3.5 Ultra', maxSizeMB: 20 },
];

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, isLoading, placeholder, selectedModels, onModelChange, onPreviewRequest, onVerify, canVerify }) => {
    const [text, setText] = React.useState('');
    const [file, setFile] = React.useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { showError } = useError();

    const fileUrl = useMemo(() => {
        if (!file) return null;
        return URL.createObjectURL(file);
    }, [file]);

    const currentLimitMB = useMemo(() => {
        if (!selectedModels || selectedModels.length === 0) return 10; // Default
        const limits = selectedModels.map(id => AVAILABLE_MODELS.find(m => m.id === id)?.maxSizeMB || 10);
        return Math.min(...limits); // Use the most restrictive model's limit
    }, [selectedModels]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!text.trim() && !file) return;
        onSend(text, file);
        setText('');
        setFile(null);
    };

    const validateFile = (selectedFile: File): boolean => {
        const fileSizeMB = selectedFile.size / (1024 * 1024);
        if (fileSizeMB > currentLimitMB) {
            showError({
                message: "File Too Large",
                detail: `The selected models have a combined limit of ${currentLimitMB}MB. This file is ${fileSizeMB.toFixed(1)}MB.`
            });
            return false;
        }
        return true;
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile && validateFile(selectedFile)) {
            setFile(selectedFile);
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        const item = e.clipboardData.items[0];
        if (item?.type.startsWith('image/')) {
            const pastedFile = item.getAsFile();
            if (pastedFile && validateFile(pastedFile)) {
                setFile(pastedFile);
            }
        }
    };

    const getModelNames = () => {
        if (!selectedModels || selectedModels.length === 0) return 'No models selected';

        const displayedModels = selectedModels.slice(0, 3);
        const remainingCount = selectedModels.length - displayedModels.length;

        const names = displayedModels
            .map(id => AVAILABLE_MODELS.find(m => m.id === id)?.name || id)
            .join(', ');

        return remainingCount > 0 ? `${names} +${remainingCount} more` : names;
    };

    return (
        <div className="max-w-3xl mx-auto w-full px-4 pb-4">
            {/* File Preview */}
            {file && (
                <div className="mb-2 inline-flex items-center gap-2 pr-1 pl-3 py-1 bg-neutral-900 border border-neutral-800 rounded-xl shadow-xl animate-in fade-in slide-in-from-bottom-2 group/preview">
                    <button
                        type="button"
                        onClick={() => {
                            if (!fileUrl) return;
                            if (file.type.startsWith('image/')) {
                                if (onPreviewRequest) onPreviewRequest(file);
                            } else {
                                window.open(fileUrl, '_blank');
                            }
                        }}
                        className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                    >
                        {file.type.startsWith('image/') ? (
                            <div className="w-8 h-8 rounded-lg bg-neutral-800 overflow-hidden ring-1 ring-white/10 shrink-0">
                                <img src={fileUrl || undefined} alt="Preview" className="w-full h-full object-cover" />
                            </div>
                        ) : (
                            <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center shrink-0 border border-neutral-700">
                                <FileText className="w-4 h-4 text-[#FA8112]" />
                            </div>
                        )}
                        <div className="flex flex-col text-left">
                            <span className="text-[11px] font-medium text-[#FAF3E1] max-w-[120px] truncate leading-tight">{file.name}</span>
                            <span className="text-[9px] text-neutral-500 uppercase tracking-wider font-semibold leading-tight">{(file.size / 1024).toFixed(1)} KB</span>
                        </div>
                    </button>
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setFile(null);
                            if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-600 hover:text-white transition-all ml-1"
                        title="Remove file"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            {/* Input Area */}
            <form onSubmit={handleSubmit} className="relative flex items-end gap-2 bg-neutral-900/60 backdrop-blur-xl p-2 rounded-2xl border border-white/10 focus-within:border-white/20 focus-within:ring-1 focus-within:ring-white/20 transition-all shadow-lg">
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-neutral-400 hover:text-white transition-colors rounded-xl hover:bg-neutral-800"
                    title="Attach file"
                >
                    <Paperclip className="w-5 h-5" />
                </button>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    className="hidden"
                />

                <div className="flex-1 py-2">
                    <Input
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onPaste={handlePaste}
                        placeholder={placeholder || "Ask Flint to analyze, swap, or stake..."}
                        className="w-full border-0 bg-transparent p-0 text-white placeholder:text-neutral-500 focus-visible:ring-0 shadow-none h-auto min-h-[24px]"
                        disabled={isLoading}
                        autoComplete="off"
                    />
                </div>

                <Button
                    type="submit"
                    disabled={(!text.trim() && !file) || isLoading}
                    className={`rounded-xl h-10 w-10 p-0 transition-all ${text.trim() || file ? 'bg-[#FA8112] text-white hover:bg-[#E06C00]' : 'bg-neutral-800 text-neutral-500'
                        }`}
                >
                    <Send className="w-4 h-4" />
                </Button>

                {onVerify && (
                    <Button
                        type="button"
                        onClick={onVerify}
                        disabled={!canVerify || isLoading}
                        className={`rounded-xl h-10 px-3 flex items-center gap-2 transition-all ${canVerify ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-600/30' : 'bg-neutral-800/50 text-neutral-600 border border-neutral-700/50 cursor-not-allowed opacity-50'}`}
                        title="Verify and create proof for your AI decisions"
                    >
                        <Shield className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">Verify & Proof</span>
                    </Button>
                )}
            </form>

            {/* Model Selector Dropdown */}
            {selectedModels && selectedModels.length > 0 && (
                <div className="mt-2 flex items-center justify-between text-xs">
                    <button
                        onClick={onModelChange}
                        className="flex items-center gap-2 px-3 py-1.5 bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-800 rounded-lg transition-colors text-neutral-400 hover:text-neutral-200 max-w-[80%]"
                    >
                        <span className="text-neutral-500 shrink-0">Models:</span>
                        <span className="text-neutral-300 font-medium truncate">{getModelNames()}</span>
                        <ChevronDown className="w-3 h-3 shrink-0" />
                    </button>
                    <span className="text-neutral-500 flex items-center gap-1.5">
                        <Shield className="w-3 h-3" />
                        Verifiable on Flare
                    </span>
                </div>
            )}

            {/* Fallback message if no models */}
            {(!selectedModels || selectedModels.length === 0) && (
                <div className="text-center mt-3">
                    <button
                        onClick={onModelChange}
                        className="text-[12px] text-[#FA8112] hover:text-[#E06C00] transition-colors"
                    >
                        Select Multiple AI models to start →
                    </button>
                </div>
            )}
        </div>
    );
};
