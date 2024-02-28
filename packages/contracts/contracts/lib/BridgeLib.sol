// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.2;

library BridgeLib {
    function zeroGWEI(uint256 value) internal pure returns (uint256) {
        return (value / 1 gwei) * 1 gwei;
    }

    function getTokenId(string memory _name, string memory _symbol) internal pure returns (bytes32) {
        return keccak256(abi.encode(_name, _symbol));
    }
}
