import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-web3";
import "@openzeppelin/hardhat-upgrades";

import { Amount } from "../src/common/Amount";
import { Config } from "../src/common/Config";
import { Scheduler } from "../src/scheduler/Scheduler";
import { ValidatorStorage } from "../src/storage/ValidatorStorage";
import { ContractUtils } from "../src/utils/ContractUtils";
import { BIP20DelegatedTransfer, Bridge } from "../typechain-types";
import { Deployments } from "./helper/Deployments";
import { TestServer } from "./helper/Utility";

// tslint:disable-next-line:no-implicit-dependencies
import { arrayify } from "@ethersproject/bytes";
import { AddressZero, HashZero } from "@ethersproject/constants";

import * as hre from "hardhat";
import path from "path";

import { URL } from "url";
import { BridgeScheduler } from "../src/scheduler/BridgeScheduler";

import chai, { expect } from "chai";

describe("Test for Bridge", function () {
    this.timeout(1000 * 60 * 5);

    const config = new Config();
    config.readFromFile(path.resolve(process.cwd(), "config", "config_test.yaml"));
    config.bridge.networkAName = "chain1";
    config.bridge.networkBName = "chain2";
    let deploymentsA: Deployments;
    let deploymentsB: Deployments;

    let tokenAContract: BIP20DelegatedTransfer;
    let tokenBContract: BIP20DelegatedTransfer;
    let bridgeAContract: Bridge;
    let bridgeBContract: Bridge;
    let storage: ValidatorStorage;
    let server: TestServer;
    let serverURL: URL;

    const amount = Amount.make(100_000, 18).value;

    let tokenId0: string;
    let tokenId1: string;
    let depositId: string;

    it("Attach", async () => {
        await hre.changeNetwork(config.bridge.networkAName);
        deploymentsA = new Deployments(config, config.bridge.networkAName);
        await deploymentsA.doDeployAll();
        tokenAContract = deploymentsA.getContract("TestKIOS") as BIP20DelegatedTransfer;
        bridgeAContract = deploymentsA.getContract("Bridge") as Bridge;
        config.bridge.networkABridgeAddress = bridgeAContract.address;
        config.bridge.networkATokenAddress = tokenAContract.address;

        await hre.changeNetwork(config.bridge.networkBName);
        deploymentsB = new Deployments(config, config.bridge.networkBName);
        await deploymentsB.doDeployAll();
        tokenBContract = deploymentsB.getContract("TestKIOS") as BIP20DelegatedTransfer;
        bridgeBContract = deploymentsB.getContract("Bridge") as Bridge;
        config.bridge.networkBBridgeAddress = bridgeBContract.address;
        config.bridge.networkBTokenAddress = tokenBContract.address;
    });

    it("Create TestServer", async () => {
        serverURL = new URL(`http://127.0.0.1:${config.server.port}`);
        storage = await ValidatorStorage.make(config.database);
        await storage.clearTestDB();

        const schedulers: Scheduler[] = [];
        schedulers.push(new BridgeScheduler("*/1 * * * * *"));
        server = new TestServer(config, storage, schedulers);
    });

    it("Register token", async () => {
        await hre.changeNetwork(config.bridge.networkAName);
        // Native Token
        tokenId0 = HashZero;
        await bridgeAContract.connect(deploymentsA.accounts.deployer).registerToken(HashZero, AddressZero);
        // BIP20 Token
        tokenId1 = ContractUtils.getTokenId(await tokenAContract.name(), await tokenAContract.symbol());
        await bridgeAContract.connect(deploymentsA.accounts.deployer).registerToken(tokenId1, tokenAContract.address);

        await hre.changeNetwork(config.bridge.networkBName);
        // Native Token
        await bridgeBContract.connect(deploymentsB.accounts.deployer).registerToken(HashZero, AddressZero);
        // BIP20 Token
        tokenId1 = ContractUtils.getTokenId(await tokenBContract.name(), await tokenBContract.symbol());
        await bridgeBContract.connect(deploymentsB.accounts.deployer).registerToken(tokenId1, tokenBContract.address);
    });

    it("Deposit Native Liquidity at Bridge A", async () => {
        await hre.changeNetwork(config.bridge.networkAName);
        const liquidityAmount = Amount.make(1_000_000_000, 18).value;
        const signature = await ContractUtils.signMessage(deploymentsA.accounts.deployer, arrayify(HashZero));
        const tx1 = await bridgeAContract
            .connect(deploymentsA.accounts.deployer)
            .depositLiquidity(tokenId0, liquidityAmount, signature, { value: liquidityAmount });
        await tx1.wait();
    });

    it("Deposit Native Liquidity at Bridge B", async () => {
        await hre.changeNetwork(config.bridge.networkBName);
        const liquidityAmount = Amount.make(1_000_000_000, 18).value;
        const signature = await ContractUtils.signMessage(deploymentsB.accounts.deployer, arrayify(HashZero));
        const tx1 = await bridgeBContract
            .connect(deploymentsB.accounts.deployer)
            .depositLiquidity(tokenId0, liquidityAmount, signature, { value: liquidityAmount });
        await tx1.wait();
    });

    it("Deposit BIP20 Liquidity at Bridge A", async () => {
        await hre.changeNetwork(config.bridge.networkAName);
        const liquidityAmount = Amount.make(1_000_000_000, 18).value;
        const nonce = await tokenAContract.nonceOf(deploymentsA.accounts.deployer.address);
        const message = ContractUtils.getTransferMessage(
            deploymentsA.accounts.deployer.address,
            bridgeAContract.address,
            liquidityAmount,
            nonce,
            hre.getChainId(config.bridge.networkAName)
        );
        const signature = await ContractUtils.signMessage(deploymentsA.accounts.deployer, message);
        const tx1 = await bridgeAContract
            .connect(deploymentsA.accounts.deployer)
            .depositLiquidity(tokenId1, liquidityAmount, signature);
        await tx1.wait();
    });

    it("Deposit BIP20 Liquidity at Bridge B", async () => {
        await hre.changeNetwork(config.bridge.networkBName);
        const liquidityAmount = Amount.make(1_000_000_000, 18).value;
        const nonce = await tokenBContract.nonceOf(deploymentsB.accounts.deployer.address);
        const message = ContractUtils.getTransferMessage(
            deploymentsB.accounts.deployer.address,
            bridgeBContract.address,
            liquidityAmount,
            nonce,
            hre.getChainId(config.bridge.networkBName)
        );
        const signature = await ContractUtils.signMessage(deploymentsB.accounts.deployer, message);
        const tx1 = await bridgeBContract
            .connect(deploymentsB.accounts.deployer)
            .depositLiquidity(tokenId1, liquidityAmount, signature);
        await tx1.wait();
    });

    it("Start TestServer", async () => {
        await server.start();
    });

    it("Deposit native token to Main Bridge", async () => {
        await hre.changeNetwork(config.bridge.networkAName);
        const oldLiquidity = await hre.ethers.provider.getBalance(bridgeAContract.address);
        depositId = ContractUtils.getRandomId(deploymentsA.accounts.users[0].address);
        const signature = await ContractUtils.signMessage(deploymentsA.accounts.users[0], arrayify(HashZero));
        const tx = await bridgeAContract
            .connect(deploymentsA.accounts.users[0])
            .depositToBridge(tokenId0, depositId, AddressZero, 0, signature, {
                value: amount,
            });
        await tx.wait();
        expect(await hre.ethers.provider.getBalance(bridgeAContract.address)).to.deep.equal(oldLiquidity.add(amount));
    });

    it("Waiting", async () => {
        await hre.changeNetwork(config.bridge.networkBName);
        const t1 = ContractUtils.getTimeStamp();
        while (true) {
            const info = await bridgeBContract.getWithdrawInfo(depositId);
            if (info.executed) break;
            else if (ContractUtils.getTimeStamp() - t1 > 60) break;
            await ContractUtils.delay(1000);
        }
    });

    it("Deposit BIB20 token to Main Bridge", async () => {
        await hre.changeNetwork(config.bridge.networkBName);
        const oldLiquidity = await tokenBContract.balanceOf(bridgeBContract.address);
        const oldTokenBalance = await tokenBContract.balanceOf(deploymentsB.accounts.users[0].address);
        const nonce = await tokenBContract.nonceOf(deploymentsB.accounts.users[0].address);
        const message = ContractUtils.getTransferMessage(
            deploymentsB.accounts.users[0].address,
            bridgeBContract.address,
            amount,
            nonce,
            hre.getChainId(config.bridge.networkBName)
        );
        depositId = ContractUtils.getRandomId(deploymentsB.accounts.users[0].address);
        const signature = await ContractUtils.signMessage(deploymentsB.accounts.users[0], message);
        const tx = await bridgeBContract
            .connect(deploymentsB.accounts.deployer)
            .depositToBridge(tokenId1, depositId, deploymentsB.accounts.users[0].address, amount, signature);
        await tx.wait();

        expect(await tokenBContract.balanceOf(deploymentsB.accounts.users[0].address)).to.deep.equal(
            oldTokenBalance.sub(amount)
        );
        expect(await tokenBContract.balanceOf(bridgeBContract.address)).to.deep.equal(oldLiquidity.add(amount));
    });

    it("Waiting", async () => {
        await hre.changeNetwork(config.bridge.networkAName);
        const t1 = ContractUtils.getTimeStamp();
        while (true) {
            const info = await bridgeAContract.getWithdrawInfo(depositId);
            if (info.executed) break;
            else if (ContractUtils.getTimeStamp() - t1 > 60) break;
            await ContractUtils.delay(1000);
        }
    });

    after("Stop TestServer", async () => {
        await server.stop();
        await storage.dropTestDB();
    });
});
