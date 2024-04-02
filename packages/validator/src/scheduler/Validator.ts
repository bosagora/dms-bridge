import { Config } from "../common/Config";
import { ValidatorStorage } from "../storage/ValidatorStorage";
import { EventCollector } from "./EventCollector";

import { Wallet } from "ethers";
import { Executor } from "./Executor";
import { ValidatorType } from "../types";

export class Validator {
    private config: Config;
    private storage: ValidatorStorage;
    private readonly wallet: Wallet;
    private eventCollectorA: EventCollector;
    private eventCollectorB: EventCollector;

    private executorA: Executor;
    private executorB: Executor;

    constructor(config: Config, storage: ValidatorStorage, key: string) {
        this.config = config;
        this.storage = storage;
        this.wallet = new Wallet(key);

        this.eventCollectorA = new EventCollector(
            storage,
            ValidatorType.A,
            config.bridge.networkAName,
            config.bridge.networkABridgeAddress,
            1n,
            this.wallet
        );

        this.eventCollectorB = new EventCollector(
            storage,
            ValidatorType.B,
            config.bridge.networkBName,
            config.bridge.networkBBridgeAddress,
            1n,
            this.wallet
        );

        this.executorA = new Executor(
            storage,
            ValidatorType.A,
            config.bridge.networkAName,
            ValidatorType.B,
            config.bridge.networkBName,
            config.bridge.networkBBridgeAddress,
            this.wallet
        );

        this.executorB = new Executor(
            storage,
            ValidatorType.B,
            config.bridge.networkBName,
            ValidatorType.A,
            config.bridge.networkAName,
            config.bridge.networkABridgeAddress,
            this.wallet
        );
    }

    public async work() {
        await this.eventCollectorA.work();
        await this.eventCollectorB.work();
        await this.executorA.work();
        await this.executorB.work();
    }
}
