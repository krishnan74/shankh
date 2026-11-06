// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {KillSwitch} from "../src/KillSwitch.sol";

/// One KillSwitch per package (see docs/plan.md ENS name hierarchy) -- this script deploys one
/// instance for a given package's resolver + DNS-encoded name. Deploy with:
///   PACKAGE_RESOLVER_ADDRESS=0x... PACKAGE_DNS_ENCODED_NAME=0x... \
///   forge script script/DeployKillSwitch.s.sol --rpc-url $SEPOLIA_RPC_URL --private-key $DEPLOYER_PRIVATE_KEY --broadcast
contract DeployKillSwitch is Script {
    function run() external {
        address maintainer = vm.envAddress("MAINTAINER_ADDRESS");
        address packageResolver = vm.envAddress("PACKAGE_RESOLVER_ADDRESS");
        bytes memory dnsEncodedName = vm.envBytes("PACKAGE_DNS_ENCODED_NAME");
        vm.startBroadcast();
        KillSwitch killSwitch = new KillSwitch(maintainer, packageResolver, dnsEncodedName);
        vm.stopBroadcast();
        console.log("KillSwitch deployed at", address(killSwitch));
    }
}
