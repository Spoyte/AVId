# 🔧 Technical Specification

## Overview

Avalanche ID is a comprehensive self-sovereign identity platform built on Avalanche subnets, integrating W3C standards for decentralized identifiers and verifiable credentials, enhanced with zero-knowledge proofs for privacy-preserving verification and cross-chain interoperability via Chainlink CCIP.

## 📦 Smart Contract Architecture

### Core Contracts

#### 1. DIDRegistry.sol
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract DIDRegistry is Ownable, ReentrancyGuard {
    using ECDSA for bytes32;
    
    // DID Document structure
    struct DIDDocument {
        string did;
        bytes32 documentHash;
        address controller;
        uint256 created;
        uint256 updated;
        bool active;
        uint256 nonce;
    }
    
    // Public Key for authentication
    struct PublicKey {
        string id;
        string keyType;
        bytes publicKeyData;
        string[] purposes; // authentication, assertion, keyAgreement
    }
    
    // Service endpoints
    struct Service {
        string id;
        string serviceType;
        string serviceEndpoint;
    }
    
    // Storage mappings
    mapping(string => DIDDocument) public didDocuments;
    mapping(string => PublicKey[]) public didPublicKeys;
    mapping(string => Service[]) public didServices;
    mapping(address => string[]) public controllerToDIDs;
    mapping(bytes32 => bool) public usedDocumentHashes;
    
    // Events
    event DIDCreated(
        string indexed did,
        address indexed controller,
        bytes32 documentHash,
        uint256 timestamp
    );
    
    event DIDUpdated(
        string indexed did,
        bytes32 oldHash,
        bytes32 newHash,
        uint256 timestamp
    );
    
    event DIDDeactivated(
        string indexed did,
        address indexed controller,
        uint256 timestamp
    );
    
    event PublicKeyAdded(
        string indexed did,
        string keyId,
        string keyType
    );
    
    event ServiceAdded(
        string indexed did,
        string serviceId,
        string serviceType
    );
    
    // Modifiers
    modifier onlyDIDController(string memory did) {
        require(
            didDocuments[did].controller == msg.sender,
            "Only DID controller can perform this action"
        );
        _;
    }
    
    modifier didExists(string memory did) {
        require(
            bytes(didDocuments[did].did).length > 0,
            "DID does not exist"
        );
        _;
    }
    
    modifier didActive(string memory did) {
        require(
            didDocuments[did].active,
            "DID is deactivated"
        );
        _;
    }
    
    // Constructor
    constructor() {}
    
    // Core Functions
    function createDID(
        string memory did,
        bytes32 documentHash,
        PublicKey[] memory publicKeys,
        Service[] memory services,
        bytes memory signature
    ) external nonReentrant returns (bool) {
        require(bytes(didDocuments[did].did).length == 0, "DID already exists");
        require(!usedDocumentHashes[documentHash], "Document hash already used");
        require(publicKeys.length > 0, "At least one public key required");
        
        // Verify signature
        bytes32 messageHash = keccak256(abi.encodePacked(
            did,
            documentHash,
            msg.sender,
            block.timestamp
        ));
        require(
            _verifySignature(messageHash, signature, publicKeys[0].publicKeyData),
            "Invalid signature"
        );
        
        // Create DID document
        didDocuments[did] = DIDDocument({
            did: did,
            documentHash: documentHash,
            controller: msg.sender,
            created: block.timestamp,
            updated: block.timestamp,
            active: true,
            nonce: 0
        });
        
        // Store public keys
        for (uint i = 0; i < publicKeys.length; i++) {
            didPublicKeys[did].push(publicKeys[i]);
            emit PublicKeyAdded(did, publicKeys[i].id, publicKeys[i].keyType);
        }
        
        // Store services
        for (uint i = 0; i < services.length; i++) {
            didServices[did].push(services[i]);
            emit ServiceAdded(did, services[i].id, services[i].serviceType);
        }
        
        controllerToDIDs[msg.sender].push(did);
        usedDocumentHashes[documentHash] = true;
        
        emit DIDCreated(did, msg.sender, documentHash, block.timestamp);
        return true;
    }
    
    function updateDIDDocument(
        string memory did,
        bytes32 newDocumentHash,
        PublicKey[] memory newPublicKeys,
        Service[] memory newServices,
        bytes memory signature
    ) external nonReentrant onlyDIDController(did) didExists(did) didActive(did) {
        require(!usedDocumentHashes[newDocumentHash], "Document hash already used");
        
        DIDDocument storage doc = didDocuments[did];
        
        // Verify update signature
        bytes32 messageHash = keccak256(abi.encodePacked(
            did,
            newDocumentHash,
            doc.nonce + 1,
            block.timestamp
        ));
        require(
            _verifyDIDSignature(did, messageHash, signature),
            "Invalid update signature"
        );
        
        bytes32 oldHash = doc.documentHash;
        
        // Update document
        doc.documentHash = newDocumentHash;
        doc.updated = block.timestamp;
        doc.nonce++;
        
        // Clear and update public keys
        delete didPublicKeys[did];
        for (uint i = 0; i < newPublicKeys.length; i++) {
            didPublicKeys[did].push(newPublicKeys[i]);
        }
        
        // Clear and update services
        delete didServices[did];
        for (uint i = 0; i < newServices.length; i++) {
            didServices[did].push(newServices[i]);
        }
        
        usedDocumentHashes[newDocumentHash] = true;
        
        emit DIDUpdated(did, oldHash, newDocumentHash, block.timestamp);
    }
    
    function deactivateDID(
        string memory did,
        bytes memory signature
    ) external onlyDIDController(did) didExists(did) didActive(did) {
        DIDDocument storage doc = didDocuments[did];
        
        // Verify deactivation signature
        bytes32 messageHash = keccak256(abi.encodePacked(
            "DEACTIVATE",
            did,
            doc.nonce + 1,
            block.timestamp
        ));
        require(
            _verifyDIDSignature(did, messageHash, signature),
            "Invalid deactivation signature"
        );
        
        doc.active = false;
        doc.updated = block.timestamp;
        doc.nonce++;
        
        emit DIDDeactivated(did, msg.sender, block.timestamp);
    }
    
    // View Functions
    function resolveDID(string memory did) external view returns (
        DIDDocument memory document,
        PublicKey[] memory publicKeys,
        Service[] memory services
    ) {
        require(bytes(didDocuments[did].did).length > 0, "DID does not exist");
        
        return (
            didDocuments[did],
            didPublicKeys[did],
            didServices[did]
        );
    }
    
    function getDIDPublicKeys(string memory did) external view returns (PublicKey[] memory) {
        return didPublicKeys[did];
    }
    
    function getDIDServices(string memory did) external view returns (Service[] memory) {
        return didServices[did];
    }
    
    function getControllerDIDs(address controller) external view returns (string[] memory) {
        return controllerToDIDs[controller];
    }
    
    function isDIDActive(string memory did) external view returns (bool) {
        return didDocuments[did].active;
    }
    
    // Internal Functions
    function _verifySignature(
        bytes32 messageHash,
        bytes memory signature,
        bytes memory publicKey
    ) internal pure returns (bool) {
        // Simplified verification - in production, handle different key types
        address signer = messageHash.toEthSignedMessageHash().recover(signature);
        return signer != address(0);
    }
    
    function _verifyDIDSignature(
        string memory did,
        bytes32 messageHash,
        bytes memory signature
    ) internal view returns (bool) {
        PublicKey[] memory keys = didPublicKeys[did];
        for (uint i = 0; i < keys.length; i++) {
            if (_hasAuthenticationPurpose(keys[i].purposes)) {
                if (_verifySignature(messageHash, signature, keys[i].publicKeyData)) {
                    return true;
                }
            }
        }
        return false;
    }
    
    function _hasAuthenticationPurpose(string[] memory purposes) internal pure returns (bool) {
        for (uint i = 0; i < purposes.length; i++) {
            if (keccak256(bytes(purposes[i])) == keccak256(bytes("authentication"))) {
                return true;
            }
        }
        return false;
    }
}
```

#### 2. CredentialManager.sol
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./interfaces/IDIDRegistry.sol";
import "./interfaces/IOracleVerifier.sol";

contract CredentialManager is Ownable, ReentrancyGuard {
    
    IDIDRegistry public didRegistry;
    IOracleVerifier public oracleVerifier;
    
    enum CredentialStatus {
        ACTIVE,
        REVOKED,
        SUSPENDED,
        EXPIRED
    }
    
    struct Credential {
        bytes32 id;
        string issuerDID;
        string subjectDID;
        bytes32 credentialHash;
        bytes32 schemaHash;
        uint256 issuanceDate;
        uint256 expirationDate;
        CredentialStatus status;
        bytes32[] verificationProofs;
        string credentialType;
    }
    
    struct CredentialSchema {
        bytes32 id;
        string name;
        string version;
        bytes32 jsonSchemaHash;
        string zkCircuitId;
        bool active;
    }
    
    // Storage
    mapping(bytes32 => Credential) public credentials;
    mapping(string => bool) public authorizedIssuers;
    mapping(bytes32 => string) public revocationReasons;
    mapping(string => bytes32[]) public subjectCredentials;
    mapping(bytes32 => CredentialSchema) public credentialSchemas;
    mapping(string => bytes32) public credentialTypeToSchema;
    
    // Events
    event CredentialIssued(
        bytes32 indexed credentialId,
        string indexed issuerDID,
        string indexed subjectDID,
        string credentialType,
        uint256 timestamp
    );
    
    event CredentialRevoked(
        bytes32 indexed credentialId,
        string reason,
        uint256 timestamp
    );
    
    event CredentialSuspended(
        bytes32 indexed credentialId,
        string reason,
        uint256 timestamp
    );
    
    event SchemaRegistered(
        bytes32 indexed schemaId,
        string name,
        string credentialType
    );
    
    // Modifiers
    modifier onlyAuthorizedIssuer(string memory issuerDID) {
        require(authorizedIssuers[issuerDID], "Unauthorized issuer");
        _;
    }
    
    modifier onlyCredentialSubject(bytes32 credentialId) {
        Credential memory cred = credentials[credentialId];
        require(
            didRegistry.didDocuments(cred.subjectDID).controller == msg.sender,
            "Only credential subject can perform this action"
        );
        _;
    }
    
    modifier credentialExists(bytes32 credentialId) {
        require(credentials[credentialId].issuanceDate > 0, "Credential does not exist");
        _;
    }
    
    // Constructor
    constructor(
        address _didRegistry,
        address _oracleVerifier
    ) {
        didRegistry = IDIDRegistry(_didRegistry);
        oracleVerifier = IOracleVerifier(_oracleVerifier);
    }
    
    // Schema Management
    function registerCredentialSchema(
        bytes32 schemaId,
        string memory name,
        string memory version,
        string memory credentialType,
        bytes32 jsonSchemaHash,
        string memory zkCircuitId
    ) external onlyOwner {
        require(credentialSchemas[schemaId].id == bytes32(0), "Schema already exists");
        
        credentialSchemas[schemaId] = CredentialSchema({
            id: schemaId,
            name: name,
            version: version,
            jsonSchemaHash: jsonSchemaHash,
            zkCircuitId: zkCircuitId,
            active: true
        });
        
        credentialTypeToSchema[credentialType] = schemaId;
        
        emit SchemaRegistered(schemaId, name, credentialType);
    }
    
    // Credential Issuance
    function issueCredential(
        bytes32 credentialId,
        string memory issuerDID,
        string memory subjectDID,
        bytes32 credentialHash,
        string memory credentialType,
        uint256 expirationDate,
        bytes32[] memory verificationProofs,
        bytes memory issuerSignature
    ) external nonReentrant onlyAuthorizedIssuer(issuerDID) returns (bool) {
        require(credentials[credentialId].issuanceDate == 0, "Credential already exists");
        require(expirationDate > block.timestamp, "Invalid expiration date");
        require(didRegistry.isDIDActive(issuerDID), "Issuer DID not active");
        require(didRegistry.isDIDActive(subjectDID), "Subject DID not active");
        
        bytes32 schemaId = credentialTypeToSchema[credentialType];
        require(schemaId != bytes32(0), "Unknown credential type");
        require(credentialSchemas[schemaId].active, "Schema not active");
        
        // Verify oracle proofs if provided
        if (verificationProofs.length > 0) {
            require(
                _verifyOracleProofs(credentialHash, verificationProofs),
                "Invalid verification proofs"
            );
        }
        
        // Verify issuer signature
        require(
            _verifyIssuerSignature(
                credentialId,
                issuerDID,
                subjectDID,
                credentialHash,
                issuerSignature
            ),
            "Invalid issuer signature"
        );
        
        // Create credential
        credentials[credentialId] = Credential({
            id: credentialId,
            issuerDID: issuerDID,
            subjectDID: subjectDID,
            credentialHash: credentialHash,
            schemaHash: schemaId,
            issuanceDate: block.timestamp,
            expirationDate: expirationDate,
            status: CredentialStatus.ACTIVE,
            verificationProofs: verificationProofs,
            credentialType: credentialType
        });
        
        subjectCredentials[subjectDID].push(credentialId);
        
        emit CredentialIssued(
            credentialId,
            issuerDID,
            subjectDID,
            credentialType,
            block.timestamp
        );
        
        return true;
    }
    
    function revokeCredential(
        bytes32 credentialId,
        string memory reason,
        bytes memory signature
    ) external credentialExists(credentialId) {
        Credential storage cred = credentials[credentialId];
        
        // Only issuer or subject can revoke
        bool isIssuer = authorizedIssuers[cred.issuerDID] && 
                       didRegistry.didDocuments(cred.issuerDID).controller == msg.sender;
        bool isSubject = didRegistry.didDocuments(cred.subjectDID).controller == msg.sender;
        
        require(isIssuer || isSubject, "Unauthorized revocation");
        require(cred.status == CredentialStatus.ACTIVE, "Credential not active");
        
        // Verify signature based on who is revoking
        if (isIssuer) {
            require(_verifyRevocationSignature(credentialId, cred.issuerDID, signature), "Invalid issuer signature");
        } else {
            require(_verifyRevocationSignature(credentialId, cred.subjectDID, signature), "Invalid subject signature");
        }
        
        cred.status = CredentialStatus.REVOKED;
        revocationReasons[credentialId] = reason;
        
        emit CredentialRevoked(credentialId, reason, block.timestamp);
    }
    
    // Verification Functions
    function verifyCredential(
        bytes32 credentialId,
        bytes memory additionalProof
    ) external view returns (
        bool isValid,
        CredentialStatus status,
        string memory reason
    ) {
        if (credentials[credentialId].issuanceDate == 0) {
            return (false, CredentialStatus.REVOKED, "Credential does not exist");
        }
        
        Credential memory cred = credentials[credentialId];
        
        // Check expiration
        if (block.timestamp > cred.expirationDate) {
            return (false, CredentialStatus.EXPIRED, "Credential expired");
        }
        
        // Check status
        if (cred.status != CredentialStatus.ACTIVE) {
            return (false, cred.status, revocationReasons[credentialId]);
        }
        
        // Verify issuer DID is still active
        if (!didRegistry.isDIDActive(cred.issuerDID)) {
            return (false, CredentialStatus.REVOKED, "Issuer DID deactivated");
        }
        
        // Additional verification logic would go here
        return (true, CredentialStatus.ACTIVE, "");
    }
    
    function getCredentialsBySubject(string memory subjectDID) external view returns (bytes32[] memory) {
        return subjectCredentials[subjectDID];
    }
    
    function getCredentialSchema(string memory credentialType) external view returns (CredentialSchema memory) {
        bytes32 schemaId = credentialTypeToSchema[credentialType];
        return credentialSchemas[schemaId];
    }
    
    // Admin Functions
    function addAuthorizedIssuer(string memory issuerDID) external onlyOwner {
        require(didRegistry.isDIDActive(issuerDID), "DID not active");
        authorizedIssuers[issuerDID] = true;
    }
    
    function removeAuthorizedIssuer(string memory issuerDID) external onlyOwner {
        authorizedIssuers[issuerDID] = false;
    }
    
    // Internal Functions
    function _verifyOracleProofs(
        bytes32 credentialHash,
        bytes32[] memory proofs
    ) internal view returns (bool) {
        for (uint i = 0; i < proofs.length; i++) {
            if (!oracleVerifier.isVerified(proofs[i])) {
                return false;
            }
        }
        return true;
    }
    
    function _verifyIssuerSignature(
        bytes32 credentialId,
        string memory issuerDID,
        string memory subjectDID,
        bytes32 credentialHash,
        bytes memory signature
    ) internal view returns (bool) {
        bytes32 messageHash = keccak256(abi.encodePacked(
            credentialId,
            issuerDID,
            subjectDID,
            credentialHash,
            block.timestamp
        ));
        
        // Use DID registry to verify signature
        return didRegistry.verifyDIDSignature(issuerDID, messageHash, signature);
    }
    
    function _verifyRevocationSignature(
        bytes32 credentialId,
        string memory did,
        bytes memory signature
    ) internal view returns (bool) {
        bytes32 messageHash = keccak256(abi.encodePacked(
            "REVOKE",
            credentialId,
            block.timestamp
        ));
        
        return didRegistry.verifyDIDSignature(did, messageHash, signature);
    }
}
```

