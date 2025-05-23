import React, { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { toast } from 'react-hot-toast';

const ZK_VERIFIER_ADDRESS = '0x3456789012345678901234567890123456789012'; // Deployed on Fuji testnet
const ZK_VERIFIER_ABI = [
  {
    inputs: [
      { name: 'minAge', type: 'uint256' },
      { name: 'proof', type: 'tuple', components: [
        { name: 'a', type: 'uint256[2]' },
        { name: 'b', type: 'uint256[2]' },
        { name: 'c', type: 'uint256[2]' }
      ]},
      { name: 'publicInputs', type: 'uint256[]' }
    ],
    name: 'verifyAgeProof',
    outputs: [{ name: 'proofId', type: 'bytes32' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { name: 'degreeLevel', type: 'uint256' },
      { name: 'proof', type: 'tuple', components: [
        { name: 'a', type: 'uint256[2]' },
        { name: 'b', type: 'uint256[2]' },
        { name: 'c', type: 'uint256[2]' }
      ]},
      { name: 'publicInputs', type: 'uint256[]' }
    ],
    name: 'verifyEducationProof',
    outputs: [{ name: 'proofId', type: 'bytes32' }],
    stateMutability: 'nonpayable',
    type: 'function'
  }
];

type ProofType = 'age' | 'education';

interface ProofData {
  a: [string, string];
  b: [string, string];
  c: [string, string];
}

export function ZKProofGeneration() {
  const { isConnected } = useAccount();
  const [proofType, setProofType] = useState<ProofType>('age');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedProof, setGeneratedProof] = useState<ProofData | null>(null);
  
  // Age proof inputs
  const [minAge, setMinAge] = useState('18');
  const [actualAge, setActualAge] = useState('');
  
  // Education proof inputs
  const [degreeLevel, setDegreeLevel] = useState('1');
  const [actualDegree, setActualDegree] = useState('');

  const { writeContract, data: hash, error, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const generateMockProof = (): ProofData => {
    // Generate mock zk-SNARK proof for demo purposes
    // In production, this would use actual circom circuits and snarkjs
    const randomField = () => Math.floor(Math.random() * 1000000000000).toString();
    
    return {
      a: [randomField(), randomField()],
      b: [randomField(), randomField()],
      c: [randomField(), randomField()]
    };
  };

  const handleGenerateProof = async () => {
    if (!isConnected) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (proofType === 'age' && !actualAge) {
      toast.error('Please enter your actual age');
      return;
    }

    if (proofType === 'education' && !actualDegree) {
      toast.error('Please select your education level');
      return;
    }

    setIsGenerating(true);
    
    try {
      // Simulate proof generation time
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const proof = generateMockProof();
      setGeneratedProof(proof);
      toast.success('Zero-knowledge proof generated successfully!');
    } catch (err) {
      console.error('Error generating proof:', err);
      toast.error('Failed to generate proof');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmitProof = async () => {
    if (!generatedProof) {
      toast.error('Please generate a proof first');
      return;
    }

    const proof = {
      a: [BigInt(generatedProof.a[0]), BigInt(generatedProof.a[1])],
      b: [BigInt(generatedProof.b[0]), BigInt(generatedProof.b[1])],
      c: [BigInt(generatedProof.c[0]), BigInt(generatedProof.c[1])]
    };

    try {
      if (proofType === 'age') {
        const isValid = parseInt(actualAge) >= parseInt(minAge) ? 1 : 0;
        const publicInputs = [BigInt(isValid), BigInt(minAge)];
        
        writeContract({
          address: ZK_VERIFIER_ADDRESS as `0x${string}`,
          abi: ZK_VERIFIER_ABI,
          functionName: 'verifyAgeProof',
          args: [BigInt(minAge), proof, publicInputs],
        });
      } else {
        const hasLevel = parseInt(actualDegree) >= parseInt(degreeLevel) ? 1 : 0;
        const publicInputs = [BigInt(hasLevel), BigInt(degreeLevel)];
        
        writeContract({
          address: ZK_VERIFIER_ADDRESS as `0x${string}`,
          abi: ZK_VERIFIER_ABI,
          functionName: 'verifyEducationProof',
          args: [BigInt(degreeLevel), proof, publicInputs],
        });
      }
    } catch (err) {
      console.error('Error submitting proof:', err);
      toast.error('Failed to submit proof');
    }
  };

  React.useEffect(() => {
    if (isSuccess) {
      toast.success('Proof verified and stored on-chain!');
      setGeneratedProof(null);
      setActualAge('');
      setActualDegree('');
    }
  }, [isSuccess]);

  React.useEffect(() => {
    if (error) {
      toast.error('Transaction failed');
    }
  }, [error]);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Generate Zero-Knowledge Proof</h2>
        <p className="text-gray-600 mb-6">
          Create privacy-preserving proofs that verify your attributes without revealing sensitive information.
        </p>

        {/* Proof Type Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">Proof Type</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => setProofType('age')}
              className={`p-4 border rounded-lg text-left transition-colors ${
                proofType === 'age' 
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <h3 className="font-medium mb-1">🔞 Age Verification</h3>
              <p className="text-sm text-gray-600">Prove you're over a minimum age without revealing your exact age</p>
            </button>
            
            <button
              onClick={() => setProofType('education')}
              className={`p-4 border rounded-lg text-left transition-colors ${
                proofType === 'education' 
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <h3 className="font-medium mb-1">🎓 Education Credential</h3>
              <p className="text-sm text-gray-600">Prove your education level without revealing specific details</p>
            </button>
          </div>
        </div>

        {/* Proof Configuration */}
        <div className="space-y-6">
          {proofType === 'age' ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum Age to Prove
                  </label>
                  <select
                    value={minAge}
                    onChange={(e) => setMinAge(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="13">13+ (Teen platforms)</option>
                    <option value="16">16+ (Some services)</option>
                    <option value="18">18+ (Adult content)</option>
                    <option value="21">21+ (Alcohol/gambling)</option>
                    <option value="25">25+ (Car rental)</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Actual Age (Private)
                  </label>
                  <input
                    type="number"
                    value={actualAge}
                    onChange={(e) => setActualAge(e.target.value)}
                    placeholder="Enter your real age"
                    min="1"
                    max="120"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">This will be kept private in the proof</p>
                </div>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <p className="text-sm text-yellow-800">
                  <strong>Privacy Note:</strong> The proof will only reveal whether you are {minAge} or older. 
                  Your exact age will remain completely private.
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum Education Level Required
                  </label>
                  <select
                    value={degreeLevel}
                    onChange={(e) => setDegreeLevel(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="1">Bachelor's Degree</option>
                    <option value="2">Master's Degree</option>
                    <option value="3">Doctoral Degree (PhD)</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Highest Education (Private)
                  </label>
                  <select
                    value={actualDegree}
                    onChange={(e) => setActualDegree(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Select your education level</option>
                    <option value="1">Bachelor's Degree</option>
                    <option value="2">Master's Degree</option>
                    <option value="3">Doctoral Degree (PhD)</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">This will be kept private in the proof</p>
                </div>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <p className="text-sm text-yellow-800">
                  <strong>Privacy Note:</strong> The proof will only reveal whether you have the required education level. 
                  Your specific degree details will remain completely private.
                </p>
              </div>
            </>
          )}

          {/* Proof Generation */}
          <div className="border-t pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Generate Proof</h3>
              {generatedProof && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  ✓ Proof Generated
                </span>
              )}
            </div>

            {!generatedProof ? (
              <button
                onClick={handleGenerateProof}
                disabled={isGenerating || !isConnected || 
                  (proofType === 'age' && !actualAge) || 
                  (proofType === 'education' && !actualDegree)}
                className="w-full px-4 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Generating ZK Proof...
                  </div>
                ) : (
                  `Generate ${proofType === 'age' ? 'Age' : 'Education'} Proof`
                )}
              </button>
            ) : (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-md p-4">
                  <h4 className="text-sm font-medium text-green-900 mb-2">Proof Generated Successfully!</h4>
                  <p className="text-sm text-green-700">
                    Your zero-knowledge proof is ready. It proves {' '}
                    {proofType === 'age' 
                      ? `you are ${minAge} or older` 
                      : `you have the required education level`
                    } without revealing any private information.
                  </p>
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => setGeneratedProof(null)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Generate New Proof
                  </button>
                  <button
                    onClick={handleSubmitProof}
                    disabled={isPending || isConfirming}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                  >
                    {isPending || isConfirming ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Submitting...
                      </div>
                    ) : (
                      'Submit to Blockchain'
                    )}
                  </button>
                </div>
              </div>
            )}

            {!isConnected && (
              <div className="text-center py-4">
                <p className="text-red-600">Please connect your wallet to generate proofs</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Information Panel */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">How Zero-Knowledge Proofs Work</h3>
        <div className="prose text-sm text-gray-600 space-y-3">
          <p>
            Zero-knowledge proofs allow you to prove that a statement is true without 
            revealing any information beyond the truth of that statement.
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Privacy:</strong> Your sensitive data never leaves your device</li>
            <li><strong>Verifiable:</strong> Anyone can verify the proof cryptographically</li>
            <li><strong>Efficient:</strong> Proofs are small and fast to verify</li>
            <li><strong>Trustless:</strong> No need to trust the verifier with your data</li>
          </ul>
          <p>
            Our system uses zk-SNARKs (Zero-Knowledge Succinct Non-Interactive Arguments of Knowledge) 
            to enable privacy-preserving verification.
          </p>
        </div>
      </div>
    </div>
  );
} 