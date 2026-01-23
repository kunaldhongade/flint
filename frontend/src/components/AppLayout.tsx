import React, { ReactNode, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { deleteSession } from '../lib/chatHistory';
import { useError } from '../lib/ErrorContext';
import { useGlobalUI } from '../lib/GlobalUIContext';
import { ModelRunSelector } from './chat/ModelRunSelector';
import { Sidebar } from './Sidebar';
import { DeleteConfirmModal } from './ui/DeleteConfirmModal';
import { ErrorModal } from './ui/ErrorModal';
import { FilePreviewModal } from './ui/FilePreviewModal';
import { MessageModal } from './ui/MessageModal';

interface AppLayoutProps {
    children: ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const isLanding = location.pathname === '/';

    const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; title: string } | null>(null);
    const [isNewChatAlertOpen, setIsNewChatAlertOpen] = useState(false);
    const [isActiveDeleteAlertOpen, setIsActiveDeleteAlertOpen] = useState(false);
    const { error, clearError } = useError();
    const {
        filePreview, closeFilePreview,
        showModelSelector, closeModelSelector, modelSelectorOptions
    } = useGlobalUI();

    if (isLanding) {
        return <>{children}</>;
    }

    const handleDeleteRequest = (item: { id: string; title: string }) => {
        const isActive = location.search === `?session=${item.id}`;
        if (isActive) {
            setIsActiveDeleteAlertOpen(true);
        } else {
            setDeleteConfirm(item);
        }
    };

    const handleDeleteConfirm = () => {
        if (deleteConfirm) {
            deleteSession(deleteConfirm.id);
            if (location.search === `?session=${deleteConfirm.id}`) {
                navigate('/chat', { replace: true });
            }
            setDeleteConfirm(null);
        }
    };

    return (
        <div className="flex h-screen w-full bg-neutral-950 text-[#FAF3E1] overflow-hidden font-sans relative selection:bg-[#FA8112]/30">
            {/* Global Background Ambience */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#FA8112]/10 rounded-full blur-[100px] opacity-30"></div>
                <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-[#F5E7C6]/10 rounded-full blur-[100px] opacity-30"></div>
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
            </div>

            <Sidebar
                className="hidden md:flex flex-shrink-0 z-20 relative bg-neutral-900/80 backdrop-blur-xl border-r border-white/5"
                onDeleteRequest={handleDeleteRequest}
                onNewChatAlert={() => setIsNewChatAlertOpen(true)}
            />

            <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
                {/* Mobile Header Placeholder if needed */}
                {children}
            </main>

            {/* Global Modals - Rendered at App Level to guarantee full-screen fixed positioning */}
            <DeleteConfirmModal
                isOpen={deleteConfirm !== null}
                onClose={() => setDeleteConfirm(null)}
                onConfirm={handleDeleteConfirm}
                title={deleteConfirm?.title || ''}
            />

            <MessageModal
                isOpen={isNewChatAlertOpen}
                onClose={() => setIsNewChatAlertOpen(false)}
                title="Strategy Active"
                message="You're already on a new chat session."
            />

            <MessageModal
                isOpen={isActiveDeleteAlertOpen}
                onClose={() => setIsActiveDeleteAlertOpen(false)}
                title="Active Session"
                message="You cannot delete a chat that is currently running."
            />

            <ErrorModal
                isOpen={error !== null}
                onClose={clearError}
                error={error}
            />

            {showModelSelector && modelSelectorOptions && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <ModelRunSelector
                        onConfirm={(models) => {
                            modelSelectorOptions.onConfirm(models);
                            closeModelSelector();
                        }}
                        initialSelected={modelSelectorOptions.initialSelected}
                    />
                </div>
            )}

            {filePreview && (
                <FilePreviewModal
                    isOpen={true}
                    onClose={closeFilePreview}
                    file={filePreview}
                />
            )}
        </div>
    );
};
