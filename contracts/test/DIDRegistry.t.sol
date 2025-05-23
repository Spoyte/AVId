// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/DIDRegistry.sol";

contract DIDRegistryTest is Test {
    DIDRegistry public didRegistry;
    address public user1;
    address public user2;

    function setUp() public {
        didRegistry = new DIDRegistry();
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");
    }

    function testCreateDID() public {
        vm.startPrank(user1);
        
        string memory identifier = "test-user-1";
        string memory publicKey = "0x1234567890abcdef";
        
        string memory did = didRegistry.createDID(identifier, publicKey);
        
        // Check DID format
        string memory expectedDID = "did:avax:fuji:test-user-1";
        assertEq(did, expectedDID);
        
        // Check DID is active
        assertTrue(didRegistry.isDIDActive(did));
        
        // Check total DIDs
        assertEq(didRegistry.totalDIDs(), 1);
        
        vm.stopPrank();
    }

    function testCreateDIDEmitsEvent() public {
        vm.startPrank(user1);
        
        string memory identifier = "test-user-1";
        string memory publicKey = "0x1234567890abcdef";
        
        vm.expectEmit(true, true, false, true);
        emit DIDRegistry.DIDCreated("did:avax:fuji:test-user-1", user1, block.timestamp);
        
        didRegistry.createDID(identifier, publicKey);
        
        vm.stopPrank();
    }

    function testCannotCreateDuplicateDID() public {
        vm.startPrank(user1);
        
        string memory identifier = "test-user-1";
        string memory publicKey = "0x1234567890abcdef";
        
        // Create first DID
        didRegistry.createDID(identifier, publicKey);
        
        // Try to create duplicate - should fail
        vm.expectRevert("DIDRegistry: DID already exists");
        didRegistry.createDID(identifier, publicKey);
        
        vm.stopPrank();
    }

    function testAddController() public {
        vm.startPrank(user1);
        
        string memory identifier = "test-user-1";
        string memory publicKey = "0x1234567890abcdef";
        string memory did = didRegistry.createDID(identifier, publicKey);
        
        // Add user2 as controller
        didRegistry.addController(did, user2);
        
        // Check user2 is now a controller
        assertTrue(didRegistry.isController(did, user2));
        
        vm.stopPrank();
    }

    function testResolveDID() public {
        vm.startPrank(user1);
        
        string memory identifier = "test-user-1";
        string memory publicKey = "0x1234567890abcdef";
        string memory did = didRegistry.createDID(identifier, publicKey);
        
        DIDRegistry.DIDDocument memory doc = didRegistry.resolveDID(did);
        
        assertEq(doc.id, did);
        assertTrue(doc.active);
        assertEq(doc.controllers.length, 1);
        assertEq(doc.controllers[0], user1);
        
        vm.stopPrank();
    }

    function testDeactivateDID() public {
        vm.startPrank(user1);
        
        string memory identifier = "test-user-1";
        string memory publicKey = "0x1234567890abcdef";
        string memory did = didRegistry.createDID(identifier, publicKey);
        
        // Deactivate DID
        didRegistry.deactivateDID(did);
        
        // Check DID is no longer active
        assertFalse(didRegistry.isDIDActive(did));
        
        vm.stopPrank();
    }

    function testOnlyControllerCanModify() public {
        vm.startPrank(user1);
        string memory identifier = "test-user-1";
        string memory publicKey = "0x1234567890abcdef";
        string memory did = didRegistry.createDID(identifier, publicKey);
        vm.stopPrank();
        
        // user2 tries to add controller - should fail
        vm.startPrank(user2);
        vm.expectRevert("DIDRegistry: Not a controller");
        didRegistry.addController(did, user2);
        vm.stopPrank();
    }
} 