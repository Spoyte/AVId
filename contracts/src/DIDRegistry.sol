// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title DIDRegistry
 * @dev W3C DID-compliant decentralized identity registry on Avalanche
 * @notice Manages creation, resolution, and updates of Decentralized Identifiers (DIDs)
 */
contract DIDRegistry is Ownable, ReentrancyGuard {
    using ECDSA for bytes32;

    // Events
    event DIDCreated(string indexed did, address indexed controller, uint256 timestamp);
    event DIDUpdated(string indexed did, address indexed controller, uint256 timestamp);
    event DIDDeactivated(string indexed did, address indexed controller, uint256 timestamp);
    event ControllerAdded(string indexed did, address indexed newController);
    event ControllerRemoved(string indexed did, address indexed removedController);

    // Structs
    struct DIDDocument {
        string id;
        address[] controllers;
        string[] verificationMethods;
        string[] services;
        bool active;
        uint256 created;
        uint256 updated;
        uint256 nonce;
    }

    struct VerificationMethod {
        string id;
        string methodType;
        string publicKeyMultibase;
        address controller;
    }

    // State variables
    mapping(string => DIDDocument) public didDocuments;
    mapping(string => mapping(address => bool)) public isController;
    mapping(string => VerificationMethod[]) public verificationMethods;
    mapping(address => string[]) public controllerToDIDs;
    
    uint256 public totalDIDs;
    string public constant DID_METHOD = "avax";
    string public constant NETWORK = "fuji";

    // Modifiers
    modifier onlyController(string memory did) {
        require(isController[did][msg.sender], "DIDRegistry: Not a controller");
        _;
    }

    modifier didExists(string memory did) {
        require(bytes(didDocuments[did].id).length > 0, "DIDRegistry: DID does not exist");
        _;
    }

    modifier didActive(string memory did) {
        require(didDocuments[did].active, "DIDRegistry: DID is deactivated");
        _;
    }

    constructor() {}

    /**
     * @dev Creates a new DID with the caller as the initial controller
     * @param identifier Unique identifier for the DID
     * @param publicKey Public key for the initial verification method
     * @return did The complete DID string
     */
    function createDID(
        string memory identifier,
        string memory publicKey
    ) external nonReentrant returns (string memory did) {
        // Generate DID string: did:avax:fuji:identifier
        did = string(abi.encodePacked("did:", DID_METHOD, ":", NETWORK, ":", identifier));
        
        require(bytes(didDocuments[did].id).length == 0, "DIDRegistry: DID already exists");
        require(bytes(identifier).length > 0, "DIDRegistry: Invalid identifier");
        require(bytes(publicKey).length > 0, "DIDRegistry: Invalid public key");

        // Create initial verification method
        string memory vmId = string(abi.encodePacked(did, "#key-1"));
        VerificationMethod memory vm = VerificationMethod({
            id: vmId,
            methodType: "EcdsaSecp256k1VerificationKey2019",
            publicKeyMultibase: publicKey,
            controller: msg.sender
        });

        // Initialize DID document
        DIDDocument storage doc = didDocuments[did];
        doc.id = did;
        doc.controllers.push(msg.sender);
        doc.verificationMethods.push(vmId);
        doc.active = true;
        doc.created = block.timestamp;
        doc.updated = block.timestamp;
        doc.nonce = 0;

        // Set controller mapping
        isController[did][msg.sender] = true;
        controllerToDIDs[msg.sender].push(did);
        
        // Store verification method
        verificationMethods[did].push(vm);

        totalDIDs++;

        emit DIDCreated(did, msg.sender, block.timestamp);
        return did;
    }

    /**
     * @dev Adds a new controller to a DID
     * @param did The DID to add controller to
     * @param newController Address of the new controller
     */
    function addController(
        string memory did,
        address newController
    ) external didExists(did) didActive(did) onlyController(did) {
        require(newController != address(0), "DIDRegistry: Invalid controller address");
        require(!isController[did][newController], "DIDRegistry: Already a controller");

        didDocuments[did].controllers.push(newController);
        isController[did][newController] = true;
        controllerToDIDs[newController].push(did);
        didDocuments[did].updated = block.timestamp;
        didDocuments[did].nonce++;

        emit ControllerAdded(did, newController);
        emit DIDUpdated(did, msg.sender, block.timestamp);
    }

    /**
     * @dev Removes a controller from a DID
     * @param did The DID to remove controller from
     * @param controllerToRemove Address of the controller to remove
     */
    function removeController(
        string memory did,
        address controllerToRemove
    ) external didExists(did) didActive(did) onlyController(did) {
        require(isController[did][controllerToRemove], "DIDRegistry: Not a controller");
        require(didDocuments[did].controllers.length > 1, "DIDRegistry: Cannot remove last controller");

        // Remove from controllers array
        address[] storage controllers = didDocuments[did].controllers;
        for (uint256 i = 0; i < controllers.length; i++) {
            if (controllers[i] == controllerToRemove) {
                controllers[i] = controllers[controllers.length - 1];
                controllers.pop();
                break;
            }
        }

        // Remove from mapping
        isController[did][controllerToRemove] = false;
        
        // Remove from controllerToDIDs
        string[] storage dids = controllerToDIDs[controllerToRemove];
        for (uint256 i = 0; i < dids.length; i++) {
            if (keccak256(bytes(dids[i])) == keccak256(bytes(did))) {
                dids[i] = dids[dids.length - 1];
                dids.pop();
                break;
            }
        }

        didDocuments[did].updated = block.timestamp;
        didDocuments[did].nonce++;

        emit ControllerRemoved(did, controllerToRemove);
        emit DIDUpdated(did, msg.sender, block.timestamp);
    }

    /**
     * @dev Adds a verification method to a DID
     * @param did The DID to add verification method to
     * @param methodId Unique identifier for the verification method
     * @param methodType Type of the verification method
     * @param publicKey Public key for the verification method
     */
    function addVerificationMethod(
        string memory did,
        string memory methodId,
        string memory methodType,
        string memory publicKey
    ) external didExists(did) didActive(did) onlyController(did) {
        require(bytes(methodId).length > 0, "DIDRegistry: Invalid method ID");
        require(bytes(publicKey).length > 0, "DIDRegistry: Invalid public key");

        string memory fullMethodId = string(abi.encodePacked(did, "#", methodId));
        
        VerificationMethod memory vm = VerificationMethod({
            id: fullMethodId,
            methodType: methodType,
            publicKeyMultibase: publicKey,
            controller: msg.sender
        });

        didDocuments[did].verificationMethods.push(fullMethodId);
        verificationMethods[did].push(vm);
        didDocuments[did].updated = block.timestamp;
        didDocuments[did].nonce++;

        emit DIDUpdated(did, msg.sender, block.timestamp);
    }

    /**
     * @dev Adds a service endpoint to a DID
     * @param did The DID to add service to
     * @param serviceId Unique identifier for the service
     * @param serviceType Type of the service
     * @param serviceEndpoint Endpoint URL for the service
     */
    function addService(
        string memory did,
        string memory serviceId,
        string memory serviceType,
        string memory serviceEndpoint
    ) external didExists(did) didActive(did) onlyController(did) {
        require(bytes(serviceId).length > 0, "DIDRegistry: Invalid service ID");
        require(bytes(serviceEndpoint).length > 0, "DIDRegistry: Invalid service endpoint");

        string memory service = string(abi.encodePacked(
            serviceId, "|", serviceType, "|", serviceEndpoint
        ));

        didDocuments[did].services.push(service);
        didDocuments[did].updated = block.timestamp;
        didDocuments[did].nonce++;

        emit DIDUpdated(did, msg.sender, block.timestamp);
    }

    /**
     * @dev Deactivates a DID
     * @param did The DID to deactivate
     */
    function deactivateDID(
        string memory did
    ) external didExists(did) didActive(did) onlyController(did) {
        didDocuments[did].active = false;
        didDocuments[did].updated = block.timestamp;
        didDocuments[did].nonce++;

        emit DIDDeactivated(did, msg.sender, block.timestamp);
    }

    // View functions

    /**
     * @dev Resolves a DID to its document
     * @param did The DID to resolve
     * @return The DID document
     */
    function resolveDID(string memory did) external view returns (DIDDocument memory) {
        require(bytes(didDocuments[did].id).length > 0, "DIDRegistry: DID does not exist");
        return didDocuments[did];
    }

    /**
     * @dev Gets verification methods for a DID
     * @param did The DID to get verification methods for
     * @return Array of verification methods
     */
    function getVerificationMethods(string memory did) external view returns (VerificationMethod[] memory) {
        return verificationMethods[did];
    }

    /**
     * @dev Gets all DIDs controlled by an address
     * @param controller The controller address
     * @return Array of DID strings
     */
    function getDIDsByController(address controller) external view returns (string[] memory) {
        return controllerToDIDs[controller];
    }

    /**
     * @dev Checks if a DID exists and is active
     * @param did The DID to check
     * @return True if DID exists and is active
     */
    function isDIDActive(string memory did) external view returns (bool) {
        return bytes(didDocuments[did].id).length > 0 && didDocuments[did].active;
    }

    /**
     * @dev Gets the current nonce for a DID (for replay protection)
     * @param did The DID to get nonce for
     * @return The current nonce
     */
    function getNonce(string memory did) external view returns (uint256) {
        return didDocuments[did].nonce;
    }
} 