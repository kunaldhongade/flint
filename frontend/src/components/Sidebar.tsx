import { useAppKit, useAppKitAccount } from '@reown/appkit/react';
import { ExternalLink, History, MessageSquare, Plus, Settings, Shield, Trash2 } from 'lucide-react';
import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router';
import flintLogo from '../assets/logo.svg';
import walletIcon from '../assets/wallet.svg';
import { deleteSession, getSessions } from '../lib/chatHistory';
import { DeleteConfirmModal } from './ui/DeleteConfirmModal';


interface SidebarProps {
    className?: string;
    onDeleteRequest?: (item: { id: string; title: string }) => void;
    onNewChatAlert?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ className = '', onDeleteRequest, onNewChatAlert }) => {
    const { isConnected } = useAppKitAccount();
    const location = useLocation();
    const navigate = useNavigate();

    const [history, setHistory] = React.useState<any[]>([]);

    const loadHistory = () => {
        // Dynamic import or local utility usage
        try {
            const raw = localStorage.getItem('flint_chat_sessions');
            const sessions = raw ? JSON.parse(raw) : [];
            // Sort by updated recently
            setHistory(sessions.sort((a: any, b: any) => b.updatedAt - a.updatedAt));
        } catch (e) {
            console.error("Failed to load history", e);
        }
    };

    React.useEffect(() => {
        loadHistory();
        window.addEventListener('storage-update', loadHistory);
        return () => window.removeEventListener('storage-update', loadHistory);
    }, []);

    return (
        <div className={`flex flex-col h-full text-neutral-300 w-64 ${className}`}>
            <NavLink to="/" className="p-4 flex items-center gap-3 hover:opacity-80 transition-opacity">
                <img src={flintLogo} alt="Flint" className="h-6 w-auto" />
                <span className="text-[10px] bg-[#FA8112]/20 text-[#FA8112] px-1.5 py-0.5 rounded border border-[#FA8112]/30 ml-auto">BETA</span>
            </NavLink>

            <div className="px-3 py-2">
                <button
                    onClick={() => {
                        // Check if we're already on a new/empty chat
                        const isOnNewChat = location.pathname === '/chat' && !location.search;

                        if (isOnNewChat) {
                            // Check if current chat has messages using localStorage
                            const tempMessages = localStorage.getItem('flint_temp_message_count');
                            const messageCount = tempMessages ? parseInt(tempMessages) : 1;

                            if (messageCount <= 1) {
                                // Inform user via callback to app level modal
                                onNewChatAlert?.();
                                return;
                            }
                        }

                        // Navigate to new chat with full page reload to clear state
                        window.location.href = '/chat';
                    }}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 border border-white/5 bg-neutral-800/50 hover:bg-neutral-800 text-[#FAF3E1] w-full shadow-sm group hover:border-white/10"
                >
                    <div className="p-1 bg-[#FA8112]/10 rounded-lg group-hover:bg-[#FA8112]/20 transition-colors">
                        <Plus className="w-4 h-4 text-[#FA8112]" />
                    </div>
                    <span className="font-medium text-sm">New Strategy</span>
                </button>
            </div>

            {/* Navigation */}
            <div className="px-3 py-2 flex flex-col gap-1">
                <div className="px-3 py-2 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Platform</div>

                <button
                    onClick={() => navigate('/chat', { replace: true })}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors w-full text-left ${location.pathname === '/chat' ? 'bg-[#FA8112]/10 text-[#FA8112]' : 'hover:bg-neutral-800 hover:text-[#FAF3E1]'}`}
                >
                    <MessageSquare className="w-4 h-4" />
                    <span>Agent Chat</span>
                </button>

                <NavLink
                    to="/trust"
                    className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${isActive ? 'bg-[#FA8112]/10 text-[#FA8112]' : 'hover:bg-neutral-800 hover:text-[#FAF3E1]'}`}
                >
                    <Shield className="w-4 h-4" />
                    <span>Trust Center</span>
                </NavLink>
            </div>

            {/* History Scroll Area */}
            <div className="flex-1 overflow-y-auto min-h-0 px-3 py-2">
                <div className="px-3 py-2 text-xs font-semibold text-neutral-500 uppercase tracking-wider flex items-center justify-between">
                    <span>History</span>
                    <History className="w-3 h-3" />
                </div>

                <div className="flex flex-col gap-1 mt-1">
                    {history.map((item, index) => (
                        <React.Fragment key={item.id}>
                            <div className="relative group/item">
                                <NavLink
                                    to={`/chat?session=${item.id}`}
                                    className={({ isActive }) => `text-left px-3 py-2 rounded-lg text-sm transition-colors truncate group relative block ${isActive && location.search === `?session=${item.id}` ? 'bg-neutral-800 text-[#FAF3E1]' : 'text-neutral-400 hover:bg-neutral-800 hover:text-[#FAF3E1]'}`}
                                >
                                    <span className="truncate block pr-8 font-medium">{item.title}</span>
                                    <span className="text-[10px] text-neutral-600 group-hover:text-neutral-500">
                                        {new Date(item.updatedAt).toLocaleDateString()}
                                    </span>
                                </NavLink>
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        onDeleteRequest?.({ id: item.id, title: item.title });
                                    }}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md bg-neutral-900 hover:bg-red-500/20 text-neutral-600 hover:text-red-400 transition-all opacity-0 group-hover/item:opacity-100"
                                    title="Delete chat"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            </div>
                            {/* Divider between items */}
                            {index < history.length - 1 && (
                                <div className="mx-3 border-t border-neutral-800/50"></div>
                            )}
                        </React.Fragment>
                    ))}
                </div>
            </div>

            <div className="p-3 border-t border-neutral-800 mt-auto">
                <FooterWallet />
            </div>
        </div>
    );
};

const FooterWallet = () => {
    const { isConnected, address } = useAppKitAccount();
    const { open } = useAppKit();

    const handleClick = () => {
        open();
    };

    return (
        <button
            onClick={handleClick}
            className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer group text-left"
        >
            <div className="w-8 h-8 flex items-center justify-center shrink-0">
                {isConnected ? <img src={walletIcon} alt="Wallet" className="w-6 h-6 text-white" /> : <div className="w-2 h-2 bg-white rounded-full"></div>}
            </div>
            <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-[#FAF3E1] truncate">
                    {isConnected ? `${address?.slice(0, 6)}...${address?.slice(-4)}` : 'Connect Wallet'}
                </div>
                <div className="text-[10px] text-neutral-500 truncate flex items-center gap-1">
                    {isConnected ? 'Active' : 'Click to connect'}
                </div>
            </div>
            {isConnected && <Settings className="w-4 h-4 text-neutral-500 group-hover:text-[#FAF3E1] transition-colors" />}
        </button>
    );
};
