// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Holds the resolver role for a package node's `shankh.revoked` text record.
/// Maintainer-only `revoke` takes effect instantly. `unrevoke` is queued for 48h.
/// Not wired up yet — see docs/plan.md Status table. This is a scaffold stub, not the
/// reviewed contract: do not deploy to mainnet from this file as-is.
contract KillSwitch {
    error NotMaintainer();
    error NothingQueued();
    error StillQueued();

    event Revoked(bytes32 indexed artifactSha256);
    event UnrevokeQueued(bytes32 indexed artifactSha256, uint256 availableAt);
    event Unrevoked(bytes32 indexed artifactSha256);

    uint256 public constant UNREVOKE_DELAY = 48 hours;

    address public immutable maintainer;
    mapping(bytes32 => bool) public revoked;
    mapping(bytes32 => uint256) public unrevokeAvailableAt;

    constructor(address _maintainer) {
        maintainer = _maintainer;
    }

    modifier onlyMaintainer() {
        if (msg.sender != maintainer) revert NotMaintainer();
        _;
    }

    function revoke(bytes32 artifactSha256) external onlyMaintainer {
        revoked[artifactSha256] = true;
        emit Revoked(artifactSha256);
    }

    function queueUnrevoke(bytes32 artifactSha256) external onlyMaintainer {
        unrevokeAvailableAt[artifactSha256] = block.timestamp + UNREVOKE_DELAY;
        emit UnrevokeQueued(artifactSha256, block.timestamp + UNREVOKE_DELAY);
    }

    function unrevoke(bytes32 artifactSha256) external onlyMaintainer {
        uint256 availableAt = unrevokeAvailableAt[artifactSha256];
        if (availableAt == 0) revert NothingQueued();
        if (block.timestamp < availableAt) revert StillQueued();
        revoked[artifactSha256] = false;
        unrevokeAvailableAt[artifactSha256] = 0;
        emit Unrevoked(artifactSha256);
    }
}
