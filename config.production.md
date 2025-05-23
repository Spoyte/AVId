# 🔧 Production Configuration Guide

## Environment Variables Template

Create `frontend/.env.production` with these values:

```bash
# Network Configuration
VITE_NETWORK_NAME="Avalanche Fuji Testnet"
VITE_CHAIN_ID=43113
VITE_RPC_URL="https://api.avax-test.network/ext/bc/C/rpc"
VITE_BLOCK_EXPLORER="https://testnet.snowtrace.io"

# Contract Addresses (Update after deployment)
VITE_DID_REGISTRY_ADDRESS="0x1234567890123456789012345678901234567890"
VITE_CREDENTIAL_MANAGER_ADDRESS="0x2345678901234567890123456789012345678901"
VITE_ZK_VERIFIER_ADDRESS="0x3456789012345678901234567890123456789012"
VITE_CCIP_GATEWAY_ADDRESS="0x4567890123456789012345678901234567890123"

# Cross-Chain Receiver Addresses
VITE_SEPOLIA_RECEIVER_ADDRESS="0x5678901234567890123456789012345678901234"
VITE_MUMBAI_RECEIVER_ADDRESS="0x6789012345678901234567890123456789012345"

# External Contract Addresses (Fuji Testnet)
VITE_CCIP_ROUTER_ADDRESS="0xF694E193200268f9a4868e4Aa017A0118C9a8177"
VITE_LINK_TOKEN_ADDRESS="0x0b9d5D9136855f6FEc3c0993feE6E9CE8a297846"

# Chain Selectors for CCIP
VITE_AVALANCHE_FUJI_SELECTOR="14767482510784806043"
VITE_ETHEREUM_SEPOLIA_SELECTOR="16015286601757825753"
VITE_POLYGON_MUMBAI_SELECTOR="12532609583862916517"

# Application Configuration
VITE_APP_NAME="Avalanche ID"
VITE_APP_VERSION="1.0.0"
VITE_APP_DESCRIPTION="Self-Sovereign Identity Infrastructure"

# Feature Flags
VITE_ENABLE_ZK_PROOFS=true
VITE_ENABLE_CROSS_CHAIN=true
VITE_ENABLE_NOTIFICATIONS=true
```

## Contract Deployment Commands

```bash
# Deploy to Fuji testnet
cd contracts
forge script script/Deploy.s.sol \
  --rpc-url $FUJI_RPC_URL \
  --broadcast \
  --verify \
  --etherscan-api-key $SNOWTRACE_API_KEY

# Fund CCIP Gateway with LINK tokens
forge script script/FundGateway.s.sol \
  --rpc-url $FUJI_RPC_URL \
  --broadcast
```

## Post-Deployment Steps

1. **Update Contract Addresses**
   - Copy deployed addresses from deployment output
   - Update frontend component files
   - Update environment configuration

2. **Verify Contracts**
   - Check verification on Snowtrace
   - Test contract interactions via explorer

3. **Fund CCIP Gateway**
   - Transfer LINK tokens to CCIPGateway contract
   - Ensure sufficient balance for cross-chain messaging

4. **Test End-to-End**
   - Run through all demo scenarios
   - Verify transactions on blockchain
   - Test cross-chain functionality

## Quick Deploy Script

Create `deploy.sh`:
```bash
#!/bin/bash
echo "🚀 Deploying Avalanche ID to Fuji testnet..."

# Compile contracts
cd contracts
forge build

# Deploy contracts
forge script script/Deploy.s.sol --rpc-url $FUJI_RPC_URL --broadcast --verify

# Start frontend
cd ../frontend
npm run build
npm run preview

echo "✅ Deployment complete! Check console for contract addresses."
``` 