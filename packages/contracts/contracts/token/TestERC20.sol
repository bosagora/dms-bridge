// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.2;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TestERC20 is ERC20 {
    /*
     * Public functions
     */
    constructor(address owner_) ERC20("TestERC20", "TestERC20") {
        _mint(owner_, 1e10 * 1e18);
    }

    function multiTransfer(address[] calldata to, uint256 amount) public returns (bool) {
        for (uint256 idx = 0; idx < to.length; idx++) {
            _transfer(msg.sender, to[idx], amount);
        }
        return true;
    }
}
