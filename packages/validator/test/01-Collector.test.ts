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
import { ValidatorType } from "../src/types";

chai.use(solidity);

interface IShopData {
    shopId: string;
    name: string;
    currency: string;
    wallet: Wallet;
}

describe("Test for EventCollector", () => {
    const config = new Config();
    config.readFromFile(path.resolve(process.cwd(), "config", "config_test.yaml"));
    config.bridge.networkAName = "hardhat";
    config.bridge.networkBName = "hardhat";
    const deploymentsA = new Deployments(config, config.bridge.networkAName);
    let tokenContract: BIP20DelegatedTransfer;
    let bridgeContract: Bridge;
    let storage: ValidatorStorage;

    const amount = Amount.make(100_000, 18).value;
    const fee = Amount.make(5, 18).value;

    let collector: EventCollector;
    let validatorWallet: Wallet;

    const deployAllContract = async (shopData: IShopData[]) => {
        await deploymentsA.doDeployAll();
        tokenContract = deploymentsA.getContract("TestKIOS") as BIP20DelegatedTransfer;
        bridgeContract = deploymentsA.getContract("Bridge") as Bridge;
    };

    before("Create Config", async () => {
        validatorWallet = new Wallet(config.bridge.validators[0]);
        storage = await ValidatorStorage.make(config.database);
        await storage.clearTestDB();
    });

    after("Stop DB", async () => {
        await storage.dropTestDB();
    });

    let tokenId0: string;
    let tokenId1: string;
    let depositId: string;
    it("Deploy", async () => {
        await deployAllContract([]);
    });

    it("Create EventCollector", async () => {
        collector = new EventCollector(
            storage,
            ValidatorType.A,
            config.bridge.networkAName,
            bridgeContract.address,
            1n,
            validatorWallet
        );
    });

    it("EventCollector.work()", async () => {
        await collector.work();
        const events = await storage.getEvents(
            validatorWallet.address,
            ValidatorType.A,
            config.bridge.networkAName,
            0n
        );
        assert.deepStrictEqual(events.length, 0);
    });

    it("Register token", async () => {
        await hre.changeNetwork(config.bridge.networkAName);
        // Native Token
        tokenId0 = HashZero;
        await bridgeContract.connect(deploymentsA.accounts.deployer).registerToken(HashZero, AddressZero);
        // BIP20 Token
        tokenId1 = ContractUtils.getTokenId(await tokenContract.name(), await tokenContract.symbol());
        await bridgeContract.connect(deploymentsA.accounts.deployer).registerToken(tokenId1, tokenContract.address);
    });

    it("Deposit Native Liquidity", async () => {
        await hre.changeNetwork(config.bridge.networkAName);
        const liquidityAmount = Amount.make(1_000_000_000, 18).value;
        const signature = await ContractUtils.signMessage(deploymentsA.accounts.deployer, arrayify(HashZero));
        const tx1 = await bridgeContract
            .connect(deploymentsA.accounts.deployer)
            .depositLiquidity(tokenId0, liquidityAmount, signature, { value: liquidityAmount });
        await tx1.wait();
    });

    it("Deposit BIP20 Liquidity", async () => {
        await hre.changeNetwork(config.bridge.networkAName);
        const liquidityAmount = Amount.make(1_000_000_000, 18).value;
        const nonce = await (deploymentsA.getContract("TestKIOS") as BIP20DelegatedTransfer).nonceOf(
            deploymentsA.accounts.deployer.address
        );
        const message = ContractUtils.getTransferMessage(
            deploymentsA.accounts.deployer.address,
            bridgeContract.address,
            liquidityAmount,
            nonce,
            hre.getChainId(config.bridge.networkAName)
        );
        const signature = await ContractUtils.signMessage(deploymentsA.accounts.deployer, message);
        const tx1 = await bridgeContract
            .connect(deploymentsA.accounts.deployer)
            .depositLiquidity(tokenId1, liquidityAmount, signature);
        await tx1.wait();
    });

    it("Deposit native token to Main Bridge", async () => {
        await hre.changeNetwork(config.bridge.networkAName);
        const oldLiquidity = await hre.ethers.provider.getBalance(bridgeContract.address);
        depositId = ContractUtils.getRandomId(deploymentsA.accounts.users[0].address);
        const signature = await ContractUtils.signMessage(deploymentsA.accounts.users[0], arrayify(HashZero));
        await expect(
            bridgeContract
                .connect(deploymentsA.accounts.users[0])
                .depositToBridge(tokenId0, depositId, AddressZero, 0, signature, {
                    value: amount,
                })
        )
            .to.emit(bridgeContract, "BridgeDeposited")
            .withNamedArgs({
                tokenId: tokenId0,
                depositId,
                account: deploymentsA.accounts.users[0].address,
                amount,
            });
        expect(await hre.ethers.provider.getBalance(bridgeContract.address)).to.deep.equal(oldLiquidity.add(amount));
    });

    it("EventCollector.work()", async () => {
        await collector.work();
        const events = await storage.getEvents(
            validatorWallet.address,
            ValidatorType.A,
            config.bridge.networkAName,
            0n
        );
        assert.deepStrictEqual(events.length, 1);
        assert.deepStrictEqual(events[0].network, config.bridge.networkAName);
        assert.deepStrictEqual(events[0].tokenId, tokenId0);
        assert.deepStrictEqual(events[0].depositId, depositId);
        assert.deepStrictEqual(events[0].account, deploymentsA.accounts.users[0].address);
        assert.deepStrictEqual(events[0].amount, amount);
    });

    it("Deposit BIB20 token to Main Bridge", async () => {
        await hre.changeNetwork(config.bridge.networkAName);
        const oldLiquidity = await tokenContract.balanceOf(bridgeContract.address);
        const oldTokenBalance = await tokenContract.balanceOf(deploymentsA.accounts.users[0].address);
        const nonce = await tokenContract.nonceOf(deploymentsA.accounts.users[0].address);
        const message = ContractUtils.getTransferMessage(
            deploymentsA.accounts.users[0].address,
            bridgeContract.address,
            amount,
            nonce,
            hre.getChainId(config.bridge.networkAName)
        );
        depositId = ContractUtils.getRandomId(deploymentsA.accounts.users[0].address);
        const signature = await ContractUtils.signMessage(deploymentsA.accounts.users[0], message);
        await expect(
            bridgeContract
                .connect(deploymentsA.accounts.deployer)
                .depositToBridge(tokenId1, depositId, deploymentsA.accounts.users[0].address, amount, signature)
        )
            .to.emit(bridgeContract, "BridgeDeposited")
            .withNamedArgs({
                depositId,
                account: deploymentsA.accounts.users[0].address,
                amount,
            });
        expect(await tokenContract.balanceOf(deploymentsA.accounts.users[0].address)).to.deep.equal(
            oldTokenBalance.sub(amount)
        );
        expect(await tokenContract.balanceOf(bridgeContract.address)).to.deep.equal(oldLiquidity.add(amount));
    });

    it("EventCollector.work()", async () => {
        await collector.work();
        const events = await storage.getEvents(
            validatorWallet.address,
            ValidatorType.A,
            config.bridge.networkAName,
            0n
        );
        assert.deepStrictEqual(events.length, 2);
        assert.deepStrictEqual(events[1].network, config.bridge.networkAName);
        assert.deepStrictEqual(events[1].tokenId, tokenId1);
        assert.deepStrictEqual(events[1].depositId, depositId);
        assert.deepStrictEqual(events[1].account, deploymentsA.accounts.users[0].address);
        assert.deepStrictEqual(events[1].amount, amount);
    });
});
