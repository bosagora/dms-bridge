import "@nomiclabs/hardhat-ethers";
import { BIP20DelegatedTransfer, IBridge, IBridge__factory } from "../../typechain-types";
import { Config } from "../common/Config";
import { logger } from "../common/Logger";
import { ValidatorStorage } from "../storage/ValidatorStorage";
import { ContractUtils } from "../utils/ContractUtils";
import { Scheduler } from "./Scheduler";

// @ts-ignore
import { ethers } from "ethers";
import * as hre from "hardhat";
import { BOACoin } from "../common/Amount";
import { Metrics } from "../metrics/Metrics";
import { Validator } from "./Validator";

export class BridgeScheduler extends Scheduler {
    private _config: Config | undefined;
    private _storage: ValidatorStorage | undefined;
    private _validators: Validator[] | undefined;
    private _metrics: Metrics | undefined;

    private _tokenA: BIP20DelegatedTransfer | undefined;
    private _tokenB: BIP20DelegatedTransfer | undefined;

    private _bridgeA: IBridge | undefined;
    private _bridgeB: IBridge | undefined;

    private _tokenIdA: string | undefined;
    private _tokenIdB: string | undefined;

    private _providerA: ethers.providers.Provider | undefined;
    private _providerB: ethers.providers.Provider | undefined;

    private old_time_stamp: number;
    private new_time_stamp: number;

    constructor(expression: string) {
        super(expression);
        this.old_time_stamp = ContractUtils.getTimeStamp() - 120;
        this.new_time_stamp = ContractUtils.getTimeStamp();
    }

    private get config(): Config {
        if (this._config !== undefined) return this._config;
        else {
            logger.error("Config is not ready yet.");
            process.exit(1);
        }
    }

    private get storage(): ValidatorStorage {
        if (this._storage !== undefined) return this._storage;
        else {
            logger.error("Storage is not ready yet.");
            process.exit(1);
        }
    }

    private get validators(): Validator[] {
        if (this._validators !== undefined) return this._validators;
        else {
            logger.error("Validators is not ready yet.");
            process.exit(1);
        }
    }

    private get metrics(): Metrics {
        if (this._metrics !== undefined) return this._metrics;
        else {
            logger.error("Metrics is not ready yet.");
            process.exit(1);
        }
    }

    public setOption(options: any) {
        if (options) {
            if (options.config && options.config instanceof Config) this._config = options.config;
            if (options.storage && options.storage instanceof ValidatorStorage) this._storage = options.storage;
            if (options.metrics && options.metrics instanceof Metrics) this._metrics = options.metrics;
        }
    }

    public async onStart() {
        console.log("Chain A : ", this.config.bridge.networkAName);
        console.log(" Bridge : ", this.config.bridge.networkABridgeAddress);
        console.log(" Token  : ", this.config.bridge.networkATokenAddress);
        console.log("Chain B : ", this.config.bridge.networkBName);
        console.log(" Bridge : ", this.config.bridge.networkBBridgeAddress);
        console.log(" Token  : ", this.config.bridge.networkBTokenAddress);
        console.log("");

        await hre.changeNetwork(this.config.bridge.networkAName);
        this._providerA = hre.ethers.provider;

        this._bridgeA = new hre.ethers.Contract(
            this.config.bridge.networkABridgeAddress,
            IBridge__factory.createInterface(),
            this._providerA
        ).connect(this._providerA) as IBridge;
        const factoryA = await hre.ethers.getContractFactory("BIP20DelegatedTransfer");
        this._tokenA = factoryA.attach(this.config.bridge.networkATokenAddress).connect(this._providerA);
        this._tokenIdA = ContractUtils.getTokenId(await this._tokenA.name(), await this._tokenA.symbol());
        const balanceA1 = new BOACoin(await this._tokenA.provider.getBalance(this.config.bridge.networkABridgeAddress));
        console.log("Chain A Balance : ");
        console.log(" BOA    : ", balanceA1.toDisplayString(true, 2));
        const balanceA2 = new BOACoin(await this._bridgeA.getTotalLiquidity(this._tokenIdA));
        console.log(" Token  : ", balanceA2.toDisplayString(true, 2));

        await hre.changeNetwork(this.config.bridge.networkBName);
        this._providerB = hre.ethers.provider;
        this._bridgeB = new hre.ethers.Contract(
            this.config.bridge.networkBBridgeAddress,
            IBridge__factory.createInterface(),
            this._providerB
        ).connect(this._providerB) as IBridge;
        const factoryB = await hre.ethers.getContractFactory("BIP20DelegatedTransfer");
        this._tokenB = factoryB.attach(this.config.bridge.networkBTokenAddress).connect(this._providerB);
        this._tokenIdB = ContractUtils.getTokenId(await this._tokenB.name(), await this._tokenB.symbol());
        const balanceB1 = new BOACoin(await this._tokenB.provider.getBalance(this.config.bridge.networkBBridgeAddress));
        console.log("Chain B Balance : ");
        console.log(" BOA    : ", balanceB1.toDisplayString(true, 2));
        const balanceB2 = new BOACoin(await this._bridgeB.getTotalLiquidity(this._tokenIdB));
        console.log(" Token  : ", balanceB2.toDisplayString(true, 2));

        const info = {
            providerA: this._providerA,
            providerB: this._providerB,
            tokenA: this._tokenA,
            tokenB: this._tokenB,
            bridgeA: this._bridgeA,
            bridgeB: this._bridgeB,
            tokenIdA: this._tokenIdA,
            tokenIdB: this._tokenIdB,
        };
        this._validators = this.config.bridge.validators.map((m) => new Validator(this.config, this.storage, m, info));
    }

    protected async work() {
        if (this._validators === undefined) {
            logger.warn("Validators is not ready yet.");
            return;
        }
        try {
            this.new_time_stamp = ContractUtils.getTimeStamp();
            const old_source_period = Math.floor(this.old_time_stamp / 60);
            const new_source_period = Math.floor(this.new_time_stamp / 60);
            if (old_source_period !== new_source_period) {
                if (
                    this._bridgeA !== undefined &&
                    this._bridgeB !== undefined &&
                    this._tokenIdA !== undefined &&
                    this._tokenIdB !== undefined
                ) {
                    const balanceA1 = await this._bridgeA.provider.getBalance(this.config.bridge.networkABridgeAddress);
                    this.metrics.gaugeLabels("native_token", { chain: "A" }, Number(balanceA1.toString()));
                    const balanceA2 = await this._bridgeA.getTotalLiquidity(this._tokenIdA);
                    this.metrics.gaugeLabels("main_token", { chain: "A" }, Number(balanceA2.toString()));

                    const balanceB1 = await this._bridgeB.provider.getBalance(this.config.bridge.networkBBridgeAddress);
                    this.metrics.gaugeLabels("native_token", { chain: "B" }, Number(balanceB1.toString()));
                    const balanceB2 = await this._bridgeB.getTotalLiquidity(this._tokenIdB);
                    this.metrics.gaugeLabels("main_token", { chain: "B" }, Number(balanceB2.toString()));
                }
                this.old_time_stamp = this.new_time_stamp;
            }
        } catch (error) {
            console.log(error);
        }

        try {
            for (const validator of this.validators) {
                await validator.work();
            }
        } catch (error) {
            logger.error(`Failed to execute the BridgeScheduler: ${error}`);
        }
    }
}