#### 3. ZKVerifier.sol
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./libraries/Verifier.sol"; // Generated from circom circuit

contract ZKVerifier is Ownable {
    
    // Circuit verifiers for different proof types
    mapping(string => address) public circuitVerifiers;
    mapping(bytes32 => bool) public nullifierHashes;
    mapping(address => bool) public trustedProofGenerators;
    
    struct ProofRequest {
        bytes32 id;
        string circuitId;
        address requester;
        bytes32 credentialHash;
        uint256 timestamp;
        bool fulfilled;
        bytes32 proofHash;
    }
    
    mapping(bytes32 => ProofRequest) public proofRequests;
    
    // Events
    event ProofRequested(
        bytes32 indexed requestId,
        string circuitId,
        address indexed requester,
        bytes32 credentialHash
    );
    
    event ProofSubmitted(
        bytes32 indexed requestId,
        bytes32 proofHash,
        bool verified
    );
    
    event CircuitRegistered(
        string circuitId,
        address verifierContract
    );
    
    // Register circuit verifier
    function registerCircuit(
        string memory circuitId,
        address verifierContract
    ) external onlyOwner {
        circuitVerifiers[circuitId] = verifierContract;
        emit CircuitRegistered(circuitId, verifierContract);
    }
    
    // Request proof generation
    function requestProof(
        string memory circuitId,
        bytes32 credentialHash
    ) external returns (bytes32 requestId) {
        require(circuitVerifiers[circuitId] != address(0), "Circuit not registered");
        
        requestId = keccak256(abi.encodePacked(
            circuitId,
            credentialHash,
            msg.sender,
            block.timestamp
        ));
        
        require(proofRequests[requestId].id == bytes32(0), "Request already exists");
        
        proofRequests[requestId] = ProofRequest({
            id: requestId,
            circuitId: circuitId,
            requester: msg.sender,
            credentialHash: credentialHash,
            timestamp: block.timestamp,
            fulfilled: false,
            proofHash: bytes32(0)
        });
        
        emit ProofRequested(requestId, circuitId, msg.sender, credentialHash);
        return requestId;
    }
    
    // Verify and submit proof
    function submitProof(
        bytes32 requestId,
        uint[2] memory _pA,
        uint[2][2] memory _pB,
        uint[2] memory _pC,
        uint[1] memory _pubSignals,
        bytes32 nullifierHash
    ) external returns (bool) {
        ProofRequest storage request = proofRequests[requestId];
        require(request.id != bytes32(0), "Request does not exist");
        require(!request.fulfilled, "Request already fulfilled");
        require(!nullifierHashes[nullifierHash], "Nullifier already used");
        
        // Get circuit verifier
        address verifierContract = circuitVerifiers[request.circuitId];
        require(verifierContract != address(0), "Circuit verifier not found");
        
        // Verify the proof
        bool isValid = IVerifier(verifierContract).verifyProof(
            _pA, _pB, _pC, _pubSignals
        );
        
        if (isValid) {
            request.fulfilled = true;
            request.proofHash = keccak256(abi.encodePacked(_pA, _pB, _pC, _pubSignals));
            nullifierHashes[nullifierHash] = true;
        }
        
        emit ProofSubmitted(requestId, request.proofHash, isValid);
        return isValid;
    }
    
    // Verify proof without storing
    function verifyProofOffline(
        string memory circuitId,
        uint[2] memory _pA,
        uint[2][2] memory _pB,
        uint[2] memory _pC,
        uint[1] memory _pubSignals
    ) external view returns (bool) {
        address verifierContract = circuitVerifiers[circuitId];
        require(verifierContract != address(0), "Circuit verifier not found");
        
        return IVerifier(verifierContract).verifyProof(_pA, _pB, _pC, _pubSignals);
    }
    
    // Get proof status
    function getProofRequest(bytes32 requestId) external view returns (ProofRequest memory) {
        return proofRequests[requestId];
    }
    
    function isNullifierUsed(bytes32 nullifierHash) external view returns (bool) {
        return nullifierHashes[nullifierHash];
    }
}

