// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@chainlink/contracts/src/v0.8/ccip/libraries/Client.sol";
import "@chainlink/contracts/src/v0.8/ccip/interfaces/IRouterClient.sol";
import "@chainlink/contracts/src/v0.8/shared/interfaces/LinkTokenInterface.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./DIDRegistry.sol";
import "./CredentialManager.sol";
import "./ZKVerifier.sol";

/**
 * @title CCIPGateway
 * @dev Cross-chain identity verification using Chainlink CCIP
 * @notice Enables identity verification across different blockchain networks
 */
contract CCIPGateway is Ownable, ReentrancyGuard {
    // Events
    event IdentityVerificationSent(
        bytes32 indexed messageId,
        uint64 indexed destinationChain,
        address indexed recipient,
        string did,
        bytes32 proofId
    );
    event IdentityVerificationReceived(
        bytes32 indexed messageId,
        uint64 indexed sourceChain,
        address indexed sender,
        string did,
        bytes32 proofId,
        bool isValid
    );
    event CrossChainVerificationCompleted(
        bytes32 indexed requestId,
        string indexed did,
        bool verified,
        uint256 timestamp
    );

    // Structs
    struct IdentityVerificationMessage {
        string did;
        bytes32 proofId;
        string proofType;
        uint256[] publicInputs;
        address requester;
        uint256 timestamp;
    }

    struct CrossChainVerificationRequest {
        bytes32 id;
        string did;
        bytes32 proofId;
        uint64 destinationChain;
        address destinationContract;
        address requester;
        bool completed;
        bool verified;
        uint256 timestamp;
    }

    // State variables
    IRouterClient public immutable ccipRouter;
    LinkTokenInterface public immutable linkToken;
    DIDRegistry public immutable didRegistry;
    CredentialManager public immutable credentialManager;
    ZKVerifier public immutable zkVerifier;

    mapping(uint64 => bool) public allowedChains;
    mapping(address => bool) public allowedSenders;
    mapping(bytes32 => CrossChainVerificationRequest) public verificationRequests;
    mapping(bytes32 => IdentityVerificationMessage) public receivedMessages;
    
    uint256 public totalVerificationRequests;
    uint256 public gasLimit = 200_000;

    // Modifiers
    modifier onlyAllowedChain(uint64 chainSelector) {
        require(allowedChains[chainSelector], "CCIPGateway: Chain not allowed");
        _;
    }

    modifier onlyAllowedSender(address sender) {
        require(allowedSenders[sender], "CCIPGateway: Sender not allowed");
        _;
    }

    constructor(
        address _router,
        address _linkToken,
        address _didRegistry,
        address _credentialManager,
        address _zkVerifier
    ) {
        require(_router != address(0), "CCIPGateway: Invalid router address");
        require(_linkToken != address(0), "CCIPGateway: Invalid LINK token address");
        require(_didRegistry != address(0), "CCIPGateway: Invalid DID registry address");
        require(_credentialManager != address(0), "CCIPGateway: Invalid credential manager address");
        require(_zkVerifier != address(0), "CCIPGateway: Invalid ZK verifier address");

        ccipRouter = IRouterClient(_router);
        linkToken = LinkTokenInterface(_linkToken);
        didRegistry = DIDRegistry(_didRegistry);
        credentialManager = CredentialManager(_credentialManager);
        zkVerifier = ZKVerifier(_zkVerifier);
    }

    /**
     * @dev Sends identity verification request to another chain
     * @param destinationChain Chain selector for destination
     * @param destinationContract Address of the contract on destination chain
     * @param did DID to verify
     * @param proofId ZK proof ID for verification
     * @return requestId Unique identifier for the verification request
     */
    function sendIdentityVerification(
        uint64 destinationChain,
        address destinationContract,
        string memory did,
        bytes32 proofId
    ) external onlyAllowedChain(destinationChain) nonReentrant returns (bytes32 requestId) {
        require(didRegistry.isDIDActive(did), "CCIPGateway: DID is not active");
        require(zkVerifier.isProofValid(proofId), "CCIPGateway: Invalid or expired proof");

        // Get proof data
        ZKVerifier.ZKProofData memory proofData = zkVerifier.getProof(proofId);
        
        // Create verification message
        IdentityVerificationMessage memory message = IdentityVerificationMessage({
            did: did,
            proofId: proofId,
            proofType: proofData.proofType,
            publicInputs: proofData.publicInputs,
            requester: msg.sender,
            timestamp: block.timestamp
        });

        // Encode message
        bytes memory encodedMessage = abi.encode(message);

        // Create CCIP message
        Client.EVM2AnyMessage memory ccipMessage = Client.EVM2AnyMessage({
            receiver: abi.encode(destinationContract),
            data: encodedMessage,
            tokenAmounts: new Client.EVMTokenAmount[](0),
            extraArgs: Client._argsToBytes(Client.EVMExtraArgsV1({gasLimit: gasLimit})),
            feeToken: address(linkToken)
        });

        // Calculate fee
        uint256 fee = ccipRouter.getFee(destinationChain, ccipMessage);
        require(linkToken.balanceOf(address(this)) >= fee, "CCIPGateway: Insufficient LINK balance");

        // Approve LINK spending
        linkToken.approve(address(ccipRouter), fee);

        // Send message
        bytes32 messageId = ccipRouter.ccipSend(destinationChain, ccipMessage);

        // Generate request ID
        requestId = keccak256(abi.encodePacked(
            messageId,
            did,
            proofId,
            destinationChain,
            block.timestamp,
            totalVerificationRequests
        ));

        // Store verification request
        CrossChainVerificationRequest storage request = verificationRequests[requestId];
        request.id = requestId;
        request.did = did;
        request.proofId = proofId;
        request.destinationChain = destinationChain;
        request.destinationContract = destinationContract;
        request.requester = msg.sender;
        request.completed = false;
        request.verified = false;
        request.timestamp = block.timestamp;

        totalVerificationRequests++;

        emit IdentityVerificationSent(messageId, destinationChain, destinationContract, did, proofId);
        return requestId;
    }

    /**
     * @dev Receives and processes identity verification from another chain
     * @param messageId CCIP message ID
     * @param sourceChain Chain selector for source chain
     * @param sender Address of the sender on source chain
     * @param data Encoded verification message
     */
    function receiveIdentityVerification(
        bytes32 messageId,
        uint64 sourceChain,
        address sender,
        bytes memory data
    ) external onlyAllowedChain(sourceChain) onlyAllowedSender(sender) {
        // Decode message
        IdentityVerificationMessage memory message = abi.decode(data, (IdentityVerificationMessage));

        // Verify the proof (simplified for cross-chain)
        bool isValid = _verifyCrossChainProof(message);

        // Store received message
        receivedMessages[messageId] = message;

        emit IdentityVerificationReceived(
            messageId,
            sourceChain,
            sender,
            message.did,
            message.proofId,
            isValid
        );

        // Complete verification
        _completeCrossChainVerification(messageId, message.did, isValid);
    }

    /**
     * @dev Verifies identity locally without cross-chain communication
     * @param did DID to verify
     * @param proofId ZK proof ID
     * @return True if identity is valid
     */
    function verifyIdentityLocal(
        string memory did,
        bytes32 proofId
    ) external view returns (bool) {
        // Check if DID is active
        if (!didRegistry.isDIDActive(did)) {
            return false;
        }

        // Check if proof is valid
        if (!zkVerifier.isProofValid(proofId)) {
            return false;
        }

        return true;
    }

    /**
     * @dev Gets verification request by ID
     * @param requestId ID of the verification request
     * @return The verification request data
     */
    function getVerificationRequest(bytes32 requestId) external view returns (CrossChainVerificationRequest memory) {
        return verificationRequests[requestId];
    }

    /**
     * @dev Gets received message by message ID
     * @param messageId CCIP message ID
     * @return The received verification message
     */
    function getReceivedMessage(bytes32 messageId) external view returns (IdentityVerificationMessage memory) {
        return receivedMessages[messageId];
    }

    /**
     * @dev Estimates fee for cross-chain verification
     * @param destinationChain Chain selector for destination
     * @param destinationContract Address of the contract on destination chain
     * @param did DID to verify
     * @param proofId ZK proof ID
     * @return Estimated fee in LINK tokens
     */
    function estimateVerificationFee(
        uint64 destinationChain,
        address destinationContract,
        string memory did,
        bytes32 proofId
    ) external view returns (uint256) {
        // Get proof data
        ZKVerifier.ZKProofData memory proofData = zkVerifier.getProof(proofId);
        
        // Create verification message
        IdentityVerificationMessage memory message = IdentityVerificationMessage({
            did: did,
            proofId: proofId,
            proofType: proofData.proofType,
            publicInputs: proofData.publicInputs,
            requester: msg.sender,
            timestamp: block.timestamp
        });

        // Encode message
        bytes memory encodedMessage = abi.encode(message);

        // Create CCIP message
        Client.EVM2AnyMessage memory ccipMessage = Client.EVM2AnyMessage({
            receiver: abi.encode(destinationContract),
            data: encodedMessage,
            tokenAmounts: new Client.EVMTokenAmount[](0),
            extraArgs: Client._argsToBytes(Client.EVMExtraArgsV1({gasLimit: gasLimit})),
            feeToken: address(linkToken)
        });

        return ccipRouter.getFee(destinationChain, ccipMessage);
    }

    // Admin functions

    /**
     * @dev Adds an allowed destination chain
     * @param chainSelector Chain selector to allow
     */
    function addAllowedChain(uint64 chainSelector) external onlyOwner {
        allowedChains[chainSelector] = true;
    }

    /**
     * @dev Removes an allowed destination chain
     * @param chainSelector Chain selector to remove
     */
    function removeAllowedChain(uint64 chainSelector) external onlyOwner {
        allowedChains[chainSelector] = false;
    }

    /**
     * @dev Adds an allowed sender address
     * @param sender Address to allow as sender
     */
    function addAllowedSender(address sender) external onlyOwner {
        require(sender != address(0), "CCIPGateway: Invalid sender address");
        allowedSenders[sender] = true;
    }

    /**
     * @dev Removes an allowed sender address
     * @param sender Address to remove from allowed senders
     */
    function removeAllowedSender(address sender) external onlyOwner {
        allowedSenders[sender] = false;
    }

    /**
     * @dev Updates gas limit for CCIP messages
     * @param newGasLimit New gas limit
     */
    function updateGasLimit(uint256 newGasLimit) external onlyOwner {
        require(newGasLimit > 0, "CCIPGateway: Invalid gas limit");
        gasLimit = newGasLimit;
    }

    /**
     * @dev Withdraws LINK tokens from contract
     * @param to Address to send LINK tokens to
     * @param amount Amount of LINK tokens to withdraw
     */
    function withdrawLink(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "CCIPGateway: Invalid recipient address");
        require(linkToken.transfer(to, amount), "CCIPGateway: LINK transfer failed");
    }

    /**
     * @dev Deposits LINK tokens to contract for paying CCIP fees
     * @param amount Amount of LINK tokens to deposit
     */
    function depositLink(uint256 amount) external {
        require(linkToken.transferFrom(msg.sender, address(this), amount), "CCIPGateway: LINK transfer failed");
    }

    // Internal functions

    /**
     * @dev Verifies a cross-chain proof (simplified for MVP)
     * @param message The verification message
     * @return True if proof is valid
     */
    function _verifyCrossChainProof(IdentityVerificationMessage memory message) internal pure returns (bool) {
        // Simplified verification for MVP
        // In production, this would implement more sophisticated verification
        
        // Check basic message validity
        if (bytes(message.did).length == 0 || message.proofId == bytes32(0)) {
            return false;
        }

        // Check proof type specific validation
        if (keccak256(bytes(message.proofType)) == keccak256(bytes("age_verification"))) {
            return message.publicInputs.length >= 2 && message.publicInputs[0] <= 1;
        } else if (keccak256(bytes(message.proofType)) == keccak256(bytes("education_credential"))) {
            return message.publicInputs.length >= 2 && 
                   message.publicInputs[0] <= 1 && 
                   message.publicInputs[1] >= 1 && 
                   message.publicInputs[1] <= 3;
        }

        return true; // Default to valid for other proof types in MVP
    }

    /**
     * @dev Completes cross-chain verification
     * @param messageId CCIP message ID
     * @param did DID that was verified
     * @param verified Whether verification was successful
     */
    function _completeCrossChainVerification(
        bytes32 messageId,
        string memory did,
        bool verified
    ) internal {
        emit CrossChainVerificationCompleted(messageId, did, verified, block.timestamp);
    }
} 