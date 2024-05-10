// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.2;

interface IBridgeLiquidity {
    event DepositedLiquidity(bytes32 tokenId, address account, uint256 amount, uint256 liquidity);
    event WithdrawnLiquidity(bytes32 tokenId, address account, uint256 amount, uint256 liquidity);

    function depositLiquidity(
        bytes32 _tokenId,
        uint256 _amount,
        uint256 _expiry,
        bytes calldata _signature
    ) external payable;

    function withdrawLiquidity(bytes32 _tokenId, uint256 _amount) external;

    function getLiquidity(bytes32 _tokenId, address _account) external view returns (uint256);
}
