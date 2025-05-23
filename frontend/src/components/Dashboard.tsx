import React from 'react';

export function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">
              Welcome to Avalanche ID
            </h2>
            <p className="mt-4 text-lg text-gray-500">
              Your Self-Sovereign Identity Infrastructure on Avalanche
            </p>
            <div className="mt-6 flex justify-center space-x-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-indigo-600">W3C</div>
                <div className="text-sm text-gray-500">DID Compliant</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">ZK</div>
                <div className="text-sm text-gray-500">Privacy Preserving</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">CCIP</div>
                <div className="text-sm text-gray-500">Cross-Chain</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="text-2xl">🆔</div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    DIDs Created
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">0</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="text-2xl">📜</div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Credentials Issued
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">0</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="text-2xl">🔒</div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    ZK Proofs Generated
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">0</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="text-2xl">🌉</div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Cross-Chain Verifications
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">0</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <button className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-500 rounded-lg border border-gray-300 hover:border-indigo-500">
              <div>
                <span className="rounded-lg inline-flex p-3 bg-indigo-50 text-indigo-700 ring-4 ring-white">
                  🆔
                </span>
              </div>
              <div className="mt-8">
                <h3 className="text-lg font-medium">
                  <span className="absolute inset-0" aria-hidden="true" />
                  Create DID
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  Create your decentralized identifier on Avalanche
                </p>
              </div>
            </button>

            <button className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-500 rounded-lg border border-gray-300 hover:border-indigo-500">
              <div>
                <span className="rounded-lg inline-flex p-3 bg-green-50 text-green-700 ring-4 ring-white">
                  📜
                </span>
              </div>
              <div className="mt-8">
                <h3 className="text-lg font-medium">
                  <span className="absolute inset-0" aria-hidden="true" />
                  Issue Credential
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  Issue verifiable credentials with oracle verification
                </p>
              </div>
            </button>

            <button className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-500 rounded-lg border border-gray-300 hover:border-indigo-500">
              <div>
                <span className="rounded-lg inline-flex p-3 bg-purple-50 text-purple-700 ring-4 ring-white">
                  🔒
                </span>
              </div>
              <div className="mt-8">
                <h3 className="text-lg font-medium">
                  <span className="absolute inset-0" aria-hidden="true" />
                  Generate ZK Proof
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  Create privacy-preserving zero-knowledge proofs
                </p>
              </div>
            </button>

            <button className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-500 rounded-lg border border-gray-300 hover:border-indigo-500">
              <div>
                <span className="rounded-lg inline-flex p-3 bg-blue-50 text-blue-700 ring-4 ring-white">
                  🌉
                </span>
              </div>
              <div className="mt-8">
                <h3 className="text-lg font-medium">
                  <span className="absolute inset-0" aria-hidden="true" />
                  Cross-Chain Verify
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  Verify identity across blockchain networks via CCIP
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Features Overview */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Platform Features
          </h3>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <h4 className="text-base font-medium text-gray-900 mb-2">
                🔐 Self-Sovereign Identity
              </h4>
              <ul className="text-sm text-gray-500 space-y-1">
                <li>• W3C DID Standard Compliance</li>
                <li>• Complete User Control</li>
                <li>• Multi-Device Support</li>
                <li>• Recovery Mechanisms</li>
              </ul>
            </div>
            <div>
              <h4 className="text-base font-medium text-gray-900 mb-2">
                📜 Verifiable Credentials
              </h4>
              <ul className="text-sm text-gray-500 space-y-1">
                <li>• Tamper-Proof Certificates</li>
                <li>• Oracle Verification</li>
                <li>• Expiration Management</li>
                <li>• Revocation System</li>
              </ul>
            </div>
            <div>
              <h4 className="text-base font-medium text-gray-900 mb-2">
                🔒 Privacy-Preserving
              </h4>
              <ul className="text-sm text-gray-500 space-y-1">
                <li>• Zero-Knowledge Proofs</li>
                <li>• Selective Disclosure</li>
                <li>• Anonymous Credentials</li>
                <li>• Biometric Privacy</li>
              </ul>
            </div>
            <div>
              <h4 className="text-base font-medium text-gray-900 mb-2">
                🌉 Cross-Chain Interoperability
              </h4>
              <ul className="text-sm text-gray-500 space-y-1">
                <li>• Chainlink CCIP Integration</li>
                <li>• Universal Verification</li>
                <li>• Multi-Chain SSO</li>
                <li>• Bridge Integration</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 