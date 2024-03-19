import { IBridge__factory } from "../../typechain-types";
import { ValidatorStorage } from "../storage/ValidatorStorage";

import { BigNumber, Wallet } from "ethers";
import * as hre from "hardhat";
import { logger } from "../common/Logger";
import { ValidatorType } from "../types";

export class EventCollector {
    private wallet: Wallet;
    private readonly type: ValidatorType;
    private readonly network: string;
    private readonly contractAddress: string;
    private readonly startNumber: bigint;
    private contract: any;
    private storage: ValidatorStorage;

    constructor(
        storage: ValidatorStorage,
        type: ValidatorType,
        network: string,
        contractAddress: string,
        startBlockNumber: bigint,
        wallet: Wallet
    ) {
        this.storage = storage;
        this.type = type;
        this.network = network;
        this.contractAddress = contractAddress;
        this.startNumber = startBlockNumber;
        this.wallet = wallet;
    }

    private async getLatestBlockNumber(): Promise<bigint> {
        const block = await hre.ethers.provider.getBlock("latest");
        return BigInt(block.number);
    }

    public async work() {
        hre.changeNetwork(this.network);

        const latestBlockNumber = await this.getLatestBlockNumber();

        let from: BigInt;
        const latestCollectedNumber = await this.storage.getLatestNumber(this.wallet.address, this.type, this.network);
        if (latestCollectedNumber === undefined) {
            from = this.startNumber;
        } else {
            from = latestCollectedNumber + 1n;
            if (from > latestBlockNumber) from = this.startNumber;
        }

        this.contract = new hre.web3.eth.Contract(IBridge__factory.abi as any, this.contractAddress);
        const events = await this.contract.getPastEvents("BridgeDeposited", {
            fromBlock: Number(from),
            toBlock: Number(latestBlockNumber),
        });

        const depositEvents = events.map((m: any) => {
            return {
                network: this.network,
                tokenId: m.returnValues.tokenId,
                depositId: m.returnValues.depositId,
                account: m.returnValues.account,
                amount: BigNumber.from(m.returnValues.amount),
                blockNumber: BigInt(m.blockNumber),
                transactionHash: m.transactionHash,
            };
        });

        if (depositEvents.length > 0) await this.storage.postEvents(depositEvents, this.wallet.address, this.type);

        await this.storage.setLatestNumber(this.wallet.address, this.type, this.network, latestBlockNumber);
    }
}
