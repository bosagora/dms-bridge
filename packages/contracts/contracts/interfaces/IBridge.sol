// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.2;

interface IBridge {
    struct DepositData {
        bytes32 tokenId;
        address account;
        uint256 amount;
    }

    struct WithdrawData {
        bytes32 tokenId;
        address account;
        uint256 amount;
        bool executed;
    }

    function isAvailableDepositId(bytes32 _depositId) external view returns (bool);

    function isAvailableWithdrawId(bytes32 _withdrawId) external view returns (bool);

    function depositToBridge(
        bytes32 _tokenId,
        bytes32 _depositId,
        address _account,
        uint256 _amount,
        bytes calldata _signature
    ) external payable;

    function withdrawFromBridge(bytes32 _tokenId, bytes32 _withdrawId, address _account, uint256 _amount) external;

    function executeWithdraw(bytes32 _withdrawId) external;

    function isConfirmed(bytes32 _withdrawId) external view returns (bool);

    function getDepositInfo(bytes32 _depositId) external view returns (DepositData memory);

    function getWithdrawInfo(bytes32 _withdrawId) external view returns (WithdrawData memory);

    function getFee(bytes32 _tokenId) external view returns (uint256);

    function changeFee(bytes32 _tokenId, uint256 _fee) external;
}
