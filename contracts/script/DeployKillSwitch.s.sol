// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {KillSwitch} from "../src/KillSwitch.sol";

/// Deploy with:
///   forge script script/DeployKillSwitch.s.sol --rpc-url $SEPOLIA_RPC_URL --private-key $DEPLOYER_PRIVATE_KEY --broadcast
contract DeployKillSwitch is Script {
    function run() external {
        address maintainer = vm.envAddress("MAINTAINER_ADDRESS");
        vm.startBroadcast();
        KillSwitch killSwitch = new KillSwitch(maintainer);
        vm.stopBroadcast();
        console.log("KillSwitch deployed at", address(killSwitch));
    }
}
