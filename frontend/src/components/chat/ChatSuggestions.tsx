import { ArrowRight, Sparkles } from 'lucide-react';
import React from 'react';

interface Suggestion {
    id: string;
    text: string;
    icon?: React.ReactNode;
}

const SUGGESTIONS: Suggestion[] = [
    { id: 'onboard', text: 'Start Onboarding Flow', icon: <Sparkles className="w-3 h-3 text-[#FA8112]" /> },
    { id: 'balance', text: 'Check my balance' },
    { id: 'stake', text: 'How do I stake FLR?' },
    { id: 'swap', text: 'Swap 10 FLR to USDC' },
];

interface ChatSuggestionsProps {
    onSuggestionClick: (text: string) => void;
    isVisible: boolean;
    suggestions?: string[];
}

export const ChatSuggestions: React.FC<ChatSuggestionsProps> = ({ onSuggestionClick, isVisible, suggestions }) => {
    // Only show suggestions if we have dynamic ones from the backend
    if (!isVisible || !suggestions || suggestions.length === 0) return null;

    const displaySuggestions = suggestions.map((s, i) => ({
        id: `dyn-${i}`,
        text: s,
        // Add icon for first suggestion to make it stand out
        icon: i === 0 ? <Sparkles className="w-3 h-3 text-[#FA8112]" /> : undefined
    }));

    return (
        <div className="flex flex-wrap gap-2 mb-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {displaySuggestions.map((suggestion) => (
                <button
                    key={suggestion.id}
                    onClick={() => onSuggestionClick(suggestion.text)}
                    className="group flex items-center gap-2 px-3 py-2 bg-neutral-900/50 hover:bg-neutral-800 border border-neutral-800 rounded-xl transition-all hover:border-neutral-700 shadow-sm"
                >
                    {suggestion.icon}
                    <span className="text-xs text-neutral-400 group-hover:text-neutral-200 transition-colors">
                        {suggestion.text}
                    </span>
                    <ArrowRight className="w-3 h-3 text-neutral-600 group-hover:text-neutral-400 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                </button>
            ))}
        </div>
    );
};
