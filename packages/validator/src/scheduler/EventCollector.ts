import { IBridge__factory } from "../../typechain-types";
import { Config } from "../common/Config";
import { logger } from "../common/Logger";
import { ValidatorStorage } from "../storage/ValidatorStorage";

import { BigNumber } from "ethers";
import * as hre from "hardhat";

export class EventCollector {
    private readonly network: string;
    private readonly contractAddress: string;
    private readonly startNumber: bigint;
    private contract: any;
    private config: Config | undefined;
    private storage: ValidatorStorage;

    constructor(
        config: Config,
        storage: ValidatorStorage,
        network: string,
        contractAddress: string,
        startBlockNumber: bigint
    ) {
        this.config = config;
        this.storage = storage;
        this.network = network;
        this.contractAddress = contractAddress;
        this.startNumber = startBlockNumber;
    }

    private async getLastBlockNumber(): Promise<BigNumber> {
        const block = await hre.ethers.provider.getBlock("latest");
        return BigNumber.from(block.number);
    }

    public async work() {
        hre.changeNetwork(this.network);

        let latestCollectedNumber = await this.storage.getLatestNumber(this.network);
        if (latestCollectedNumber === undefined) {
            latestCollectedNumber = this.startNumber - 1n;
        }

        const block = await hre.ethers.provider.getBlock("latest");
        const lastBlockNumber = BigInt(block.number);

        let from = latestCollectedNumber + 1n;
        if (from > lastBlockNumber) from = this.startNumber;

        this.contract = new hre.web3.eth.Contract(IBridge__factory.abi as any, this.contractAddress);
        const events = await this.contract.getPastEvents("BridgeDeposited", {
            fromBlock: Number(from),
            toBlock: Number(lastBlockNumber),
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

        if (depositEvents.length > 0) await this.storage.postEvents(depositEvents);

        await this.storage.setLatestNumber(this.network, lastBlockNumber);
    }
}
