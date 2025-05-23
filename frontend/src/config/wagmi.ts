import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { avalancheFuji, sepolia } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'Avalanche ID',
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'your-project-id',
  chains: [avalancheFuji, sepolia],
  ssr: false,
}); 