interface IVerifier {
    function verifyProof(
        uint[2] memory _pA,
        uint[2][2] memory _pB,
        uint[2] memory _pC,
        uint[1] memory _pubSignals
    ) external view returns (bool);
}
```

#### 4. CCIPIdentityGateway.sol
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {CCIPReceiver} from "@chainlink/contracts-ccip/src/v0.8/ccip/applications/CCIPReceiver.sol";
import {Client} from "@chainlink/contracts-ccip/src/v0.8/ccip/libraries/Client.sol";
import {IRouterClient} from "@chainlink/contracts-ccip/src/v0.8/ccip/interfaces/IRouterClient.sol";
import {LinkTokenInterface} from "@chainlink/contracts/src/v0.8/interfaces/LinkTokenInterface.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract CCIPIdentityGateway is CCIPReceiver, Ownable {
    
    IRouterClient private immutable i_router;
    LinkTokenInterface private immutable i_linkToken;
    
    // Access control
    mapping(uint64 => bool) public allowlistedDestinationChains;
    mapping(uint64 => bool) public allowlistedSourceChains;
    mapping(address => bool) public allowlistedSenders;
    
    // Message storage
    mapping(bytes32 => IdentityVerificationMessage) public receivedMessages;
    mapping(bytes32 => bool) public processedMessages;
    
    // Identity verification tracking
    mapping(address => mapping(string => uint256)) public lastVerificationTime;
    uint256 public constant VERIFICATION_VALIDITY_PERIOD = 1 hours;
    
    struct IdentityVerificationMessage {
        string did;
        bytes32 proofHash;
        string[] verifiedAttributes;
        uint256 timestamp;
        uint256 expirationTime;
        bytes32 credentialHash;
        VerificationLevel level;
        bytes signature;
    }
    
    enum VerificationLevel {
        BASIC,
        ENHANCED,
        PREMIUM
    }
    
    // Events
    event IdentityVerificationSent(
        bytes32 indexed messageId,
        uint64 indexed destinationChainSelector,
        address receiver,
        string did,
        VerificationLevel level
    );
    
    event IdentityVerificationReceived(
        bytes32 indexed messageId,
        uint64 indexed sourceChainSelector,
        address sender,
        string did,
        VerificationLevel level
    );
    
    event VerificationConfirmed(
        string indexed did,
        address indexed verifier,
        string[] attributes,
        uint256 timestamp
    );
    
    // Constructor
    constructor(
        address _router,
        address _link
    ) CCIPReceiver(_router) {
        i_router = IRouterClient(_router);
        i_linkToken = LinkTokenInterface(_link);
    }
    
    // Modifiers
    modifier onlyAllowlistedDestinationChain(uint64 _destinationChainSelector) {
        require(
            allowlistedDestinationChains[_destinationChainSelector],
            "Destination chain not allowlisted"
        );
        _;
    }
    
    modifier onlyAllowlisted(uint64 _sourceChainSelector, address _sender) {
        require(allowlistedSourceChains[_sourceChainSelector], "Source chain not allowlisted");
        require(allowlistedSenders[_sender], "Sender not allowlisted");
        _;
    }
    
    // Send identity verification
    function sendIdentityVerification(
        uint64 destinationChainSelector,
        address receiver,
        string memory did,
        bytes32 proofHash,
        string[] memory verifiedAttributes,
        uint256 expirationTime,
        bytes32 credentialHash,
        VerificationLevel level,
        bytes memory signature
    ) external onlyAllowlistedDestinationChain(destinationChainSelector) returns (bytes32 messageId) {
        
        // Create verification message
        IdentityVerificationMessage memory verificationMessage = IdentityVerificationMessage({
            did: did,
            proofHash: proofHash,
            verifiedAttributes: verifiedAttributes,
            timestamp: block.timestamp,
            expirationTime: expirationTime,
            credentialHash: credentialHash,
            level: level,
            signature: signature
        });
        
        // Create CCIP message
        Client.EVM2AnyMessage memory evm2AnyMessage = Client.EVM2AnyMessage({
            receiver: abi.encode(receiver),
            data: abi.encode(verificationMessage),
            tokenAmounts: new Client.EVMTokenAmount[](0),
            extraArgs: Client._argsToBytes(
                Client.EVMExtraArgsV1({gasLimit: 500_000})
            ),
            feeToken: address(i_linkToken)
        });
        
        // Calculate fees
        uint256 fees = i_router.getFee(destinationChainSelector, evm2AnyMessage);
        require(i_linkToken.balanceOf(address(this)) >= fees, "Not enough LINK for fees");
        
        // Approve and send
        i_linkToken.approve(address(i_router), fees);
        messageId = i_router.ccipSend(destinationChainSelector, evm2AnyMessage);
        
        emit IdentityVerificationSent(
            messageId,
            destinationChainSelector,
            receiver,
            did,
            level
        );
        
        return messageId;
    }
    
    // Receive identity verification
    function _ccipReceive(
        Client.Any2EVMMessage memory any2EvmMessage
    ) internal override onlyAllowlisted(
        any2EvmMessage.sourceChainSelector,
        abi.decode(any2EvmMessage.sender, (address))
    ) {
        IdentityVerificationMessage memory verificationMessage = abi.decode(
            any2EvmMessage.data,
            (IdentityVerificationMessage)
        );
        
        bytes32 messageId = any2EvmMessage.messageId;
        
        // Prevent replay attacks
        require(!processedMessages[messageId], "Message already processed");
        processedMessages[messageId] = true;
        
        // Validate message
        require(
            block.timestamp <= verificationMessage.expirationTime,
            "Verification expired"
        );
        
        // Store verification
        receivedMessages[messageId] = verificationMessage;
        
        // Update last verification time
        lastVerificationTime[msg.sender][verificationMessage.did] = block.timestamp;
        
        emit IdentityVerificationReceived(
            messageId,
            any2EvmMessage.sourceChainSelector,
            abi.decode(any2EvmMessage.sender, (address)),
            verificationMessage.did,
            verificationMessage.level
        );
        
        emit VerificationConfirmed(
            verificationMessage.did,
            msg.sender,
            verificationMessage.verifiedAttributes,
            block.timestamp
        );
    }
    
    // Verification functions
    function verifyIdentity(
        bytes32 messageId
    ) external view returns (
        bool isValid,
        IdentityVerificationMessage memory verification
    ) {
        verification = receivedMessages[messageId];
        
        if (verification.timestamp == 0) {
            return (false, verification);
        }
        
        // Check expiration
        if (block.timestamp > verification.expirationTime) {
            return (false, verification);
        }
        
        // Verify signature (simplified)
        bool signatureValid = _verifyMessageSignature(verification);
        
        return (signatureValid, verification);
    }
    
    function isIdentityVerified(
        string memory did,
        address verifier
    ) external view returns (bool) {
        uint256 lastVerification = lastVerificationTime[verifier][did];
        return lastVerification > 0 && 
               (block.timestamp - lastVerification) <= VERIFICATION_VALIDITY_PERIOD;
    }
    
    function getVerifiedAttributes(
        bytes32 messageId
    ) external view returns (string[] memory) {
        return receivedMessages[messageId].verifiedAttributes;
    }
    
    // Admin functions
    function allowlistDestinationChain(
        uint64 _destinationChainSelector,
        bool allowed
    ) external onlyOwner {
        allowlistedDestinationChains[_destinationChainSelector] = allowed;
    }
    
    function allowlistSourceChain(
        uint64 _sourceChainSelector,
        bool allowed
    ) external onlyOwner {
        allowlistedSourceChains[_sourceChainSelector] = allowed;
    }
    
    function allowlistSender(address _sender, bool allowed) external onlyOwner {
        allowlistedSenders[_sender] = allowed;
    }
    
    function withdrawLink(address _beneficiary) public onlyOwner {
        uint256 amount = i_linkToken.balanceOf(address(this));
        require(amount > 0, "Nothing to withdraw");
        i_linkToken.transfer(_beneficiary, amount);
    }
    
    // Internal functions
    function _verifyMessageSignature(
        IdentityVerificationMessage memory message
    ) internal pure returns (bool) {
        // Simplified signature verification
        // In production, verify against DID's public keys
        return message.signature.length > 0;
    }
    
    function _getChainSelector() internal view returns (uint64) {
        if (block.chainid == 43113) return 14767482510784806043; // Fuji
        if (block.chainid == 11155111) return 16015286601757825753; // Sepolia
        revert("Unsupported chain");
    }
}
```

