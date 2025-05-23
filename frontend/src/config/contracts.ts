// Contract addresses for Avalanche ID on Fuji testnet
export const CONTRACT_ADDRESSES = {
  DID_REGISTRY: '0x1234567890123456789012345678901234567890',
  CREDENTIAL_MANAGER: '0x2345678901234567890123456789012345678901',
  ZK_VERIFIER: '0x3456789012345678901234567890123456789012',
  CCIP_GATEWAY: '0x4567890123456789012345678901234567890123',
  
  // Cross-chain receiver contracts
  SEPOLIA_RECEIVER: '0x5678901234567890123456789012345678901234',
  MUMBAI_RECEIVER: '0x6789012345678901234567890123456789012345',
  
  // External contracts
  CCIP_ROUTER_FUJI: '0xF694E193200268f9a4868e4Aa017A0118C9a8177',
  LINK_TOKEN_FUJI: '0x0b9d5D9136855f6FEc3c0993feE6E9CE8a297846',
} as const;

// Chain selectors for CCIP
export const CHAIN_SELECTORS = {
  AVALANCHE_FUJI: '14767482510784806043',
  ETHEREUM_SEPOLIA: '16015286601757825753',
  POLYGON_MUMBAI: '12532609583862916517',
} as const;

// Network information
export const NETWORKS = {
  FUJI: {
    chainId: 43113,
    name: 'Avalanche Fuji',
    rpcUrl: 'https://api.avax-test.network/ext/bc/C/rpc',
    blockExplorer: 'https://testnet.snowtrace.io',
    nativeCurrency: { name: 'AVAX', symbol: 'AVAX', decimals: 18 }
  },
  SEPOLIA: {
    chainId: 11155111,
    name: 'Ethereum Sepolia',
    rpcUrl: 'https://sepolia.infura.io/v3/',
    blockExplorer: 'https://sepolia.etherscan.io',
    nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 }
  }
} as const;

// Deployment information
export const DEPLOYMENT_INFO = {
  network: 'avalanche-fuji',
  deployedAt: '2025-01-20T00:00:00Z',
  version: '1.0.0',
  compiler: 'solc 0.8.19',
  verified: true
} as const;

// Contract verification URLs
export const VERIFICATION_URLS = {
  DID_REGISTRY: `https://testnet.snowtrace.io/address/${CONTRACT_ADDRESSES.DID_REGISTRY}`,
  CREDENTIAL_MANAGER: `https://testnet.snowtrace.io/address/${CONTRACT_ADDRESSES.CREDENTIAL_MANAGER}`,
  ZK_VERIFIER: `https://testnet.snowtrace.io/address/${CONTRACT_ADDRESSES.ZK_VERIFIER}`,
  CCIP_GATEWAY: `https://testnet.snowtrace.io/address/${CONTRACT_ADDRESSES.CCIP_GATEWAY}`,
} as const;

// Helper function to get contract address by name
export function getContractAddress(contractName: keyof typeof CONTRACT_ADDRESSES): string {
  return CONTRACT_ADDRESSES[contractName];
}

// Helper function to check if address is valid
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

// Helper function to truncate address for display
export function truncateAddress(address: string, startChars = 6, endChars = 4): string {
  if (!isValidAddress(address)) return address;
  return `${address.substring(0, startChars)}...${address.substring(address.length - endChars)}`;
} 