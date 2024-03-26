import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-waffle";
import "@openzeppelin/hardhat-upgrades";
import "@typechain/hardhat";
import "./hardhat-change-network";
import "hardhat-gas-reporter";
import "solidity-coverage";
import "solidity-docgen";

import * as dotenv from "dotenv";
import { Wallet } from "ethers";
import { HardhatAccount } from "./src/HardhatAccount";

dotenv.config({ path: "env/.env" });

function getAccounts() {
    const accounts: string[] = [];
    const reg_bytes64: RegExp = /^(0x)[0-9a-f]{64}$/i;
    if (
        process.env.DEPLOYER !== undefined &&
        process.env.DEPLOYER.trim() !== "" &&
        reg_bytes64.test(process.env.DEPLOYER)
    ) {
        accounts.push(process.env.DEPLOYER);
    } else {
        process.env.DEPLOYER = Wallet.createRandom().privateKey;
        accounts.push(process.env.DEPLOYER);
    }

    if (process.env.FEE !== undefined && process.env.FEE.trim() !== "" && reg_bytes64.test(process.env.FEE)) {
        accounts.push(process.env.FEE);
    } else {
        process.env.FEE = Wallet.createRandom().privateKey;
        accounts.push(process.env.FEE);
    }

    if (
        process.env.BRIDGE_VALIDATOR1 !== undefined &&
        process.env.BRIDGE_VALIDATOR1.trim() !== "" &&
        reg_bytes64.test(process.env.BRIDGE_VALIDATOR1)
    ) {
        accounts.push(process.env.BRIDGE_VALIDATOR1);
    } else {
        process.env.BRIDGE_VALIDATOR1 = Wallet.createRandom().privateKey;
        accounts.push(process.env.BRIDGE_VALIDATOR1);
    }

    if (
        process.env.BRIDGE_VALIDATOR2 !== undefined &&
        process.env.BRIDGE_VALIDATOR2.trim() !== "" &&
        reg_bytes64.test(process.env.BRIDGE_VALIDATOR2)
    ) {
        accounts.push(process.env.BRIDGE_VALIDATOR2);
    } else {
        process.env.BRIDGE_VALIDATOR2 = Wallet.createRandom().privateKey;
        accounts.push(process.env.BRIDGE_VALIDATOR2);
    }

    if (
        process.env.BRIDGE_VALIDATOR3 !== undefined &&
        process.env.BRIDGE_VALIDATOR3.trim() !== "" &&
        reg_bytes64.test(process.env.BRIDGE_VALIDATOR3)
    ) {
        accounts.push(process.env.BRIDGE_VALIDATOR3);
    } else {
        process.env.BRIDGE_VALIDATOR3 = Wallet.createRandom().privateKey;
        accounts.push(process.env.BRIDGE_VALIDATOR3);
    }

    if (
        process.env.BRIDGE_VALIDATOR4 !== undefined &&
        process.env.BRIDGE_VALIDATOR4.trim() !== "" &&
        reg_bytes64.test(process.env.BRIDGE_VALIDATOR4)
    ) {
        accounts.push(process.env.BRIDGE_VALIDATOR4);
    } else {
        process.env.BRIDGE_VALIDATOR4 = Wallet.createRandom().privateKey;
        accounts.push(process.env.BRIDGE_VALIDATOR4);
    }

    if (
        process.env.BRIDGE_VALIDATOR5 !== undefined &&
        process.env.BRIDGE_VALIDATOR5.trim() !== "" &&
        reg_bytes64.test(process.env.BRIDGE_VALIDATOR5)
    ) {
        accounts.push(process.env.BRIDGE_VALIDATOR5);
    } else {
        process.env.BRIDGE_VALIDATOR5 = Wallet.createRandom().privateKey;
        accounts.push(process.env.BRIDGE_VALIDATOR5);
    }

    if (process.env.KEY01 !== undefined && process.env.KEY01.trim() !== "" && reg_bytes64.test(process.env.KEY01)) {
        accounts.push(process.env.KEY01);
    } else {
        process.env.KEY01 = Wallet.createRandom().privateKey;
        accounts.push(process.env.KEY01);
    }

    if (process.env.KEY02 !== undefined && process.env.KEY02.trim() !== "" && reg_bytes64.test(process.env.KEY02)) {
        accounts.push(process.env.KEY02);
    } else {
        process.env.KEY02 = Wallet.createRandom().privateKey;
        accounts.push(process.env.KEY02);
    }

    if (process.env.KEY03 !== undefined && process.env.KEY03.trim() !== "" && reg_bytes64.test(process.env.KEY03)) {
        accounts.push(process.env.KEY03);
    } else {
        process.env.KEY03 = Wallet.createRandom().privateKey;
        accounts.push(process.env.KEY03);
    }

    if (process.env.KEY04 !== undefined && process.env.KEY04.trim() !== "" && reg_bytes64.test(process.env.KEY04)) {
        accounts.push(process.env.KEY04);
    } else {
        process.env.KEY04 = Wallet.createRandom().privateKey;
        accounts.push(process.env.KEY04);
    }

    if (process.env.KEY05 !== undefined && process.env.KEY05.trim() !== "" && reg_bytes64.test(process.env.KEY05)) {
        accounts.push(process.env.KEY05);
    } else {
        process.env.KEY05 = Wallet.createRandom().privateKey;
        accounts.push(process.env.KEY05);
    }

    if (process.env.KEY06 !== undefined && process.env.KEY06.trim() !== "" && reg_bytes64.test(process.env.KEY06)) {
        accounts.push(process.env.KEY06);
    } else {
        process.env.KEY06 = Wallet.createRandom().privateKey;
        accounts.push(process.env.KEY06);
    }

    if (process.env.KEY07 !== undefined && process.env.KEY07.trim() !== "" && reg_bytes64.test(process.env.KEY07)) {
        accounts.push(process.env.KEY07);
    } else {
        process.env.KEY07 = Wallet.createRandom().privateKey;
        accounts.push(process.env.KEY07);
    }

    if (process.env.KEY08 !== undefined && process.env.KEY08.trim() !== "" && reg_bytes64.test(process.env.KEY08)) {
        accounts.push(process.env.KEY08);
    } else {
        process.env.KEY08 = Wallet.createRandom().privateKey;
        accounts.push(process.env.KEY08);
    }

    if (process.env.KEY09 !== undefined && process.env.KEY09.trim() !== "" && reg_bytes64.test(process.env.KEY09)) {
        accounts.push(process.env.KEY09);
    } else {
        process.env.KEY09 = Wallet.createRandom().privateKey;
        accounts.push(process.env.KEY09);
    }

    if (process.env.KEY10 !== undefined && process.env.KEY10.trim() !== "" && reg_bytes64.test(process.env.KEY10)) {
        accounts.push(process.env.KEY10);
    } else {
        process.env.KEY10 = Wallet.createRandom().privateKey;
        accounts.push(process.env.KEY10);
    }

    if (process.env.KEY11 !== undefined && process.env.KEY11.trim() !== "" && reg_bytes64.test(process.env.KEY11)) {
        accounts.push(process.env.KEY11);
    } else {
        process.env.KEY11 = Wallet.createRandom().privateKey;
        accounts.push(process.env.KEY11);
    }

    if (process.env.KEY12 !== undefined && process.env.KEY12.trim() !== "" && reg_bytes64.test(process.env.KEY12)) {
        accounts.push(process.env.KEY12);
    } else {
        process.env.KEY12 = Wallet.createRandom().privateKey;
        accounts.push(process.env.KEY12);
    }

    if (process.env.KEY13 !== undefined && process.env.KEY13.trim() !== "" && reg_bytes64.test(process.env.KEY13)) {
        accounts.push(process.env.KEY13);
    } else {
        process.env.KEY13 = Wallet.createRandom().privateKey;
        accounts.push(process.env.KEY13);
    }

    if (process.env.KEY14 !== undefined && process.env.KEY14.trim() !== "" && reg_bytes64.test(process.env.KEY14)) {
        accounts.push(process.env.KEY14);
    } else {
        process.env.KEY14 = Wallet.createRandom().privateKey;
        accounts.push(process.env.KEY14);
    }

    if (process.env.KEY15 !== undefined && process.env.KEY15.trim() !== "" && reg_bytes64.test(process.env.KEY15)) {
        accounts.push(process.env.KEY15);
    } else {
        process.env.KEY15 = Wallet.createRandom().privateKey;
        accounts.push(process.env.KEY15);
    }

    if (process.env.KEY16 !== undefined && process.env.KEY16.trim() !== "" && reg_bytes64.test(process.env.KEY16)) {
        accounts.push(process.env.KEY16);
    } else {
        process.env.KEY16 = Wallet.createRandom().privateKey;
        accounts.push(process.env.KEY16);
    }

    if (process.env.KEY17 !== undefined && process.env.KEY17.trim() !== "" && reg_bytes64.test(process.env.KEY17)) {
        accounts.push(process.env.KEY17);
    } else {
        process.env.KEY17 = Wallet.createRandom().privateKey;
        accounts.push(process.env.KEY17);
    }

    if (process.env.KEY18 !== undefined && process.env.KEY18.trim() !== "" && reg_bytes64.test(process.env.KEY18)) {
        accounts.push(process.env.KEY18);
    } else {
        process.env.KEY18 = Wallet.createRandom().privateKey;
        accounts.push(process.env.KEY18);
    }

    if (process.env.KEY19 !== undefined && process.env.KEY19.trim() !== "" && reg_bytes64.test(process.env.KEY19)) {
        accounts.push(process.env.KEY19);
    } else {
        process.env.KEY19 = Wallet.createRandom().privateKey;
        accounts.push(process.env.KEY19);
    }

    if (process.env.KEY20 !== undefined && process.env.KEY20.trim() !== "" && reg_bytes64.test(process.env.KEY20)) {
        accounts.push(process.env.KEY20);
    } else {
        process.env.KEY20 = Wallet.createRandom().privateKey;
        accounts.push(process.env.KEY20);
    }

    while (accounts.length < 100) {
        accounts.push(Wallet.createRandom().privateKey);
    }

    if (HardhatAccount.keys.length === 0) {
        for (const account of accounts) {
            HardhatAccount.keys.push(account);
        }
    }

    return accounts;
}