## 🔒 Zero-Knowledge Proof Circuits

### Age Verification Circuit (Circom)
```javascript
pragma circom 2.0.0;

include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/poseidon.circom";

template AgeVerification() {
    // Private inputs
    signal private input birthYear;
    signal private input birthMonth;
    signal private input birthDay;
    signal private input currentYear;
    signal private input currentMonth;
    signal private input currentDay;
    signal private input credentialSecret;
    
    // Public inputs
    signal input minAge;
    signal input credentialCommitment;
    signal input nullifierSeed;
    
    // Outputs
    signal output isValid;
    signal output nullifierHash;
    
    // Calculate age in years
    component ageCalc = CalculateAge();
    ageCalc.birthYear <== birthYear;
    ageCalc.birthMonth <== birthMonth;
    ageCalc.birthDay <== birthDay;
    ageCalc.currentYear <== currentYear;
    ageCalc.currentMonth <== currentMonth;
    ageCalc.currentDay <== currentDay;
    
    // Check if age >= minAge
    component ageCheck = GreaterEqualThan(8);
    ageCheck.in[0] <== ageCalc.age;
    ageCheck.in[1] <== minAge;
    
    isValid <== ageCheck.out;
    
    // Verify credential commitment
    component credCommit = Poseidon(4);
    credCommit.inputs[0] <== birthYear;
    credCommit.inputs[1] <== birthMonth;
    credCommit.inputs[2] <== birthDay;
    credCommit.inputs[3] <== credentialSecret;
    
    credCommit.out === credentialCommitment;
    
    // Generate nullifier to prevent reuse
    component nullifier = Poseidon(2);
    nullifier.inputs[0] <== credentialSecret;
    nullifier.inputs[1] <== nullifierSeed;
    
    nullifierHash <== nullifier.out;
}

template CalculateAge() {
    signal input birthYear;
    signal input birthMonth;
    signal input birthDay;
    signal input currentYear;
    signal input currentMonth;
    signal input currentDay;
    signal output age;
    
    // Basic age calculation (can be made more precise)
    component yearDiff = Num2Bits(8);
    yearDiff.in <== currentYear - birthYear;
    
    // Check if birthday has passed this year
    component monthCheck = GreaterThan(4);
    monthCheck.in[0] <== currentMonth;
    monthCheck.in[1] <== birthMonth;
    
    component dayCheck = GreaterEqualThan(5);
    dayCheck.in[0] <== currentDay;
    dayCheck.in[1] <== birthDay;
    
    component monthEqual = IsEqual();
    monthEqual.in[0] <== currentMonth;
    monthEqual.in[1] <== birthMonth;
    
    component birthdayPassed = OR();
    birthdayPassed.a <== monthCheck.out;
    birthdayPassed.b <== monthEqual.out * dayCheck.out;
    
    // Subtract 1 if birthday hasn't passed
    component adjustment = Mux1();
    adjustment.c[0] <== 1;
    adjustment.c[1] <== 0;
    adjustment.s <== birthdayPassed.out;
    
    age <== currentYear - birthYear - adjustment.out;
}

component main = AgeVerification();
```

