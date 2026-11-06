// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IPermissionedResolver {
    function setText(bytes calldata name, string calldata key, string calldata value) external;
}

/// @notice One per package (see docs/plan.md ENS name hierarchy). Knows its own package's
/// resolver and DNS-encoded name, and keeps that resolver's `shankh.revoked` text record in sync
/// with its own bookkeeping below. Deployed holding SET_TEXT scoped to just that one key (see
/// ensv2-guide.md section 5's recipe) -- it cannot touch any other record on the resolver.
/// Maintainer-only `revoke` takes effect instantly. `unrevoke` is queued for 48h.
/// This is a working first pass, not a reviewed contract: do not deploy to mainnet from this
/// file as-is (see CLAUDE.md).
contract KillSwitch {
    error NotMaintainer();
    error NothingQueued();
    error StillQueued();

    event Revoked(bytes32 indexed artifactSha256);
    event UnrevokeQueued(bytes32 indexed artifactSha256, uint256 availableAt);
    event Unrevoked(bytes32 indexed artifactSha256);

    uint256 public constant UNREVOKE_DELAY = 48 hours;

    address public immutable maintainer;
    IPermissionedResolver public immutable resolver;
    bytes public dnsEncodedName;

    mapping(bytes32 => bool) public revoked;
    mapping(bytes32 => uint256) public unrevokeAvailableAt;
    bytes32[] public revokedList;

    constructor(address _maintainer, address _resolver, bytes memory _dnsEncodedName) {
        maintainer = _maintainer;
        resolver = IPermissionedResolver(_resolver);
        dnsEncodedName = _dnsEncodedName;
    }

    modifier onlyMaintainer() {
        if (msg.sender != maintainer) revert NotMaintainer();
        _;
    }

    function revoke(bytes32 artifactSha256) external onlyMaintainer {
        if (!revoked[artifactSha256]) {
            revoked[artifactSha256] = true;
            revokedList.push(artifactSha256);
        }
        emit Revoked(artifactSha256);
        _syncResolver();
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
        _removeFromRevokedList(artifactSha256);
        emit Unrevoked(artifactSha256);
        _syncResolver();
    }

    function revokedCount() external view returns (uint256) {
        return revokedList.length;
    }

    function _removeFromRevokedList(bytes32 artifactSha256) private {
        uint256 len = revokedList.length;
        for (uint256 i = 0; i < len; i++) {
            if (revokedList[i] == artifactSha256) {
                revokedList[i] = revokedList[len - 1];
                revokedList.pop();
                return;
            }
        }
    }

    function _syncResolver() private {
        resolver.setText(dnsEncodedName, "shankh.revoked", _encodeRevokedList());
    }

    function _encodeRevokedList() private view returns (string memory) {
        uint256 len = revokedList.length;
        if (len == 0) return "";
        bytes memory out = _toHexString(revokedList[0]);
        for (uint256 i = 1; i < len; i++) {
            out = bytes.concat(out, ",", _toHexString(revokedList[i]));
        }
        return string(out);
    }

    function _toHexString(bytes32 value) private pure returns (bytes memory) {
        bytes memory alphabet = "0123456789abcdef";
        bytes memory str = new bytes(66);
        str[0] = "0";
        str[1] = "x";
        for (uint256 i = 0; i < 32; i++) {
            str[2 + i * 2] = alphabet[uint8(value[i] >> 4)];
            str[3 + i * 2] = alphabet[uint8(value[i] & 0x0f)];
        }
        return str;
    }
}
