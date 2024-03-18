import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-web3";
import "@openzeppelin/hardhat-upgrades";

import { Amount } from "../src/common/Amount";
import { Config } from "../src/common/Config";
import { ValidatorStorage } from "../src/storage/ValidatorStorage";
import { ContractUtils } from "../src/utils/ContractUtils";
import { BIP20DelegatedTransfer, Bridge } from "../typechain-types";
import { Deployments } from "./helper/Deployments";

import chai, { expect } from "chai";
import { solidity } from "ethereum-waffle";

import { Wallet } from "ethers";

// tslint:disable-next-line:no-implicit-dependencies
import { arrayify } from "@ethersproject/bytes";
import { AddressZero, HashZero } from "@ethersproject/constants";

import * as hre from "hardhat";

import * as assert from "assert";
import path from "path";
import { EventCollector } from "../src/scheduler/EventCollector";

chai.use(solidity);

interface IShopData {
    shopId: string;
    name: string;
    currency: string;
    wallet: Wallet;
}

describe("Test for Ledger", () => {
    const deployments = new Deployments();
    let tokenContract: BIP20DelegatedTransfer;
    let bridgeContract: Bridge;
    let config: Config;
    let storage: ValidatorStorage;

    const amount = Amount.make(100_000, 18).value;
    const fee = Amount.make(5, 18).value;

    let collector: EventCollector;

    const deployAllContract = async (shopData: IShopData[]) => {
        await deployments.doDeployAll();
        tokenContract = deployments.getContract("TestKIOS") as BIP20DelegatedTransfer;
        bridgeContract = deployments.getContract("Bridge") as Bridge;
    };

    before("Create Config", async () => {
        config = new Config();
        config.readFromFile(path.resolve(process.cwd(), "config", "config_test.yaml"));
        storage = await ValidatorStorage.make(config.database);
        await storage.clearTestDB();
    });

    after("Stop TestServer", async () => {
        await storage.dropTestDB();
    });

    let tokenId0: string;
    let tokenId1: string;
    let depositId: string;
    it("Deploy", async () => {
        await deployAllContract([]);
    });

    it("Create EventCollector", async () => {
        collector = new EventCollector(config, storage, "hardhat", bridgeContract.address, 1n);
    });

    it("EventCollector.work()", async () => {
        await collector.work();
        const events = await storage.getEvents("hardhat", 0n);
        assert.deepStrictEqual(events.length, 0);
    });

    it("Register token", async () => {
        // Native Token
        tokenId0 = HashZero;
        await bridgeContract.connect(deployments.accounts.deployer).registerToken(HashZero, AddressZero);
        // BIP20 Token
        tokenId1 = ContractUtils.getTokenId(await tokenContract.name(), await tokenContract.symbol());
        await bridgeContract.connect(deployments.accounts.deployer).registerToken(tokenId1, tokenContract.address);
    });

    it("Deposit Native Liquidity", async () => {
        const liquidityAmount = Amount.make(1_000_000_000, 18).value;
        const signature = await ContractUtils.signMessage(deployments.accounts.deployer, arrayify(HashZero));
        const tx1 = await bridgeContract
            .connect(deployments.accounts.deployer)
            .depositLiquidity(tokenId0, liquidityAmount, signature, { value: liquidityAmount });
        await tx1.wait();
    });

    it("Deposit BIP20 Liquidity", async () => {
        const liquidityAmount = Amount.make(1_000_000_000, 18).value;
        const nonce = await (deployments.getContract("TestKIOS") as BIP20DelegatedTransfer).nonceOf(
            deployments.accounts.deployer.address
        );
        const message = ContractUtils.getTransferMessage(
            deployments.accounts.deployer.address,
            bridgeContract.address,
            liquidityAmount,
            nonce
        );
        const signature = await ContractUtils.signMessage(deployments.accounts.deployer, message);
        const tx1 = await bridgeContract
            .connect(deployments.accounts.deployer)
            .depositLiquidity(tokenId1, liquidityAmount, signature);
        await tx1.wait();
    });

    it("Deposit native token to Main Bridge", async () => {
        const oldLiquidity = await hre.ethers.provider.getBalance(bridgeContract.address);
        depositId = ContractUtils.getRandomId(deployments.accounts.users[0].address);
        const signature = await ContractUtils.signMessage(deployments.accounts.users[0], arrayify(HashZero));
        await expect(
            bridgeContract
                .connect(deployments.accounts.users[0])
                .depositToBridge(tokenId0, depositId, AddressZero, 0, signature, {
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

    it("EventCollector.work()", async () => {
        await collector.work();
        const events = await storage.getEvents("hardhat", 0n);
        assert.deepStrictEqual(events.length, 1);
        assert.deepStrictEqual(events[0].network, "hardhat");
        assert.deepStrictEqual(events[0].tokenId, tokenId0);
        assert.deepStrictEqual(events[0].depositId, depositId);
        assert.deepStrictEqual(events[0].account, deployments.accounts.users[0].address);
        assert.deepStrictEqual(events[0].amount, amount);
    });

    it("Deposit BIB20 token to Main Bridge", async () => {
        const oldLiquidity = await tokenContract.balanceOf(bridgeContract.address);
        const oldTokenBalance = await tokenContract.balanceOf(deployments.accounts.users[0].address);
        const nonce = await tokenContract.nonceOf(deployments.accounts.users[0].address);
        const message = ContractUtils.getTransferMessage(
            deployments.accounts.users[0].address,
            bridgeContract.address,
            amount,
            nonce
        );
        depositId = ContractUtils.getRandomId(deployments.accounts.users[0].address);
        const signature = await ContractUtils.signMessage(deployments.accounts.users[0], message);
        await expect(
            bridgeContract
                .connect(deployments.accounts.deployer)
                .depositToBridge(tokenId1, depositId, deployments.accounts.users[0].address, amount, signature)
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

    it("EventCollector.work()", async () => {
        await collector.work();
        const events = await storage.getEvents("hardhat", 0n);
        assert.deepStrictEqual(events.length, 2);
        assert.deepStrictEqual(events[1].network, "hardhat");
        assert.deepStrictEqual(events[1].tokenId, tokenId1);
        assert.deepStrictEqual(events[1].depositId, depositId);
        assert.deepStrictEqual(events[1].account, deployments.accounts.users[0].address);
        assert.deepStrictEqual(events[1].amount, amount);
    });
});