### Education Credential Circuit
```javascript
pragma circom 2.0.0;

include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/poseidon.circom";

template EducationVerification() {
    // Private inputs
    signal private input degreeType; // Encoded: 1=Bachelor, 2=Master, 3=PhD
    signal private input field; // Encoded field of study
    signal private input graduationYear;
    signal private input gpa; // Scaled by 100 (e.g., 3.75 = 375)
    signal private input credentialSecret;
    
    // Public inputs
    signal input minDegreeType;
    signal input requiredField; // 0 for any field
    signal input minGraduationYear;
    signal input minGPA; // Scaled by 100
    signal input credentialCommitment;
    signal input nullifierSeed;
    
    // Outputs
    signal output isValid;
    signal output nullifierHash;
    
    // Check degree type requirement
    component degreeCheck = GreaterEqualThan(4);
    degreeCheck.in[0] <== degreeType;
    degreeCheck.in[1] <== minDegreeType;
    
    // Check field requirement (0 means any field accepted)
    component fieldAny = IsZero();
    fieldAny.in <== requiredField;
    
    component fieldMatch = IsEqual();
    fieldMatch.in[0] <== field;
    fieldMatch.in[1] <== requiredField;
    
    component fieldValid = OR();
    fieldValid.a <== fieldAny.out;
    fieldValid.b <== fieldMatch.out;
    
    // Check graduation year
    component yearCheck = GreaterEqualThan(12);
    yearCheck.in[0] <== graduationYear;
    yearCheck.in[1] <== minGraduationYear;
    
    // Check GPA
    component gpaCheck = GreaterEqualThan(10);
    gpaCheck.in[0] <== gpa;
    gpaCheck.in[1] <== minGPA;
    
    // All checks must pass
    component and1 = AND();
    and1.a <== degreeCheck.out;
    and1.b <== fieldValid.out;
    
    component and2 = AND();
    and2.a <== and1.out;
    and2.b <== yearCheck.out;
    
    component and3 = AND();
    and3.a <== and2.out;
    and3.b <== gpaCheck.out;
    
    isValid <== and3.out;
    
    // Verify credential commitment
    component credCommit = Poseidon(5);
    credCommit.inputs[0] <== degreeType;
    credCommit.inputs[1] <== field;
    credCommit.inputs[2] <== graduationYear;
    credCommit.inputs[3] <== gpa;
    credCommit.inputs[4] <== credentialSecret;
    
    credCommit.out === credentialCommitment;
    
    // Generate nullifier
    component nullifier = Poseidon(2);
    nullifier.inputs[0] <== credentialSecret;
    nullifier.inputs[1] <== nullifierSeed;
    
    nullifierHash <== nullifier.out;
}

component main = EducationVerification();
```

