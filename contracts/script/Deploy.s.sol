// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/DIDRegistry.sol";
import "../src/CredentialManager.sol";
import "../src/ZKVerifier.sol";
import "../src/CCIPGateway.sol";

/**
 * @title Deploy
 * @dev Deployment script for Avalanche ID contracts on Fuji testnet
 */
contract Deploy is Script {
    // Fuji testnet addresses
    address constant CCIP_ROUTER_FUJI = 0xF694E193200268f9a4868e4Aa017A0118C9a8177;
    address constant LINK_TOKEN_FUJI = 0x0b9d5D9136855f6FEc3c0993feE6E9CE8a297846;
    
    // Chain selectors
    uint64 constant SEPOLIA_CHAIN_SELECTOR = 16015286601757825753;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying contracts to Fuji testnet...");
        console.log("Deployer address:", deployer);
        console.log("Deployer balance:", deployer.balance);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy DID Registry
        console.log("Deploying DIDRegistry...");
        DIDRegistry didRegistry = new DIDRegistry();
        console.log("DIDRegistry deployed at:", address(didRegistry));

        // 2. Deploy Credential Manager
        console.log("Deploying CredentialManager...");
        CredentialManager credentialManager = new CredentialManager(address(didRegistry));
        console.log("CredentialManager deployed at:", address(credentialManager));

        // 3. Deploy ZK Verifier
        console.log("Deploying ZKVerifier...");
        ZKVerifier zkVerifier = new ZKVerifier();
        console.log("ZKVerifier deployed at:", address(zkVerifier));

        // 4. Deploy CCIP Gateway
        console.log("Deploying CCIPGateway...");
        CCIPGateway ccipGateway = new CCIPGateway(
            CCIP_ROUTER_FUJI,
            LINK_TOKEN_FUJI,
            address(didRegistry),
            address(credentialManager),
            address(zkVerifier)
        );
        console.log("CCIPGateway deployed at:", address(ccipGateway));

        // 5. Configure CCIP Gateway
        console.log("Configuring CCIPGateway...");
        ccipGateway.addAllowedChain(SEPOLIA_CHAIN_SELECTOR);
        console.log("Added Sepolia as allowed chain");

        vm.stopBroadcast();

        // Log deployment summary
        console.log("\n=== DEPLOYMENT SUMMARY ===");
        console.log("Network: Avalanche Fuji Testnet");
        console.log("DIDRegistry:", address(didRegistry));
        console.log("CredentialManager:", address(credentialManager));
        console.log("ZKVerifier:", address(zkVerifier));
        console.log("CCIPGateway:", address(ccipGateway));
        console.log("CCIP Router:", CCIP_ROUTER_FUJI);
        console.log("LINK Token:", LINK_TOKEN_FUJI);
        
        // Save addresses to file for frontend
        string memory addresses = string(abi.encodePacked(
            "VITE_DID_REGISTRY_ADDRESS=", vm.toString(address(didRegistry)), "\n",
            "VITE_CREDENTIAL_MANAGER_ADDRESS=", vm.toString(address(credentialManager)), "\n",
            "VITE_ZK_VERIFIER_ADDRESS=", vm.toString(address(zkVerifier)), "\n",
            "VITE_CCIP_GATEWAY_ADDRESS=", vm.toString(address(ccipGateway)), "\n"
        ));
        
        vm.writeFile("deployed-addresses.env", addresses);
        console.log("\nContract addresses saved to deployed-addresses.env");
        
        console.log("\n=== NEXT STEPS ===");
        console.log("1. Update .env file with deployed contract addresses");
        console.log("2. Fund CCIPGateway with LINK tokens for cross-chain messaging");
        console.log("3. Deploy receiver contracts on Sepolia testnet");
        console.log("4. Configure allowed senders in CCIPGateway");
        console.log("5. Test DID creation and credential issuance");
    }
} 