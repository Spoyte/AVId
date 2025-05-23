# 🚀 Avalanche ID - Deployment Guide

## Quick Deployment Checklist

### 1. Environment Setup
```bash
# Install dependencies
npm install
cd contracts && npm install
cd ../frontend && npm install

# Setup environment
cp .env.example .env
# Edit .env with your private key and RPC URLs
```

### 2. Contract Deployment
```bash
# Compile contracts
cd contracts
forge build

# Deploy to Fuji testnet
forge script script/Deploy.s.sol --rpc-url $FUJI_RPC_URL --broadcast --verify --etherscan-api-key $SNOWTRACE_API_KEY

# Note deployed addresses from output
```

### 3. Frontend Configuration
Update contract addresses in frontend components:
- `frontend/src/components/DIDCreation.tsx` - Line 6: `DID_REGISTRY_ADDRESS`
- `frontend/src/components/CredentialIssuance.tsx` - Line 6: `CREDENTIAL_MANAGER_ADDRESS`
- `frontend/src/components/ZKProofGeneration.tsx` - Line 6: `ZK_VERIFIER_ADDRESS`
- `frontend/src/components/CrossChainVerification.tsx` - Line 6: `CCIP_GATEWAY_ADDRESS`

### 4. Run Frontend
```bash
cd frontend
npm run dev
# Open http://localhost:5173
```

### 5. Test User Flows

#### A. Create DID
1. Connect wallet to Fuji testnet
2. Navigate to "Create DID" tab
3. Enter identifier and generate public key
4. Submit transaction and wait for confirmation

#### B. Issue Credential
1. Navigate to "Issue Credential" tab
2. Select credential template (Education/Professional/Age)
3. Fill in subject DID, issuer DID, and credential data
4. Submit transaction and wait for confirmation

#### C. Generate ZK Proof
1. Navigate to "ZK Proof" tab
2. Select proof type (Age or Education)
3. Enter private data and minimum requirements
4. Generate proof and submit to blockchain

#### D. Cross-Chain Verification
1. Navigate to "Cross-Chain" tab
2. Select destination chain (Ethereum Sepolia)
3. Enter DID and proof ID
4. Review estimated LINK fee
5. Send cross-chain verification

## Contract Addresses Template

After deployment, update these in your `.env`:

```bash
# Update these with actual deployed addresses
VITE_DID_REGISTRY_ADDRESS=0x...
VITE_CREDENTIAL_MANAGER_ADDRESS=0x...
VITE_ZK_VERIFIER_ADDRESS=0x...
VITE_CCIP_GATEWAY_ADDRESS=0x...
```

## Demo Scenarios

### Scenario 1: Developer Identity
1. **Create DID**: `did:avax:fuji:alice-developer`
2. **Issue Professional Credential**: 
   - Company: "Web3 Startup"
   - Position: "Senior Blockchain Developer"
   - Experience: "5 years"
   - Skills: "Solidity, React, TypeScript"
3. **Generate ZK Proof**: Prove 5+ years experience without revealing exact details
4. **Cross-Chain Access**: Use verified identity for premium DeFi features on Ethereum

### Scenario 2: Age Verification
1. **Create DID**: `did:avax:fuji:bob-user`
2. **Issue Age Credential**: Born 1990, Country: "United States"
3. **Generate ZK Proof**: Prove age 18+ without revealing birth year
4. **Cross-Chain Access**: Access age-restricted protocols on other chains

## Troubleshooting

### Common Issues

**Q: Transaction fails with "Insufficient funds"**
A: Ensure wallet has AVAX for gas fees on Fuji testnet. Get testnet AVAX from faucet.

**Q: Contract interaction fails**
A: Verify contract addresses are correctly updated in frontend components.

**Q: Cross-chain verification estimates high fees**
A: CCIP requires LINK tokens. Ensure CCIPGateway contract has LINK balance.

**Q: ZK proof generation takes too long**
A: This is normal for first-time circuit compilation. Production would use precompiled circuits.

### Debug Steps
1. Check browser console for errors
2. Verify network is set to Avalanche Fuji
3. Confirm contract addresses match deployment
4. Check transaction status on Snowtrace

## Production Considerations

### For Live Deployment
1. **Security**: Use hardware wallet for deployment
2. **Verification**: Verify all contracts on Snowtrace
3. **Testing**: Run full integration tests
4. **Monitoring**: Set up contract event monitoring
5. **Documentation**: Update API documentation

### For Hackathon Demo
1. **Preparation**: Pre-create sample DIDs and credentials
2. **Backup**: Record demo video as fallback
3. **Practice**: Run through scenarios multiple times
4. **Network**: Have backup internet connection
5. **Presentation**: Prepare slides explaining technical architecture

---

**Estimated Deployment Time**: 30-45 minutes
**Demo Preparation Time**: 1-2 hours
**Total Time to Demo-Ready**: 2-3 hours 