## 📊 API Specifications

### DID Management API
```typescript
interface DIDService {
  // DID lifecycle
  createDID(params: CreateDIDParams): Promise<CreateDIDResponse>;
  updateDID(params: UpdateDIDParams): Promise<UpdateDIDResponse>;
  resolveDID(did: string): Promise<DIDDocument>;
  deactivateDID(did: string, signature: string): Promise<boolean>;
  
  // Key management
  addPublicKey(did: string, key: PublicKey, signature: string): Promise<boolean>;
  removePublicKey(did: string, keyId: string, signature: string): Promise<boolean>;
  rotateKeys(did: string, newKeys: PublicKey[], signature: string): Promise<boolean>;
  
  // Service endpoints
  addService(did: string, service: Service, signature: string): Promise<boolean>;
  removeService(did: string, serviceId: string, signature: string): Promise<boolean>;
}

interface CreateDIDParams {
  did: string;
  publicKeys: PublicKey[];
  services: Service[];
  signature: string;
}

interface DIDDocument {
  "@context": string[];
  id: string;
  controller: string;
  authentication: string[];
  assertionMethod: string[];
  keyAgreement: string[];
  service: Service[];
  created: string;
  updated: string;
  versionId: number;
}
```

### Credential Management API
```typescript
interface CredentialService {
  // Credential lifecycle
  issueCredential(params: IssueCredentialParams): Promise<CredentialResponse>;
  verifyCredential(credentialId: string): Promise<VerificationResult>;
  revokeCredential(credentialId: string, reason: string, signature: string): Promise<boolean>;
  
  // Credential queries
  getCredentialsBySubject(subjectDID: string): Promise<Credential[]>;
  getCredentialsByIssuer(issuerDID: string): Promise<Credential[]>;
  getCredentialStatus(credentialId: string): Promise<CredentialStatus>;
  
  // Schema management
  registerSchema(schema: CredentialSchema): Promise<string>;
  getSchema(schemaId: string): Promise<CredentialSchema>;
}

interface IssueCredentialParams {
  credentialId: string;
  issuerDID: string;
  subjectDID: string;
  credentialData: any;
  credentialType: string;
  expirationDate: number;
  verificationProofs: string[];
  signature: string;
}

interface VerifiableCredential {
  "@context": string[];
  id: string;
  type: string[];
  issuer: string | IssuerObject;
  issuanceDate: string;
  expirationDate?: string;
  credentialSubject: any;
  proof: Proof;
  credentialSchema?: CredentialSchemaRef;
}
```

