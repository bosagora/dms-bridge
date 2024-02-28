// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.2;

interface IBridgeLiquidity {
    function depositLiquidity(bytes32 _tokenId, uint256 _amount, bytes calldata _signature) external payable;

    function withdrawLiquidity(bytes32 _tokenId, uint256 _amount) external;

    function getLiquidity(bytes32 _tokenId, address _account) external view returns (uint256);
}
