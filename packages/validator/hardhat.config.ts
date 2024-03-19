import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-web3";
import "@openzeppelin/hardhat-upgrades";
import "@typechain/hardhat";
import "hardhat-change-network";
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
    },
    gasReporter: {
        enabled: process.env.REPORT_GAS !== undefined,
        currency: "USD",
    },
};

export default config;
