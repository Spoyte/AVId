import React, { useState } from 'react';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from './config/wagmi';
import { Header } from './components/Header';
import { DIDCreation } from './components/DIDCreation';
import { CredentialIssuance } from './components/CredentialIssuance';
import { ZKProofGeneration } from './components/ZKProofGeneration';
import { CrossChainVerification } from './components/CrossChainVerification';
import { Dashboard } from './components/Dashboard';
import '@rainbow-me/rainbowkit/styles.css';
import './index.css';

const queryClient = new QueryClient();

type Tab = 'dashboard' | 'create-did' | 'issue-credential' | 'zk-proof' | 'cross-chain';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'create-did':
        return <DIDCreation />;
      case 'issue-credential':
        return <CredentialIssuance />;
      case 'zk-proof':
        return <ZKProofGeneration />;
      case 'cross-chain':
        return <CrossChainVerification />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
            <Header />
            
            {/* Navigation */}
            <nav className="bg-white shadow-sm border-b">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex space-x-8">
                  {[
                    { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
                    { id: 'create-did', label: 'Create DID', icon: '🆔' },
                    { id: 'issue-credential', label: 'Issue Credential', icon: '📜' },
                    { id: 'zk-proof', label: 'ZK Proof', icon: '🔒' },
                    { id: 'cross-chain', label: 'Cross-Chain', icon: '🌉' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as Tab)}
                      className={`py-4 px-1 border-b-2 font-medium text-sm ${
                        activeTab === tab.id
                          ? 'border-indigo-500 text-indigo-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <span className="mr-2">{tab.icon}</span>
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            </nav>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
              <div className="px-4 py-6 sm:px-0">
                {renderContent()}
              </div>
            </main>

            {/* Footer */}
            <footer className="bg-white border-t mt-12">
              <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                <div className="text-center text-gray-500 text-sm">
                  <p>🆔 Avalanche ID - Self-Sovereign Identity Infrastructure</p>
                  <p className="mt-1">Built with ❤️ for Summit LONDON Avalanche Hackathon 2025</p>
                </div>
              </div>
            </footer>
          </div>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App; 