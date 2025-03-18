import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-waffle";
import "@openzeppelin/hardhat-upgrades";
import { ethers } from "hardhat";

import { BridgeValidator } from "../typechain-types";

async function getBridgeValidator(address: string): Promise<BridgeValidator> {
    const factory = await ethers.getContractFactory("BridgeValidator");
    return factory.attach(address) as BridgeValidator;
}

async function main() {
    const contract = (await getBridgeValidator("0x0E87d386c475089BA607d879d60E31942a8c0CBe")) as BridgeValidator;
    const length = (await contract.getLength()).toNumber();
    console.log(`length : ${length}`);
    const required = (await contract.getRequired()).toNumber();
    console.log(`required : ${required}`);

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
