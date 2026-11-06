// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// Minimal stand-in for PermissionedResolverImpl's setText, for KillSwitch tests only.
/// Real resolver behavior (DNS encoding, ENSIP-10 resolve(), per-key role scoping) is covered
/// separately in scripts/ens/*, not re-mocked here.
contract MockResolver {
    mapping(bytes32 => mapping(string => string)) public texts;

    function setText(bytes calldata name, string calldata key, string calldata value) external {
        texts[keccak256(name)][key] = value;
    }

    function text(bytes calldata name, string calldata key) external view returns (string memory) {
        return texts[keccak256(name)][key];
    }
}
