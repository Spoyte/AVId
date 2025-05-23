import React, { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { toast } from 'react-hot-toast';

const CREDENTIAL_MANAGER_ADDRESS = '0x2345678901234567890123456789012345678901'; // Deployed on Fuji testnet
const CREDENTIAL_MANAGER_ABI = [
  {
    inputs: [
      { name: 'subjectDID', type: 'string' },
      { name: 'issuerDID', type: 'string' },
      { name: 'credentialType', type: 'string' },
      { name: 'claims', type: 'string[]' },
      { name: 'merkleRoot', type: 'bytes32' },
      { name: 'expirationDate', type: 'uint256' },
      { name: 'metadataURI', type: 'string' }
    ],
    name: 'issueCredential',
    outputs: [{ name: 'credentialId', type: 'bytes32' }],
    stateMutability: 'nonpayable',
    type: 'function'
  }
];

interface CredentialTemplate {
  id: string;
  name: string;
  description: string;
  fields: Array<{
    name: string;
    label: string;
    type: 'text' | 'number' | 'date' | 'select';
    options?: string[];
    required: boolean;
  }>;
}

const CREDENTIAL_TEMPLATES: CredentialTemplate[] = [
  {
    id: 'education',
    name: 'Education Credential',
    description: 'Verify educational achievements and degrees',
    fields: [
      { name: 'institution', label: 'Institution', type: 'text', required: true },
      { name: 'degree', label: 'Degree Type', type: 'select', options: ['Bachelor', 'Master', 'PhD', 'Certificate'], required: true },
      { name: 'field', label: 'Field of Study', type: 'text', required: true },
      { name: 'graduationYear', label: 'Graduation Year', type: 'number', required: true },
      { name: 'gpa', label: 'GPA', type: 'number', required: false }
    ]
  },
  {
    id: 'professional',
    name: 'Professional Credential',
    description: 'Verify work experience and professional qualifications',
    fields: [
      { name: 'company', label: 'Company', type: 'text', required: true },
      { name: 'position', label: 'Position', type: 'text', required: true },
      { name: 'yearsExperience', label: 'Years of Experience', type: 'number', required: true },
      { name: 'skills', label: 'Skills', type: 'text', required: true },
      { name: 'certification', label: 'Certification', type: 'text', required: false }
    ]
  },
  {
    id: 'age',
    name: 'Age Verification',
    description: 'Verify age for compliance and access control',
    fields: [
      { name: 'birthDate', label: 'Birth Date', type: 'date', required: true },
      { name: 'country', label: 'Country of Birth', type: 'text', required: true }
    ]
  }
];

export function CredentialIssuance() {
  const { isConnected } = useAccount();
  const [selectedTemplate, setSelectedTemplate] = useState<CredentialTemplate | null>(null);
  const [subjectDID, setSubjectDID] = useState('');
  const [issuerDID, setIssuerDID] = useState('');
  const [credentialData, setCredentialData] = useState<Record<string, string>>({});
  const [expirationDays, setExpirationDays] = useState('365');

  const { writeContract, data: hash, error, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const handleFieldChange = (fieldName: string, value: string) => {
    setCredentialData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const generateMerkleRoot = (claims: string[]): string => {
    // For demo purposes, generate a simple hash
    // In production, this would be a proper Merkle tree root
    const combined = claims.join('|');
    return '0x' + Array.from(combined).map(c => 
      c.charCodeAt(0).toString(16).padStart(2, '0')
    ).join('').padEnd(64, '0').slice(0, 64);
  };

  const handleIssueCredential = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isConnected) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!selectedTemplate || !subjectDID || !issuerDID) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Validate required fields
    const missingFields = selectedTemplate.fields
      .filter(field => field.required && !credentialData[field.name])
      .map(field => field.label);

    if (missingFields.length > 0) {
      toast.error(`Missing required fields: ${missingFields.join(', ')}`);
      return;
    }

    // Prepare claims array
    const claims = selectedTemplate.fields
      .filter(field => credentialData[field.name])
      .map(field => `${field.name}:${credentialData[field.name]}`);

    const merkleRoot = generateMerkleRoot(claims);
    const expirationDate = Math.floor(Date.now() / 1000) + (parseInt(expirationDays) * 24 * 60 * 60);

    try {
      writeContract({
        address: CREDENTIAL_MANAGER_ADDRESS as `0x${string}`,
        abi: CREDENTIAL_MANAGER_ABI,
        functionName: 'issueCredential',
        args: [
          subjectDID,
          issuerDID,
          selectedTemplate.id,
          claims,
          merkleRoot as `0x${string}`,
          BigInt(expirationDate),
          '' // metadata URI - empty for demo
        ],
      });
    } catch (err) {
      console.error('Error issuing credential:', err);
      toast.error('Failed to issue credential');
    }
  };

  React.useEffect(() => {
    if (isSuccess) {
      toast.success('Credential issued successfully!');
      setSelectedTemplate(null);
      setSubjectDID('');
      setIssuerDID('');
      setCredentialData({});
    }
  }, [isSuccess]);

  React.useEffect(() => {
    if (error) {
      toast.error('Transaction failed');
    }
  }, [error]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Issue Verifiable Credential</h2>
        <p className="text-gray-600 mb-6">
          Create tamper-proof, cryptographically verifiable credentials for education, 
          professional experience, or identity verification.
        </p>

        {!selectedTemplate ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {CREDENTIAL_TEMPLATES.map((template) => (
              <button
                key={template.id}
                onClick={() => setSelectedTemplate(template)}
                className="text-left p-4 border border-gray-300 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-colors"
              >
                <h3 className="font-medium text-gray-900 mb-2">{template.name}</h3>
                <p className="text-sm text-gray-600">{template.description}</p>
                <div className="mt-3 text-xs text-indigo-600">
                  {template.fields.length} fields required
                </div>
              </button>
            ))}
          </div>
        ) : (
          <form onSubmit={handleIssueCredential} className="space-y-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900">{selectedTemplate.name}</h3>
                <p className="text-sm text-gray-600">{selectedTemplate.description}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTemplate(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ← Back to templates
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject DID *
                </label>
                <input
                  type="text"
                  value={subjectDID}
                  onChange={(e) => setSubjectDID(e.target.value)}
                  placeholder="did:avax:fuji:subject-identifier"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">DID of the credential subject</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Issuer DID *
                </label>
                <input
                  type="text"
                  value={issuerDID}
                  onChange={(e) => setIssuerDID(e.target.value)}
                  placeholder="did:avax:fuji:issuer-identifier"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">DID of the credential issuer</p>
              </div>
            </div>

            <div>
              <h4 className="text-md font-medium text-gray-900 mb-4">Credential Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedTemplate.fields.map((field) => (
                  <div key={field.name}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {field.label} {field.required && '*'}
                    </label>
                    {field.type === 'select' ? (
                      <select
                        value={credentialData[field.name] || ''}
                        onChange={(e) => handleFieldChange(field.name, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                        required={field.required}
                      >
                        <option value="">Select {field.label}</option>
                        {field.options?.map(option => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field.type}
                        value={credentialData[field.name] || ''}
                        onChange={(e) => handleFieldChange(field.name, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                        required={field.required}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expiration (Days)
              </label>
              <input
                type="number"
                value={expirationDays}
                onChange={(e) => setExpirationDays(e.target.value)}
                min="1"
                max="3650"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              />
              <p className="text-xs text-gray-500 mt-1">Credential will expire in {expirationDays} days</p>
            </div>

            <div className="flex justify-end space-x-3 pt-6 border-t">
              <button
                type="button"
                onClick={() => {
                  setSelectedTemplate(null);
                  setCredentialData({});
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!isConnected || isPending || isConfirming}
                className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending || isConfirming ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {isPending ? 'Confirming...' : 'Issuing...'}
                  </div>
                ) : (
                  'Issue Credential'
                )}
              </button>
            </div>

            {!isConnected && (
              <div className="text-center py-4">
                <p className="text-red-600">Please connect your wallet to issue credentials</p>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
} 