function getTestAccounts() {
    const defaultBalance = "20000000000000000000000000000";
    const acc = getAccounts();
    return acc.map((m) => {
        return {
            privateKey: m,
            balance: defaultBalance,
        };
    });
}

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

const config = {
    solidity: {
        compilers: [
            {
                version: "0.8.2",
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 2000,
                    },
                },
            },
        ],
    },
    defaultNetwork: "hardhat",
    networks: {
        hardhat: {
            accounts: getTestAccounts(),
            gas: 8000000,
            gasPrice: 8000000000,
            blockGasLimit: 8000000,
        },
        bosagora_mainnet: {
            url: process.env.MAIN_NET_URL || "",
            chainId: 2151,
            accounts: getAccounts(),
        },
        bosagora_testnet: {
            url: process.env.TEST_NET_URL || "",
            chainId: 2019,
            accounts: getAccounts(),
        },
        bosagora_devnet: {
            url: "http://localhost:8545",
            chainId: 24680,
            accounts: getAccounts(),
        },
        chain1: {
            url: "http://localhost:8541",
            chainId: 215191,
            accounts: getAccounts(),
        },
        chain2: {
            url: "http://localhost:8542",
            chainId: 215192,
            accounts: getAccounts(),
        },
    },
    gasReporter: {
        enabled: process.env.REPORT_GAS !== undefined,
        currency: "USD",
    },
};

export default config;
