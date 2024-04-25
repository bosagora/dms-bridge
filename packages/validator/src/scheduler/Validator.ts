import { Config } from "../common/Config";
import { ValidatorStorage } from "../storage/ValidatorStorage";
import { EventCollector } from "./EventCollector";

import { Wallet } from "ethers";
import { IContractInformation, ValidatorType } from "../types";
import { Executor } from "./Executor";

export class Validator {
    private config: Config;
    private storage: ValidatorStorage;
    private readonly wallet: Wallet;
    private eventCollectorA: EventCollector;
    private eventCollectorB: EventCollector;

    private executorA: Executor;
    private executorB: Executor;

    constructor(config: Config, storage: ValidatorStorage, key: string, contractInfo: IContractInformation) {
        this.config = config;
        this.storage = storage;
        this.wallet = new Wallet(key);

        this.eventCollectorA = new EventCollector(
            storage,
            ValidatorType.A,
            config.bridge.networkAName,
            config.bridge.networkABridgeAddress,
            1n,
            this.wallet,
            contractInfo.providerA
        );

        this.eventCollectorB = new EventCollector(
            storage,
            ValidatorType.B,
            config.bridge.networkBName,
            config.bridge.networkBBridgeAddress,
            1n,
            this.wallet,
            contractInfo.providerB
        );

        this.executorA = new Executor(
            storage,
            ValidatorType.A,
            config.bridge.networkAName,
            ValidatorType.B,
            config.bridge.networkBName,
            this.wallet,
            contractInfo.providerB,
            contractInfo.bridgeB
        );

        this.executorB = new Executor(
            storage,
            ValidatorType.B,
            config.bridge.networkBName,
            ValidatorType.A,
            config.bridge.networkAName,
            this.wallet,
            contractInfo.providerA,
            contractInfo.bridgeA
        );
    }

    public async work() {
        await this.eventCollectorA.work();
        await this.eventCollectorB.work();
        await this.executorA.work();
        await this.executorB.work();
    }
}
