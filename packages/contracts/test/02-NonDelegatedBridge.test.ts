import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-waffle";
import "@openzeppelin/hardhat-upgrades";

import { Amount } from "../src/utils/Amount";
import { ContractUtils } from "../src/utils/ContractUtils";
import { Bridge, NonDelegatedBridge, TestERC20} from "../typechain-types";
import { Deployments } from "./helper/NoDelegatedDeployments";

import chai, { expect } from "chai";
import { solidity } from "ethereum-waffle";

import { Wallet } from "ethers";

// tslint:disable-next-line:no-implicit-dependencies
import { arrayify } from "@ethersproject/bytes";
import { AddressZero, HashZero } from "@ethersproject/constants";

import * as hre from "hardhat";

chai.use(solidity);

interface IShopData {
    shopId: string;
    name: string;
    currency: string;
    wallet: Wallet;
}

describe("Test for NonDelegatedBridge", () => {
    const deployments = new Deployments();
    let tokenContract: TestERC20;
    let bridgeContract: Bridge;

    const amount = Amount.make(100_000, 18).value;
    const fee = Amount.make(0.1, 18).value;

    const deployAllContract = async (shopData: IShopData[]) => {
        await deployments.doDeployAll();
        tokenContract = deployments.getContract("TestERC20") as TestERC20;
        bridgeContract = deployments.getContract("Bridge") as NonDelegatedBridge;
    };

    let tokenId0: string;
    let tokenId1: string;
    let depositId: string;
    it("Deploy", async () => {
        await deployAllContract([]);
    });

    it("Register token", async () => {
        // Native Token
        tokenId0 = HashZero;
        await bridgeContract.connect(deployments.accounts.deployer).registerToken(HashZero, AddressZero);
        // ERC20 Token
        tokenId1 = ContractUtils.getTokenId(await tokenContract.name(), await tokenContract.symbol());
        await bridgeContract.connect(deployments.accounts.deployer).registerToken(tokenId1, tokenContract.address);
    });

    it("Deposit Native Liquidity", async () => {
        const liquidityAmount = Amount.make(1_000_000_000, 18).value;
        const signature = await ContractUtils.signMessage(deployments.accounts.deployer, arrayify(HashZero));
        const tx1 = await bridgeContract
            .connect(deployments.accounts.deployer)
            .depositLiquidity(tokenId0, liquidityAmount, 0, signature, { value: liquidityAmount });
        console.log(`Deposit liquidity native token (tx: ${tx1.hash})...`);
        await tx1.wait();

        expect(await bridgeContract.getTotalLiquidity(HashZero)).to.deep.equal(liquidityAmount);
    });

    it("Deposit ERC20 Liquidity", async () => {
        const liquidityAmount = Amount.make(1_000_000_000, 18).value;
        await tokenContract.connect(deployments.accounts.deployer).approve(bridgeContract.address, liquidityAmount);
        const tx1 = await bridgeContract
            .connect(deployments.accounts.deployer)
            .depositLiquidity(tokenId1, liquidityAmount, 0, HashZero);
        console.log(`Deposit liquidity token (tx: ${tx1.hash})...`);
        await tx1.wait();

        expect(await bridgeContract.getTotalLiquidity(tokenId1)).to.deep.equal(liquidityAmount);
    });

    it("Deposit native token to Main Bridge", async () => {
        const oldLiquidity = await hre.ethers.provider.getBalance(bridgeContract.address);
        depositId = ContractUtils.getRandomId(deployments.accounts.users[0].address);
        const signature = await ContractUtils.signMessage(deployments.accounts.users[0], arrayify(HashZero));
        await expect(
            bridgeContract
                .connect(deployments.accounts.users[0])
                .depositToBridge(tokenId0, depositId, AddressZero, 0, 0, signature, {
                    value: amount,
                })
        )
            .to.emit(bridgeContract, "BridgeDeposited")
            .withNamedArgs({
                tokenId: tokenId0,
                depositId,
                account: deployments.accounts.users[0].address,
                amount,
            });
        expect(await hre.ethers.provider.getBalance(bridgeContract.address)).to.deep.equal(oldLiquidity.add(amount));
    });

    it("Withdraw native token from Main Bridge", async () => {
        const oldLiquidity = await hre.ethers.provider.getBalance(bridgeContract.address);
        const oldTokenBalance = await hre.ethers.provider.getBalance(deployments.accounts.users[0].address);
        const oldFeeBalance = await hre.ethers.provider.getBalance(deployments.accounts.protocolFee.address);

        await bridgeContract
            .connect(deployments.accounts.bridgeValidators[0])
            .withdrawFromBridge(tokenId0, depositId, deployments.accounts.users[0].address, amount);
        await expect(
            bridgeContract
                .connect(deployments.accounts.bridgeValidators[1])
                .withdrawFromBridge(tokenId0, depositId, deployments.accounts.users[0].address, amount)
        )
            .to.emit(bridgeContract, "BridgeWithdrawn")
            .withNamedArgs({
                tokenId: tokenId0,
                withdrawId: depositId,
                account: deployments.accounts.users[0].address,
                amount: amount.sub(fee),
            });

        expect(await hre.ethers.provider.getBalance(bridgeContract.address)).to.deep.equal(oldLiquidity.sub(amount));
        expect(await hre.ethers.provider.getBalance(deployments.accounts.users[0].address)).to.deep.equal(
            oldTokenBalance.add(amount.sub(fee))
        );
        expect(await hre.ethers.provider.getBalance(deployments.accounts.protocolFee.address)).to.deep.equal(
            oldFeeBalance.add(fee)
        );
    });

    it("Deposit ERC20 token to Main Bridge", async () => {
        const oldLiquidity = await tokenContract.balanceOf(bridgeContract.address);
        const oldTokenBalance = await tokenContract.balanceOf(deployments.accounts.users[0].address);

        const expiry = ContractUtils.getTimeStamp() + 60;
        const signature = await ContractUtils.signMessage(deployments.accounts.users[0], arrayify(HashZero));

        depositId = ContractUtils.getRandomId(deployments.accounts.users[0].address);
        await tokenContract.connect(deployments.accounts.users[0]).approve(bridgeContract.address, amount);
        await expect(
            bridgeContract
                .connect(deployments.accounts.deployer)
                .depositToBridge(tokenId1, depositId, deployments.accounts.users[0].address, amount, expiry, signature)
        )
            .to.emit(bridgeContract, "BridgeDeposited")
            .withNamedArgs({
                depositId,
                account: deployments.accounts.users[0].address,
                amount,
            });
        expect(await tokenContract.balanceOf(deployments.accounts.users[0].address)).to.deep.equal(
            oldTokenBalance.sub(amount)
        );
        expect(await tokenContract.balanceOf(bridgeContract.address)).to.deep.equal(oldLiquidity.add(amount));
    });

    it("Withdraw ERC20 token from Main Bridge", async () => {
        const oldLiquidity = await tokenContract.balanceOf(bridgeContract.address);
        const oldTokenBalance = await tokenContract.balanceOf(deployments.accounts.users[0].address);
        const oldFeeBalance = await tokenContract.balanceOf(deployments.accounts.protocolFee.address);

        await bridgeContract
            .connect(deployments.accounts.bridgeValidators[0])
            .withdrawFromBridge(tokenId1, depositId, deployments.accounts.users[0].address, amount);
        await expect(
            bridgeContract
                .connect(deployments.accounts.bridgeValidators[1])
                .withdrawFromBridge(tokenId1, depositId, deployments.accounts.users[0].address, amount)
        )
            .to.emit(bridgeContract, "BridgeWithdrawn")
            .withNamedArgs({
                withdrawId: depositId,
                account: deployments.accounts.users[0].address,
                amount: amount.sub(fee),
            });

        expect(await tokenContract.balanceOf(bridgeContract.address)).to.deep.equal(oldLiquidity.sub(amount));
        expect(await tokenContract.balanceOf(deployments.accounts.users[0].address)).to.deep.equal(
            oldTokenBalance.add(amount.sub(fee))
        );
        expect(await tokenContract.balanceOf(deployments.accounts.protocolFee.address)).to.deep.equal(
            oldFeeBalance.add(fee)
        );
    });
});
