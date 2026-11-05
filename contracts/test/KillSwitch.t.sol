// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {KillSwitch} from "../src/KillSwitch.sol";

contract KillSwitchTest is Test {
    KillSwitch killSwitch;
    address maintainer = address(0xBEEF);
    bytes32 sha = keccak256("rogue-wheel");

    function setUp() public {
        killSwitch = new KillSwitch(maintainer);
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
