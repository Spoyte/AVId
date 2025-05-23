// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./DIDRegistry.sol";

contract CredentialManager is Ownable, ReentrancyGuard {
    // Events
    event CredentialIssued(
        bytes32 indexed credentialId,
        string indexed subjectDID,
        string indexed issuerDID,
        string credentialType,
        uint256 timestamp
    );
    event CredentialRevoked(bytes32 indexed credentialId, string indexed issuerDID, uint256 timestamp);
    event CredentialVerified(bytes32 indexed credentialId, address indexed verifier, bool isValid, uint256 timestamp);

    // Structs
    struct VerifiableCredential {
        bytes32 id;
        string subjectDID;
        string issuerDID;
        string credentialType;
        string[] claims;
        bytes32 merkleRoot;
        uint256 issuanceDate;
        uint256 expirationDate;
        bool revoked;
        bool oracleVerified;
        string metadataURI;
    }

    struct CredentialSchema {
        string schemaType;
        string[] requiredClaims;
        bool requiresOracleVerification;
        address oracleAddress;
        bool active;
    }

    // State variables
    DIDRegistry public immutable didRegistry;
    
    mapping(bytes32 => VerifiableCredential) public credentials;
    mapping(string => CredentialSchema) public credentialSchemas;
    mapping(string => bytes32[]) public credentialsBySubject;
    mapping(string => bytes32[]) public credentialsByIssuer;
    mapping(address => bool) public authorizedOracles;
    
    uint256 public totalCredentials;

    // Modifiers
    modifier onlyDIDController(string memory did) {
        require(didRegistry.isController(did, msg.sender), "Not a DID controller");
        _;
    }

    modifier credentialExists(bytes32 credentialId) {
        require(credentials[credentialId].id != bytes32(0), "Credential does not exist");
        _;
    }

    constructor(address _didRegistry) {
        require(_didRegistry != address(0), "Invalid DID registry address");
        didRegistry = DIDRegistry(_didRegistry);
    }

    function issueCredential(
        string memory subjectDID,
        string memory issuerDID,
        string memory credentialType,
        string[] memory claims,
        bytes32 merkleRoot,
        uint256 expirationDate,
        string memory metadataURI
    ) external onlyDIDController(issuerDID) nonReentrant returns (bytes32 credentialId) {
        require(didRegistry.isDIDActive(subjectDID), "Subject DID is not active");
        require(didRegistry.isDIDActive(issuerDID), "Issuer DID is not active");
        require(bytes(credentialType).length > 0, "Invalid credential type");
        require(claims.length > 0, "No claims provided");

        credentialId = keccak256(abi.encodePacked(
            subjectDID,
            issuerDID,
            credentialType,
            block.timestamp,
            totalCredentials
        ));

        VerifiableCredential storage credential = credentials[credentialId];
        credential.id = credentialId;
        credential.subjectDID = subjectDID;
        credential.issuerDID = issuerDID;
        credential.credentialType = credentialType;
        credential.claims = claims;
        credential.merkleRoot = merkleRoot;
        credential.issuanceDate = block.timestamp;
        credential.expirationDate = expirationDate;
        credential.revoked = false;
        credential.oracleVerified = true; // Simplified for MVP
        credential.metadataURI = metadataURI;

        credentialsBySubject[subjectDID].push(credentialId);
        credentialsByIssuer[issuerDID].push(credentialId);
        totalCredentials++;

        emit CredentialIssued(credentialId, subjectDID, issuerDID, credentialType, block.timestamp);
        return credentialId;
    }

    function revokeCredential(bytes32 credentialId) external credentialExists(credentialId) {
        VerifiableCredential storage credential = credentials[credentialId];
        require(
            didRegistry.isController(credential.issuerDID, msg.sender),
            "Only issuer can revoke credential"
        );
        require(!credential.revoked, "Credential already revoked");

        credential.revoked = true;
        emit CredentialRevoked(credentialId, credential.issuerDID, block.timestamp);
    }

    function verifyCredential(bytes32 credentialId) external credentialExists(credentialId) returns (bool isValid) {
        VerifiableCredential memory credential = credentials[credentialId];
        
        if (credential.revoked) {
            emit CredentialVerified(credentialId, msg.sender, false, block.timestamp);
            return false;
        }

        if (credential.expirationDate > 0 && block.timestamp > credential.expirationDate) {
            emit CredentialVerified(credentialId, msg.sender, false, block.timestamp);
            return false;
        }

        if (!didRegistry.isDIDActive(credential.subjectDID) || 
            !didRegistry.isDIDActive(credential.issuerDID)) {
            emit CredentialVerified(credentialId, msg.sender, false, block.timestamp);
            return false;
        }

        emit CredentialVerified(credentialId, msg.sender, true, block.timestamp);
        return true;
    }

    // View functions
    function getCredential(bytes32 credentialId) external view returns (VerifiableCredential memory) {
        return credentials[credentialId];
    }

    function getCredentialsBySubject(string memory subjectDID) external view returns (bytes32[] memory) {
        return credentialsBySubject[subjectDID];
    }

    function getCredentialsByIssuer(string memory issuerDID) external view returns (bytes32[] memory) {
        return credentialsByIssuer[issuerDID];
    }
} 