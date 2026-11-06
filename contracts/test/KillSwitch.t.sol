// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {KillSwitch} from "../src/KillSwitch.sol";
import {MockResolver} from "./mocks/MockResolver.sol";

contract KillSwitchTest is Test {
    KillSwitch killSwitch;
    MockResolver resolver;
    address maintainer = address(0xBEEF);
    bytes32 sha = keccak256("rogue-wheel");
    bytes dnsName = hex"0a7368616e6b682d64656d6f04707970690673686e686b6803657468ff"; // doesn't need to be well-formed for these tests

    function setUp() public {
        resolver = new MockResolver();
        killSwitch = new KillSwitch(maintainer, address(resolver), dnsName);
    }

    function test_revokeByMaintainer() public {
        vm.prank(maintainer);
        killSwitch.revoke(sha);
        assertTrue(killSwitch.revoked(sha));
    }

    function test_revokeByNonMaintainerReverts() public {
        vm.expectRevert(KillSwitch.NotMaintainer.selector);
        killSwitch.revoke(sha);
    }

    function test_revokeSyncsResolverTextRecord() public {
        vm.prank(maintainer);
        killSwitch.revoke(sha);
        string memory recorded = resolver.text(dnsName, "shankh.revoked");
        assertEq(recorded, vm.toString(sha));
    }

    function test_unrevokeClearsResolverTextRecordWhenListEmpty() public {
        vm.prank(maintainer);
        killSwitch.revoke(sha);

        vm.prank(maintainer);
        killSwitch.queueUnrevoke(sha);
        vm.warp(block.timestamp + 48 hours + 1);
        vm.prank(maintainer);
        killSwitch.unrevoke(sha);

        assertEq(resolver.text(dnsName, "shankh.revoked"), "");
    }

    function test_revokedListTracksMultipleArtifacts() public {
        bytes32 shaTwo = keccak256("another-rogue-wheel");
        vm.prank(maintainer);
        killSwitch.revoke(sha);
        vm.prank(maintainer);
        killSwitch.revoke(shaTwo);

        assertEq(killSwitch.revokedCount(), 2);
        string memory recorded = resolver.text(dnsName, "shankh.revoked");
        assertEq(recorded, string.concat(vm.toString(sha), ",", vm.toString(shaTwo)));
    }

    function test_unrevokeIsTimelocked() public {
        vm.prank(maintainer);
        killSwitch.revoke(sha);

        vm.prank(maintainer);
        killSwitch.queueUnrevoke(sha);

        vm.prank(maintainer);
        vm.expectRevert(KillSwitch.StillQueued.selector);
        killSwitch.unrevoke(sha);

        vm.warp(block.timestamp + 48 hours + 1);
        vm.prank(maintainer);
        killSwitch.unrevoke(sha);
        assertFalse(killSwitch.revoked(sha));
    }
}
