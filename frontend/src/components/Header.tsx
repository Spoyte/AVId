import React from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';

export function Header() {
  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <h1 className="text-2xl font-bold text-gray-900">
                🆔 Avalanche ID
              </h1>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">
                Self-Sovereign Identity Infrastructure
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Fuji Testnet
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                CCIP Enabled
              </span>
            </div>
            <ConnectButton />
          </div>
        </div>
      </div>
    </header>
  );
} 