import "@nomiclabs/hardhat-ethers";
import { BIP20DelegatedTransfer } from "../../typechain-types";
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

    private old_time_stamp: number;
    private new_time_stamp: number;

    constructor(expression: string) {
        super(expression);
        this.old_time_stamp = ContractUtils.getTimeStamp();
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
            if (options.validators) this._validators = options.validators;
            if (options.metrics && options.metrics instanceof Metrics) this._metrics = options.metrics;
        }
    }

    public async onStart() {
        await hre.changeNetwork(this.config.bridge.networkAName);
        const factoryA = await hre.ethers.getContractFactory("BIP20DelegatedTransfer");
        this._tokenA = factoryA.attach(this.config.bridge.networkATokenAddress);
        console.log("Chain A: ", this.config.bridge.networkAName);
        console.log("       : ", this.config.bridge.networkAContractAddress);
        const balanceA1 = new BOACoin(
            await this._tokenA.provider.getBalance(this.config.bridge.networkAContractAddress)
        );
        console.log("BOA    : ", balanceA1.toDisplayString(true, 2));
        const balanceA2 = new BOACoin(await this._tokenA.balanceOf(this.config.bridge.networkAContractAddress));
        console.log("Token  : ", balanceA2.toDisplayString(true, 2));

        await hre.changeNetwork(this.config.bridge.networkBName);
        const factoryB = await hre.ethers.getContractFactory("BIP20DelegatedTransfer");
        this._tokenB = factoryB.attach(this.config.bridge.networkBTokenAddress);
        console.log("Chain B: ", this.config.bridge.networkBName);
        console.log("       : ", this.config.bridge.networkBContractAddress);
        const balanceB1 = new BOACoin(
            await this._tokenB.provider.getBalance(this.config.bridge.networkBContractAddress)
        );
        console.log("BOA    : ", balanceB1.toDisplayString(true, 2));
        const balanceB2 = new BOACoin(await this._tokenB.balanceOf(this.config.bridge.networkBContractAddress));
        console.log("Token  : ", balanceB2.toDisplayString(true, 2));
    }

    protected async work() {
        try {
            this.new_time_stamp = ContractUtils.getTimeStamp();
            const old_source_period = Math.floor(this.old_time_stamp / 2);
            const new_source_period = Math.floor(this.new_time_stamp / 2);
            if (old_source_period !== new_source_period) {
                if (this._tokenA !== undefined && this._tokenB !== undefined) {
                    const balanceA1 = await this._tokenA.provider.getBalance(
                        this.config.bridge.networkAContractAddress
                    );
                    this.metrics.gaugeLabels("native_tokens", { name: "A" }, balanceA1.div(1_000_000_000).toNumber());
                    const balanceA2 = await this._tokenA.balanceOf(this.config.bridge.networkAContractAddress);
                    this.metrics.gaugeLabels("main_tokens", { name: "A" }, balanceA2.div(1_000_000_000).toNumber());

                    const balanceB1 = await this._tokenB.provider.getBalance(
                        this.config.bridge.networkBContractAddress
                    );
                    this.metrics.gaugeLabels("native_tokens", { name: "B" }, balanceB1.div(1_000_000_000).toNumber());
                    const balanceB2 = await this._tokenB.balanceOf(this.config.bridge.networkBContractAddress);
                    this.metrics.gaugeLabels("main_tokens", { name: "B" }, balanceB2.div(1_000_000_000).toNumber());
                }
                this.old_time_stamp = this.new_time_stamp;
            }
        } catch (error) {
            //
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
