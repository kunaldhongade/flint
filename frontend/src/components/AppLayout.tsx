import React, { ReactNode } from 'react';
import { useLocation } from 'react-router';
import { Sidebar } from './Sidebar';

interface AppLayoutProps {
    children: ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
    const location = useLocation();
    const isLanding = location.pathname === '/';

    if (isLanding) {
        return <>{children}</>;
    }

    return (
        <div className="flex h-screen w-full bg-neutral-950 text-[#FAF3E1] overflow-hidden font-sans relative selection:bg-[#FA8112]/30">
            {/* Global Background Ambience */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#FA8112]/10 rounded-full blur-[100px] opacity-30"></div>
                <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-[#F5E7C6]/10 rounded-full blur-[100px] opacity-30"></div>
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
            </div>

            <Sidebar className="hidden md:flex flex-shrink-0 z-20 relative bg-neutral-900/80 backdrop-blur-xl border-r border-white/5" />

            <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
                {/* Mobile Header Placeholder if needed */}
                {children}
            </main>
        </div>
    );
};
