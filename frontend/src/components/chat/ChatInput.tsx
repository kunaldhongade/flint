import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileText, Image as ImageIcon, Paperclip, Send, Shield, X } from 'lucide-react';
import React, { useRef } from 'react';

interface ChatInputProps {
    onSend: (text: string, file: File | null) => void;
    isLoading: boolean;
    placeholder?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, isLoading, placeholder }) => {
    const [text, setText] = React.useState('');
    const [file, setFile] = React.useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!text.trim() && !file) return;
        onSend(text, file);
        setText('');
        setFile(null);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            setFile(e.target.files[0]);
        }
    };

    return (
        <div className="max-w-3xl mx-auto w-full px-4 pb-4">
            {/* File Preview */}
            {file && (
                <div className="mb-2 inline-flex items-center gap-2 px-3 py-2 bg-neutral-800 rounded-lg border border-neutral-700 animate-in fade-in slide-in-from-bottom-2">
                    {file.type.startsWith('image/') ? (
                        <div className="w-8 h-8 rounded bg-neutral-700 overflow-hidden">
                            <img src={URL.createObjectURL(file)} alt="Preview" className="w-full h-full object-cover" />
                        </div>
                    ) : (
                        <div className="w-8 h-8 rounded bg-neutral-700 flex items-center justify-center">
                            <FileText className="w-4 h-4 text-neutral-400" />
                        </div>
                    )}
                    <div className="flex flex-col">
                        <span className="text-xs font-medium text-white max-w-[150px] truncate">{file.name}</span>
                        <span className="text-[10px] text-neutral-400">{(file.size / 1024).toFixed(1)} KB</span>
                    </div>
                    <button
                        onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                        className="ml-2 w-5 h-5 rounded-full flex items-center justify-center hover:bg-neutral-600 text-neutral-400 transition-colors"
                    >
                        <X className="w-3 h-3" />
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
                        placeholder={placeholder || "Ask Flint to analyze, swap, or stake..."}
                        className="w-full border-0 bg-transparent p-0 text-white placeholder:text-neutral-500 focus-visible:ring-0 shadow-none h-auto min-h-[24px]"
                        disabled={isLoading}
                        autoComplete="off"
                    />
                </div>

                <Button
                    type="submit"
                    disabled={(!text.trim() && !file) || isLoading}
                    className={`rounded-xl h-10 w-10 p-0 transition-all ${text.trim() || file ? 'bg-blue-600 text-white hover:bg-blue-500' : 'bg-neutral-800 text-neutral-500'
                        }`}
                >
                    <Send className="w-4 h-4" />
                </Button>
            </form>

            <div className="text-center mt-3">
                <span className="text-[10px] text-neutral-500 flex items-center justify-center gap-1.5">
                    <Shield className="w-3 h-3" />
                    AI decisions are verifiable on Flare Network
                </span>
            </div>
        </div>
    );
};
