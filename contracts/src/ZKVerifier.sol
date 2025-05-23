// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title ZKVerifier
 * @dev Verifies zero-knowledge proofs for privacy-preserving credential verification
 * @notice Supports age verification and education credential proofs
 */
contract ZKVerifier is Ownable, ReentrancyGuard {
    // Events
    event ProofVerified(
        bytes32 indexed proofId,
        address indexed verifier,
        string proofType,
        bool isValid,
        uint256 timestamp
    );
    event CircuitRegistered(
        string indexed circuitType,
        bytes32 verifyingKey,
        uint256 timestamp
    );

    // Structs
    struct VerifyingKey {
        uint256[2] alpha;
        uint256[2][2] beta;
        uint256[2][2] gamma;
        uint256[2][2] delta;
        uint256[][] ic;
    }

    struct Proof {
        uint256[2] a;
        uint256[2] b;
        uint256[2] c;
    }

    struct ZKProofData {
        bytes32 id;
        address prover;
        string proofType;
        uint256[] publicInputs;
        bool verified;
        uint256 timestamp;
        uint256 expirationTime;
    }

    // State variables
    mapping(string => VerifyingKey) public verifyingKeys;
    mapping(bytes32 => ZKProofData) public zkProofs;
    mapping(address => bytes32[]) public proverProofs;
    mapping(string => bool) public supportedCircuits;
    
    uint256 public totalProofs;
    uint256 public constant PROOF_VALIDITY_DURATION = 1 hours; // Proofs valid for 1 hour

    // Modifiers
    modifier supportedCircuit(string memory circuitType) {
        require(supportedCircuits[circuitType], "ZKVerifier: Unsupported circuit type");
        _;
    }

    modifier proofExists(bytes32 proofId) {
        require(zkProofs[proofId].id != bytes32(0), "ZKVerifier: Proof does not exist");
        _;
    }

    constructor() {
        // Initialize supported circuit types
        supportedCircuits["age_verification"] = true;
        supportedCircuits["education_credential"] = true;
        supportedCircuits["professional_credential"] = true;
    }

    /**
     * @dev Registers a verifying key for a specific circuit type
     * @param circuitType Type of the circuit (e.g., "age_verification")
     * @param vk The verifying key for the circuit
     */
    function registerVerifyingKey(
        string memory circuitType,
        VerifyingKey memory vk
    ) external onlyOwner {
        require(bytes(circuitType).length > 0, "ZKVerifier: Invalid circuit type");
        
        verifyingKeys[circuitType] = vk;
        supportedCircuits[circuitType] = true;
        
        bytes32 vkHash = keccak256(abi.encode(vk));
        emit CircuitRegistered(circuitType, vkHash, block.timestamp);
    }

    /**
     * @dev Verifies a zero-knowledge proof
     * @param circuitType Type of circuit used for the proof
     * @param proof The zk-SNARK proof
     * @param publicInputs Public inputs for the proof
     * @return proofId Unique identifier for the verified proof
     */
    function verifyProof(
        string memory circuitType,
        Proof memory proof,
        uint256[] memory publicInputs
    ) external supportedCircuit(circuitType) nonReentrant returns (bytes32 proofId) {
        // Generate unique proof ID
        proofId = keccak256(abi.encodePacked(
            msg.sender,
            circuitType,
            proof.a,
            proof.b,
            proof.c,
            publicInputs,
            block.timestamp,
            totalProofs
        ));

        // For MVP, we'll use a simplified verification
        // In production, this would use actual zk-SNARK verification
        bool isValid = _verifyProofSimplified(circuitType, proof, publicInputs);

        // Store proof data
        ZKProofData storage zkProof = zkProofs[proofId];
        zkProof.id = proofId;
        zkProof.prover = msg.sender;
        zkProof.proofType = circuitType;
        zkProof.publicInputs = publicInputs;
        zkProof.verified = isValid;
        zkProof.timestamp = block.timestamp;
        zkProof.expirationTime = block.timestamp + PROOF_VALIDITY_DURATION;

        // Add to prover's proofs
        proverProofs[msg.sender].push(proofId);
        totalProofs++;

        emit ProofVerified(proofId, msg.sender, circuitType, isValid, block.timestamp);
        return proofId;
    }

    /**
     * @dev Verifies an age proof (simplified for MVP)
     * @param minAge Minimum age to prove
     * @param proof The zk-SNARK proof
     * @param publicInputs Public inputs (should contain age verification result)
     * @return proofId Unique identifier for the verified proof
     */
    function verifyAgeProof(
        uint256 minAge,
        Proof memory proof,
        uint256[] memory publicInputs
    ) external nonReentrant returns (bytes32 proofId) {
        require(minAge > 0, "ZKVerifier: Invalid minimum age");
        require(publicInputs.length >= 2, "ZKVerifier: Invalid public inputs");
        
        // publicInputs[0] should be 1 if age >= minAge, 0 otherwise
        // publicInputs[1] should be the minimum age being proven
        require(publicInputs[1] == minAge, "ZKVerifier: Minimum age mismatch");

        proofId = keccak256(abi.encodePacked(
            msg.sender,
            "age_verification",
            minAge,
            proof.a,
            proof.b,
            proof.c,
            block.timestamp,
            totalProofs
        ));

        // Simplified verification for MVP
        bool isValid = publicInputs[0] == 1 && _isValidProofStructure(proof);

        ZKProofData storage zkProof = zkProofs[proofId];
        zkProof.id = proofId;
        zkProof.prover = msg.sender;
        zkProof.proofType = "age_verification";
        zkProof.publicInputs = publicInputs;
        zkProof.verified = isValid;
        zkProof.timestamp = block.timestamp;
        zkProof.expirationTime = block.timestamp + PROOF_VALIDITY_DURATION;

        proverProofs[msg.sender].push(proofId);
        totalProofs++;

        emit ProofVerified(proofId, msg.sender, "age_verification", isValid, block.timestamp);
        return proofId;
    }

    /**
     * @dev Verifies an education credential proof
     * @param degreeLevel Level of education (1=Bachelor, 2=Master, 3=PhD)
     * @param proof The zk-SNARK proof
     * @param publicInputs Public inputs for education verification
     * @return proofId Unique identifier for the verified proof
     */
    function verifyEducationProof(
        uint256 degreeLevel,
        Proof memory proof,
        uint256[] memory publicInputs
    ) external nonReentrant returns (bytes32 proofId) {
        require(degreeLevel >= 1 && degreeLevel <= 3, "ZKVerifier: Invalid degree level");
        require(publicInputs.length >= 2, "ZKVerifier: Invalid public inputs");
        
        // publicInputs[0] should be 1 if has degree at level, 0 otherwise
        // publicInputs[1] should be the degree level being proven
        require(publicInputs[1] == degreeLevel, "ZKVerifier: Degree level mismatch");

        proofId = keccak256(abi.encodePacked(
            msg.sender,
            "education_credential",
            degreeLevel,
            proof.a,
            proof.b,
            proof.c,
            block.timestamp,
            totalProofs
        ));

        bool isValid = publicInputs[0] == 1 && _isValidProofStructure(proof);

        ZKProofData storage zkProof = zkProofs[proofId];
        zkProof.id = proofId;
        zkProof.prover = msg.sender;
        zkProof.proofType = "education_credential";
        zkProof.publicInputs = publicInputs;
        zkProof.verified = isValid;
        zkProof.timestamp = block.timestamp;
        zkProof.expirationTime = block.timestamp + PROOF_VALIDITY_DURATION;

        proverProofs[msg.sender].push(proofId);
        totalProofs++;

        emit ProofVerified(proofId, msg.sender, "education_credential", isValid, block.timestamp);
        return proofId;
    }

    /**
     * @dev Checks if a proof is still valid (not expired)
     * @param proofId ID of the proof to check
     * @return True if proof exists, was verified, and hasn't expired
     */
    function isProofValid(bytes32 proofId) external view proofExists(proofId) returns (bool) {
        ZKProofData memory zkProof = zkProofs[proofId];
        return zkProof.verified && block.timestamp <= zkProof.expirationTime;
    }

    /**
     * @dev Gets proof data by ID
     * @param proofId ID of the proof
     * @return The ZK proof data
     */
    function getProof(bytes32 proofId) external view proofExists(proofId) returns (ZKProofData memory) {
        return zkProofs[proofId];
    }

    /**
     * @dev Gets all proofs by a prover
     * @param prover Address of the prover
     * @return Array of proof IDs
     */
    function getProofsByProver(address prover) external view returns (bytes32[] memory) {
        return proverProofs[prover];
    }

    /**
     * @dev Gets the verifying key for a circuit type
     * @param circuitType Type of the circuit
     * @return The verifying key
     */
    function getVerifyingKey(string memory circuitType) external view returns (VerifyingKey memory) {
        return verifyingKeys[circuitType];
    }

    // Internal functions

    /**
     * @dev Simplified proof verification for MVP
     * In production, this would implement actual zk-SNARK verification
     */
    function _verifyProofSimplified(
        string memory circuitType,
        Proof memory proof,
        uint256[] memory publicInputs
    ) internal pure returns (bool) {
        // Basic structure validation
        if (!_isValidProofStructure(proof)) {
            return false;
        }

        // Circuit-specific validation
        if (keccak256(bytes(circuitType)) == keccak256(bytes("age_verification"))) {
            return publicInputs.length >= 2 && publicInputs[0] <= 1;
        } else if (keccak256(bytes(circuitType)) == keccak256(bytes("education_credential"))) {
            return publicInputs.length >= 2 && publicInputs[0] <= 1 && publicInputs[1] >= 1 && publicInputs[1] <= 3;
        }

        return true; // Default to valid for other circuit types in MVP
    }

    /**
     * @dev Validates basic proof structure
     */
    function _isValidProofStructure(Proof memory proof) internal pure returns (bool) {
        // Check that proof elements are not zero (simplified validation)
        return (proof.a[0] != 0 || proof.a[1] != 0) &&
               (proof.b[0] != 0 || proof.b[1] != 0) &&
               (proof.c[0] != 0 || proof.c[1] != 0);
    }

    /**
     * @dev Adds support for a new circuit type
     * @param circuitType Type of circuit to support
     */
    function addSupportedCircuit(string memory circuitType) external onlyOwner {
        require(bytes(circuitType).length > 0, "ZKVerifier: Invalid circuit type");
        supportedCircuits[circuitType] = true;
    }

    /**
     * @dev Removes support for a circuit type
     * @param circuitType Type of circuit to remove support for
     */
    function removeSupportedCircuit(string memory circuitType) external onlyOwner {
        supportedCircuits[circuitType] = false;
    }
} 