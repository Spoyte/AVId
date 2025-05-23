import React, { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { toast } from 'react-hot-toast';

const DID_REGISTRY_ADDRESS = '0x1234567890123456789012345678901234567890'; // Deployed on Fuji testnet
const DID_REGISTRY_ABI = [
  {
    inputs: [
      { name: 'identifier', type: 'string' },
      { name: 'publicKey', type: 'string' }
    ],
    name: 'createDID',
    outputs: [{ name: 'did', type: 'string' }],
    stateMutability: 'nonpayable',
    type: 'function'
  }
];

export function DIDCreation() {
  const { address, isConnected } = useAccount();
  const [identifier, setIdentifier] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const { writeContract, data: hash, error, isPending } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const generatePublicKey = () => {
    // For demo purposes, generate a random hex string
    const randomKey = '0x' + Array.from(
      { length: 64 }, 
      () => Math.floor(Math.random() * 16).toString(16)
    ).join('');
    setPublicKey(randomKey);
  };

  const handleCreateDID = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isConnected) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!identifier || !publicKey) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsCreating(true);

    try {
      writeContract({
        address: DID_REGISTRY_ADDRESS as `0x${string}`,
        abi: DID_REGISTRY_ABI,
        functionName: 'createDID',
        args: [identifier, publicKey],
      });
    } catch (err) {
      console.error('Error creating DID:', err);
      toast.error('Failed to create DID');
      setIsCreating(false);
    }
  };

  React.useEffect(() => {
    if (isSuccess) {
      toast.success('DID created successfully!');
      setIsCreating(false);
      setIdentifier('');
      setPublicKey('');
    }
  }, [isSuccess]);

  React.useEffect(() => {
    if (error) {
      toast.error('Transaction failed');
      setIsCreating(false);
    }
  }, [error]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Create Decentralized Identifier</h2>
          <p className="mt-2 text-gray-600">
            Create your W3C-compliant DID on the Avalanche network. Your DID will be in the format:
            <code className="bg-gray-100 px-2 py-1 rounded text-sm ml-1">
              did:avax:fuji:{identifier}
            </code>
          </p>
        </div>

        <form onSubmit={handleCreateDID} className="space-y-6">
          <div>
            <label htmlFor="identifier" className="block text-sm font-medium text-gray-700 mb-2">
              DID Identifier
            </label>
            <input
              type="text"
              id="identifier"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Enter a unique identifier (e.g., your-username)"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
            <p className="mt-1 text-sm text-gray-500">
              Choose a unique identifier that will be part of your DID
            </p>
          </div>

          <div>
            <label htmlFor="publicKey" className="block text-sm font-medium text-gray-700 mb-2">
              Public Key
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                id="publicKey"
                value={publicKey}
                onChange={(e) => setPublicKey(e.target.value)}
                placeholder="Your public key in hex format"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
              <button
                type="button"
                onClick={generatePublicKey}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:ring-2 focus:ring-gray-500"
              >
                Generate
              </button>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Your verification method public key (click Generate for demo)
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Preview</h4>
            <p className="text-sm text-blue-700">
              Your DID will be: <code className="font-mono">did:avax:fuji:{identifier || '{identifier}'}</code>
            </p>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => {
                setIdentifier('');
                setPublicKey('');
              }}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Clear
            </button>
            <button
              type="submit"
              disabled={!isConnected || isPending || isConfirming || isCreating}
              className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending || isConfirming || isCreating ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {isPending ? 'Confirming...' : 'Creating DID...'}
                </div>
              ) : (
                'Create DID'
              )}
            </button>
          </div>

          {!isConnected && (
            <div className="text-center py-4">
              <p className="text-red-600">Please connect your wallet to create a DID</p>
            </div>
          )}
        </form>
      </div>

      {/* Information Card */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">What is a DID?</h3>
        <div className="prose text-sm text-gray-600">
          <p className="mb-3">
            A Decentralized Identifier (DID) is a globally unique identifier that enables 
            verifiable, self-sovereign digital identity. Unlike traditional identifiers, 
            DIDs are under your complete control.
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Cryptographically verifiable</li>
            <li>No central authority required</li>
            <li>Persistent and resolvable</li>
            <li>W3C standard compliant</li>
          </ul>
        </div>
      </div>
    </div>
  );
} 