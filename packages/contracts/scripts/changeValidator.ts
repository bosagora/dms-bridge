import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-waffle";
import "@openzeppelin/hardhat-upgrades";
import { ethers } from "hardhat";

import { Wallet } from "ethers";
import { HardhatAccount } from "../src/HardhatAccount";
import { BridgeValidator } from "../typechain-types";

export interface IAccount {
    deployer: Wallet;
    protocolFee: Wallet;
    bridgeValidators: Wallet[];
    users: Wallet[];
    shops: Wallet[];
}

async function getBridgeValidator(address: string): Promise<BridgeValidator> {
    const factory = await ethers.getContractFactory("BridgeValidator");
    return factory.attach(address) as BridgeValidator;
}

async function main() {
    const raws = HardhatAccount.keys.map((m) => new Wallet(m, ethers.provider));
    const [deployerWallet, ownerWallet] = raws;

    console.log(`deployerWallet : ${deployerWallet.address}`);
    console.log(`ownerWallet : ${ownerWallet.address}`);
    const contract = (await getBridgeValidator("0x0E87d386c475089BA607d879d60E31942a8c0CBe")) as BridgeValidator;

    const owner = await contract.owner();
    console.log(`owner : ${owner}`);

    const length = (await contract.getLength()).toNumber();
    console.log(`length : ${length}`);

    const prevValidators: string[] = [];
    for (let idx = 0; idx < length; idx++) {
        const validator = await contract.itemOf(idx);
        prevValidators.push(validator);
        console.log(`validator ${idx + 1}: ${validator}`);
    }

    await contract.connect(ownerWallet).changeValidator([ownerWallet.address], [prevValidators[0]]);

    for (let idx = 0; idx < length; idx++) {
        const validator = await contract.itemOf(idx);
        console.log(`validator ${idx + 1}: ${validator}`);
    }
}
// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
