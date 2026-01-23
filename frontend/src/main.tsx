import "@/index.css";
import { createAppKit } from '@reown/appkit/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router';
import { WagmiProvider } from 'wagmi';
import { AppLayout } from './components/AppLayout';
import ChatInterface from './components/ChatInterface';
import NotFound from './components/NotFound';
import TrustView from './components/TrustView';
import { metadata, networks, projectId, wagmiAdapter } from './config';
import LandingPage from './LandingPage';
import { ErrorProvider } from './lib/ErrorContext';
import { GlobalUIProvider } from './lib/GlobalUIContext';

const queryClient = new QueryClient()

const generalConfig = {
  projectId,
  networks,
  metadata,
  themeMode: 'dark' as const,
  themeVariables: {
    '--w3m-accent': '#0a0a0a', // neutral-950
  }
}

createAppKit({
  adapters: [wagmiAdapter],
  ...generalConfig,
  features: {
    analytics: true
  }
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ErrorProvider>
            <GlobalUIProvider>
              <AppLayout>
                <Routes>
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/chat" element={<ChatInterface />} />
                  <Route path="/trust" element={<TrustView />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </AppLayout>
            </GlobalUIProvider>
          </ErrorProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>
)
