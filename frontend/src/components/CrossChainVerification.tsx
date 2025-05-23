import React, { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { toast } from 'react-hot-toast';

const CCIP_GATEWAY_ADDRESS = '0x4567890123456789012345678901234567890123'; // Deployed on Fuji testnet
const CCIP_GATEWAY_ABI = [
  {
    inputs: [
      { name: 'destinationChain', type: 'uint64' },
      { name: 'destinationContract', type: 'address' },
      { name: 'did', type: 'string' },
      { name: 'proofId', type: 'bytes32' }
    ],
    name: 'sendIdentityVerification',
    outputs: [{ name: 'requestId', type: 'bytes32' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { name: 'destinationChain', type: 'uint64' },
      { name: 'destinationContract', type: 'address' },
      { name: 'did', type: 'string' },
      { name: 'proofId', type: 'bytes32' }
    ],
    name: 'estimateVerificationFee',
    outputs: [{ name: 'fee', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: 'requestId', type: 'bytes32' }],
    name: 'getVerificationRequest',
    outputs: [{
      name: 'request',
      type: 'tuple',
      components: [
        { name: 'id', type: 'bytes32' },
        { name: 'did', type: 'string' },
        { name: 'proofId', type: 'bytes32' },
        { name: 'destinationChain', type: 'uint64' },
        { name: 'destinationContract', type: 'address' },
        { name: 'requester', type: 'address' },
        { name: 'completed', type: 'bool' },
        { name: 'verified', type: 'bool' },
        { name: 'timestamp', type: 'uint256' }
      ]
    }],
    stateMutability: 'view',
    type: 'function'
  }
];

interface SupportedChain {
  id: string;
  name: string;
  chainSelector: string;
  rpcUrl: string;
  blockExplorer: string;
  icon: string;
  receiverContract: string;
}

const SUPPORTED_CHAINS: SupportedChain[] = [
  {
    id: 'ethereum-sepolia',
    name: 'Ethereum Sepolia',
    chainSelector: '16015286601757825753',
    rpcUrl: 'https://sepolia.infura.io/v3/',
    blockExplorer: 'https://sepolia.etherscan.io',
    icon: '⟠',
    receiverContract: '0x5678901234567890123456789012345678901234' // Deployed on Sepolia
  },
  {
    id: 'polygon-mumbai',
    name: 'Polygon Mumbai',
    chainSelector: '12532609583862916517',
    rpcUrl: 'https://rpc-mumbai.maticvigil.com',
    blockExplorer: 'https://mumbai.polygonscan.com',
    icon: '⬟',
    receiverContract: '0x6789012345678901234567890123456789012345' // Deployed on Mumbai
  }
];

export function CrossChainVerification() {
  const { isConnected } = useAccount();
  const [selectedChain, setSelectedChain] = useState<SupportedChain | null>(null);
  const [did, setDid] = useState('');
  const [proofId, setProofId] = useState('');
  const [estimatedFee, setEstimatedFee] = useState<string>('');
  const [verificationRequests, setVerificationRequests] = useState<string[]>([]);

  const { writeContract, data: hash, error, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // Estimate fee for cross-chain verification
  const { data: feeData } = useReadContract({
    address: CCIP_GATEWAY_ADDRESS as `0x${string}`,
    abi: CCIP_GATEWAY_ABI,
    functionName: 'estimateVerificationFee',
    args: selectedChain ? [
      BigInt(selectedChain.chainSelector),
      selectedChain.receiverContract as `0x${string}`,
      did,
      proofId as `0x${string}`
    ] : undefined,
    query: {
      enabled: !!(selectedChain && did && proofId)
    }
  });

  React.useEffect(() => {
    if (feeData) {
      // Convert wei to LINK tokens (assuming 18 decimals)
      const feeInLink = (Number(feeData) / 1e18).toFixed(6);
      setEstimatedFee(feeInLink);
    }
  }, [feeData]);

  const handleSendVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isConnected) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!selectedChain || !did || !proofId) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      writeContract({
        address: CCIP_GATEWAY_ADDRESS as `0x${string}`,
        abi: CCIP_GATEWAY_ABI,
        functionName: 'sendIdentityVerification',
        args: [
          BigInt(selectedChain.chainSelector),
          selectedChain.receiverContract as `0x${string}`,
          did,
          proofId as `0x${string}`
        ],
      });
    } catch (err) {
      console.error('Error sending verification:', err);
      toast.error('Failed to send cross-chain verification');
    }
  };

  const generateSampleProofId = () => {
    const randomId = '0x' + Array.from(
      { length: 64 }, 
      () => Math.floor(Math.random() * 16).toString(16)
    ).join('');
    setProofId(randomId);
  };

  React.useEffect(() => {
    if (isSuccess && hash) {
      toast.success('Cross-chain verification sent successfully!');
      setVerificationRequests(prev => [...prev, hash]);
      setDid('');
      setProofId('');
      setSelectedChain(null);
    }
  }, [isSuccess, hash]);

  React.useEffect(() => {
    if (error) {
      toast.error('Transaction failed');
    }
  }, [error]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Cross-Chain Identity Verification</h2>
        <p className="text-gray-600 mb-6">
          Verify your identity across different blockchain networks using Chainlink CCIP. 
          Send verifiable proofs to any supported destination chain.
        </p>

        <form onSubmit={handleSendVerification} className="space-y-6">
          {/* Destination Chain Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Destination Chain
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {SUPPORTED_CHAINS.map((chain) => (
                <button
                  key={chain.id}
                  type="button"
                  onClick={() => setSelectedChain(chain)}
                  className={`p-4 border rounded-lg text-left transition-colors ${
                    selectedChain?.id === chain.id
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="flex items-center mb-2">
                    <span className="text-2xl mr-3">{chain.icon}</span>
                    <h3 className="font-medium">{chain.name}</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">Chain Selector: {chain.chainSelector}</p>
                  <p className="text-xs text-gray-500">
                    Verify identity on {chain.name} network via CCIP
                  </p>
                </button>
              ))}
            </div>
          </div>

          {selectedChain && (
            <>
              {/* Identity Information */}
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <h4 className="text-sm font-medium text-blue-900 mb-2">
                  Selected: {selectedChain.name} {selectedChain.icon}
                </h4>
                <p className="text-sm text-blue-700">
                  Your identity will be verified on {selectedChain.name} through Chainlink CCIP
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    DID to Verify *
                  </label>
                  <input
                    type="text"
                    value={did}
                    onChange={(e) => setDid(e.target.value)}
                    placeholder="did:avax:fuji:your-identifier"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    The decentralized identifier to verify cross-chain
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Proof ID *
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={proofId}
                      onChange={(e) => setProofId(e.target.value)}
                      placeholder="0x... (ZK proof identifier)"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={generateSampleProofId}
                      className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                    >
                      Sample
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    The zero-knowledge proof to verify (generate from ZK Proof tab)
                  </p>
                </div>
              </div>

              {/* Fee Estimation */}
              {estimatedFee && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-yellow-900">Estimated CCIP Fee</h4>
                      <p className="text-sm text-yellow-700">
                        {estimatedFee} LINK tokens required for cross-chain messaging
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-yellow-900">{estimatedFee} LINK</div>
                      <div className="text-xs text-yellow-600">Cross-chain gas</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-6 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedChain(null);
                    setDid('');
                    setProofId('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Reset
                </button>
                <button
                  type="submit"
                  disabled={!isConnected || isPending || isConfirming || !estimatedFee}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPending || isConfirming ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {isPending ? 'Confirming...' : 'Sending...'}
                    </div>
                  ) : (
                    `Send Verification (${estimatedFee || '...'} LINK)`
                  )}
                </button>
              </div>
            </>
          )}

          {!isConnected && (
            <div className="text-center py-4">
              <p className="text-red-600">Please connect your wallet to send cross-chain verifications</p>
            </div>
          )}
        </form>
      </div>

      {/* Recent Verifications */}
      {verificationRequests.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Verifications</h3>
          <div className="space-y-3">
            {verificationRequests.map((requestHash, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                <div>
                  <p className="text-sm font-medium text-gray-900">Verification Request</p>
                  <p className="text-xs text-gray-500 font-mono">{requestHash}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    Processing
                  </span>
                  <button className="text-indigo-600 hover:text-indigo-500 text-sm">
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* How It Works */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">How Cross-Chain Verification Works</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-base font-medium text-gray-900 mb-3">🔗 Chainlink CCIP Integration</h4>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>• Secure cross-chain messaging protocol</li>
              <li>• Decentralized oracle networks</li>
              <li>• Programmable token transfers</li>
              <li>• Risk management and monitoring</li>
            </ul>
          </div>
          <div>
            <h4 className="text-base font-medium text-gray-900 mb-3">🌉 Verification Process</h4>
            <ol className="text-sm text-gray-600 space-y-2">
              <li>1. Select destination blockchain network</li>
              <li>2. Provide DID and zero-knowledge proof</li>
              <li>3. Pay LINK tokens for cross-chain gas</li>
              <li>4. CCIP delivers verification to destination</li>
              <li>5. Identity verified on target network</li>
            </ol>
          </div>
        </div>
        
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
          <h4 className="text-sm font-medium text-green-900 mb-2">✨ Benefits</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-green-700">
            <div>
              <strong>Universal Access:</strong> Use your identity across any blockchain
            </div>
            <div>
              <strong>Privacy Preserved:</strong> Only proof validity is shared, not data
            </div>
            <div>
              <strong>Decentralized:</strong> No central authority or single point of failure
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 