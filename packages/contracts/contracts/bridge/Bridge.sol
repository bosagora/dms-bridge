// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.2;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

import "loyalty-tokens/contracts/BIP20/BIP20DelegatedTransfer.sol";

import "../interfaces/IBridge.sol";
import "../interfaces/IBridgeLiquidity.sol";
import "../interfaces/IBridgeValidator.sol";
import "./BridgeStorage.sol";

import "../lib/BridgeLib.sol";

contract Bridge is BridgeStorage, Initializable, OwnableUpgradeable, UUPSUpgradeable, IBridge, IBridgeLiquidity {
    event TokenRegistered(bytes32 tokenId, address tokenAddress);

    event BridgeDeposited(bytes32 tokenId, bytes32 depositId, address account, uint256 amount);
    event BridgeWithdrawn(bytes32 tokenId, bytes32 withdrawId, address account, uint256 amount);

    event DepositedLiquidity(bytes32 tokenId, address account, uint256 amount, uint256 liquidity);
    event WithdrawnLiquidity(bytes32 tokenId, address account, uint256 amount, uint256 liquidity);

    modifier onlyValidator(address _account) {
        require(validatorContract.isValidator(_account), "1000");
        _;
    }

    modifier notExistDeposit(bytes32 _depositId) {
        require(deposits[_depositId].account == address(0x0), "1711");
        _;
    }

    modifier existWithdraw(bytes32 _withdrawId) {
        require(withdraws[_withdrawId].account != address(0x0), "1712");
        _;
    }

    modifier notConfirmed(bytes32 _withdrawId, address _validator) {
        require(!confirmations[_withdrawId][_validator], "1715");
        _;
    }

    modifier onlyOperator() {
        require(_msgSender() == owner());
        _;
    }

    function initialize(address _validatorAddress, address _feeAccount) external initializer {
        __UUPSUpgradeable_init();
        __Ownable_init_unchained();

        feeAccount = _feeAccount;
        validatorContract = IBridgeValidator(_validatorAddress);
    }

    function _authorizeUpgrade(address newImplementation) internal virtual override {
        require(_msgSender() == owner(), "Unauthorized access");
    }

    function isAvailableDepositId(bytes32 _depositId) external view override returns (bool) {
        if (deposits[_depositId].account == address(0x0)) return true;
        else return false;
    }

    function isAvailableWithdrawId(bytes32 _withdrawId) external view override returns (bool) {
        if (withdraws[_withdrawId].account == address(0x0)) return true;
        else return false;
    }

    function registerToken(bytes32 _tokenId, address _tokenAddress) external onlyOperator {
        if (_tokenId == bytes32(0x00) && _tokenAddress == address(0x00)) {
            tokenInfos[_tokenId] = TokenInfo(
                BIP20DelegatedTransfer(address(0x00)),
                address(0x0),
                TokenStatus.Registered,
                true,
                5e18
            );
            emit TokenRegistered(_tokenId, _tokenAddress);
        } else {
            require(_tokenAddress != address(0));
            BIP20DelegatedTransfer token = BIP20DelegatedTransfer(_tokenAddress);
            bytes32 tokenId = BridgeLib.getTokenId(token.name(), token.symbol());
            require(tokenId == _tokenId);

            tokenInfos[_tokenId] = TokenInfo(token, _tokenAddress, TokenStatus.Registered, false, 5e18);
            emit TokenRegistered(_tokenId, _tokenAddress);
        }
    }

    /// @notice 브리지에 자금을 에치합니다.
    function depositToBridge(
        bytes32 _tokenId,
        bytes32 _depositId,
        address _account,
        uint256 _amount,
        bytes calldata _signature
    ) external payable override notExistDeposit(_depositId) {
        require(tokenInfos[_tokenId].status == TokenStatus.Registered, "1713");

        if (tokenInfos[_tokenId].native) {
            DepositData memory data = DepositData({ tokenId: _tokenId, account: msg.sender, amount: msg.value });
            deposits[_depositId] = data;
            emit BridgeDeposited(_tokenId, _depositId, data.account, data.amount);
        } else {
            require(_amount % 1 gwei == 0, "1030");
            require(_amount > tokenInfos[_tokenId].fee * 2, "1031");

            BIP20DelegatedTransfer token = tokenInfos[_tokenId].token;
            if (token.delegatedTransfer(_account, address(this), _amount, _signature)) {
                DepositData memory data = DepositData({ tokenId: _tokenId, account: _account, amount: _amount });
                deposits[_depositId] = data;
                emit BridgeDeposited(_tokenId, _depositId, data.account, data.amount);
            }
        }
    }

    /// @notice 브리지에서 자금을 인출합니다. 검증자들의 합의가 완료되면 인출이 됩니다.
    function withdrawFromBridge(
        bytes32 _tokenId,
        bytes32 _withdrawId,
        address _account,
        uint256 _amount
    ) external override onlyValidator(_msgSender()) notConfirmed(_withdrawId, _msgSender()) {
        require(tokenInfos[_tokenId].status == TokenStatus.Registered, "1713");

        if (tokenInfos[_tokenId].native) {
            if (withdraws[_withdrawId].account == address(0x0)) {
                WithdrawData memory data = WithdrawData({
                    tokenId: _tokenId,
                    account: _account,
                    amount: _amount,
                    executed: false
                });
                withdraws[_withdrawId] = data;
            } else {
                require(withdraws[_withdrawId].tokenId == _tokenId, "1719");
                require(withdraws[_withdrawId].account == _account, "1717");
                require(withdraws[_withdrawId].amount == _amount, "1718");
            }
            confirmations[_withdrawId][_msgSender()] = true;

            if (!withdraws[_withdrawId].executed && _isConfirmed(_withdrawId)) {
                uint256 withdrawalAmount = _amount - tokenInfos[_tokenId].fee;
                if (address(this).balance >= withdraws[_withdrawId].amount) {
                    payable(_account).transfer(withdrawalAmount);
                    payable(feeAccount).transfer(tokenInfos[_tokenId].fee);
                    withdraws[_withdrawId].executed = true;
                    emit BridgeWithdrawn(_tokenId, _withdrawId, _account, withdrawalAmount);
                }
            }
        } else {
            require(_amount % 1 gwei == 0, "1030");
            require(_amount > tokenInfos[_tokenId].fee * 2, "1031");
            BIP20DelegatedTransfer token = tokenInfos[_tokenId].token;
            if (withdraws[_withdrawId].account == address(0x0)) {
                WithdrawData memory data = WithdrawData({
                    tokenId: _tokenId,
                    account: _account,
                    amount: _amount,
                    executed: false
                });
                withdraws[_withdrawId] = data;
            } else {
                require(withdraws[_withdrawId].tokenId == _tokenId, "1719");
                require(withdraws[_withdrawId].account == _account, "1717");
                require(withdraws[_withdrawId].amount == _amount, "1718");
            }
            confirmations[_withdrawId][_msgSender()] = true;

            if (!withdraws[_withdrawId].executed && _isConfirmed(_withdrawId)) {
                uint256 withdrawalAmount = _amount - tokenInfos[_tokenId].fee;
                if (token.balanceOf(address(this)) >= withdraws[_withdrawId].amount) {
                    token.transfer(_account, withdrawalAmount);
                    token.transfer(feeAccount, tokenInfos[_tokenId].fee);
                    withdraws[_withdrawId].executed = true;
                    emit BridgeWithdrawn(_tokenId, _withdrawId, _account, withdrawalAmount);
                }
            }
        }
    }

    /// @notice 브리지에 자금을 인출합니다.
    function executeWithdraw(
        bytes32 _withdrawId
    ) external override onlyValidator(_msgSender()) existWithdraw(_withdrawId) {
        if (!withdraws[_withdrawId].executed && _isConfirmed(_withdrawId)) {
            bytes32 tokenId = withdraws[_withdrawId].tokenId;
            require(tokenInfos[tokenId].status == TokenStatus.Registered, "1713");

            uint256 withdrawalAmount = withdraws[_withdrawId].amount - tokenInfos[tokenId].fee;
            if (tokenInfos[tokenId].native) {
                if (address(this).balance >= withdraws[_withdrawId].amount) {
                    payable(withdraws[_withdrawId].account).transfer(withdrawalAmount);
                    payable(feeAccount).transfer(tokenInfos[tokenId].fee);
                    withdraws[_withdrawId].executed = true;
                    emit BridgeWithdrawn(tokenId, _withdrawId, withdraws[_withdrawId].account, withdrawalAmount);
                }
            } else {
                BIP20DelegatedTransfer token = tokenInfos[tokenId].token;
                if (token.balanceOf(address(this)) >= withdraws[_withdrawId].amount) {
                    token.transfer(withdraws[_withdrawId].account, withdrawalAmount);
                    token.transfer(feeAccount, tokenInfos[tokenId].fee);
                    withdraws[_withdrawId].executed = true;
                    emit BridgeWithdrawn(tokenId, _withdrawId, withdraws[_withdrawId].account, withdrawalAmount);
                }
            }
        }
    }

    /// @notice 검증자들의 합의가 완료되었는지 체크합니다.
    function isConfirmed(bytes32 _withdrawId) external view override returns (bool) {
        return _isConfirmed(_withdrawId);
    }

    /// @notice 검증자들의 합의가 완료되었는지 체크합니다.
    function _isConfirmed(bytes32 _withdrawId) internal view returns (bool) {
        uint256 count = 0;
        for (uint256 i = 0; i < validatorContract.getLength(); i++) {
            address validator = validatorContract.itemOf(i);
            if (confirmations[_withdrawId][validator]) count += 1;
            if (count >= validatorContract.getRequired()) return true;
        }
        return false;
    }

    /// @notice 예치정보를 조회합니다
    function getDepositInfo(bytes32 _depositId) external view override returns (DepositData memory) {
        return deposits[_depositId];
    }

    /// @notice 인출정보를 조회합니다
    function getWithdrawInfo(bytes32 _withdrawId) external view override returns (WithdrawData memory) {
        return withdraws[_withdrawId];
    }

    function getFee(bytes32 _tokenId) external view override returns (uint256) {
        return tokenInfos[_tokenId].fee;
    }

    function changeFee(bytes32 _tokenId, uint256 _fee) external override {
        require(tokenInfos[_tokenId].status == TokenStatus.Registered, "1713");
        require(_msgSender() == owner(), "1050");
        tokenInfos[_tokenId].fee = _fee;
    }

    /// @notice 브리지를 위한 유동성 자금을 예치합니다.
    function depositLiquidity(bytes32 _tokenId, uint256 _amount, bytes calldata _signature) external payable override {
        require(tokenInfos[_tokenId].status == TokenStatus.Registered, "1713");

        if (tokenInfos[_tokenId].native) {
            if (msg.value > 0) {
                liquidity[_tokenId][_msgSender()] += msg.value;
                emit DepositedLiquidity(_tokenId, _msgSender(), msg.value, liquidity[_tokenId][_msgSender()]);
            }
        } else {
            BIP20DelegatedTransfer token = tokenInfos[_tokenId].token;
            require(token.balanceOf(_msgSender()) >= _amount, "1511");
            require(_amount % 1 gwei == 0, "1030");

            if (token.delegatedTransfer(_msgSender(), address(this), _amount, _signature)) {
                liquidity[_tokenId][_msgSender()] += _amount;
                emit DepositedLiquidity(_tokenId, _msgSender(), _amount, liquidity[_tokenId][_msgSender()]);
            }
        }
    }

    /// @notice 브리지를 위한 유동성 자금을 인출합니다.
    function withdrawLiquidity(bytes32 _tokenId, uint256 _amount) external override {
        require(tokenInfos[_tokenId].status == TokenStatus.Registered, "1713");

        if (tokenInfos[_tokenId].native) {
            require(liquidity[_tokenId][_msgSender()] > _amount, "1514");
            require(address(this).balance > _amount, "1511");

            payable(_msgSender()).transfer(_amount);
            liquidity[_tokenId][_msgSender()] -= _amount;
            emit WithdrawnLiquidity(_tokenId, _msgSender(), _amount, liquidity[_tokenId][_msgSender()]);
        } else {
            BIP20DelegatedTransfer token = tokenInfos[_tokenId].token;
            require(liquidity[_tokenId][_msgSender()] > _amount, "1514");
            require(token.balanceOf(address(this)) > _amount, "1511");
            require(_amount % 1 gwei == 0, "1030");

            token.transfer(_msgSender(), _amount);
            liquidity[_tokenId][_msgSender()] -= _amount;
            emit WithdrawnLiquidity(_tokenId, _msgSender(), _amount, liquidity[_tokenId][_msgSender()]);
        }
    }

    /// @notice 브리지를 위한 유동성 자금을 조회합니다.
    function getLiquidity(bytes32 _tokenId, address _account) external view override returns (uint256) {
        return liquidity[_tokenId][_account];
    }
}