### Zero-Knowledge Proof API
```typescript
interface ZKProofService {
  // Proof generation
  generateProof(params: GenerateProofParams): Promise<ProofResponse>;
  verifyProof(params: VerifyProofParams): Promise<boolean>;
  
  // Circuit management
  registerCircuit(circuitId: string, files: CircuitFiles): Promise<boolean>;
  getCircuitInfo(circuitId: string): Promise<CircuitInfo>;
  
  // Proof requests
  requestProof(circuitId: string, credentialHash: string): Promise<string>;
  getProofStatus(requestId: string): Promise<ProofStatus>;
}

interface GenerateProofParams {
  circuitId: string;
  privateInputs: Record<string, any>;
  publicInputs: Record<string, any>;
  credentialSecret: string;
}

interface ProofResponse {
  proof: {
    pi_a: [string, string];
    pi_b: [[string, string], [string, string]];
    pi_c: [string, string];
  };
  publicSignals: string[];
  nullifierHash: string;
}
```

## 🔐 Security Specifications

### Cryptographic Standards
- **Hash Function**: Poseidon for ZK circuits, SHA-256 for general use
- **Digital Signatures**: ECDSA with secp256k1, EdDSA for DIDs
- **Zero-Knowledge Proofs**: Groth16 with BN254 curve
- **Key Derivation**: PBKDF2 with 100,000 iterations
- **Encryption**: AES-256-GCM for data at rest

### Access Control Matrix
| Role | Create DID | Issue Credential | Generate Proof | Cross-Chain Verify | Admin Functions |
|------|------------|------------------|----------------|-------------------|-----------------|
| Individual | ✅ (own) | ❌ | ✅ (own creds) | ✅ (own proofs) | ❌ |
| Issuer | ✅ | ✅ (authorized) | ❌ | ❌ | ❌ |
| Verifier | ❌ | ❌ | ❌ | ✅ | ❌ |
| Oracle | ❌ | ❌ | ❌ | ❌ | ❌ |
| Admin | ✅ | ✅ | ✅ | ✅ | ✅ |

### Gas Optimization
| Operation | Estimated Gas | Optimization Notes |
|-----------|---------------|-------------------|
| Create DID | ~200,000 | Batch key operations |
| Issue Credential | ~150,000 | Use packed structs |
| Generate ZK Proof | ~300,000 | Optimize circuit size |
| CCIP Send | ~250,000 | Minimize message data |
| Verify Proof | ~180,000 | Precomputed verification keys |

---

This technical specification provides the complete implementation details for building the Avalanche ID system during the hackathon, with enterprise-ready security and scalability considerations for future development. 