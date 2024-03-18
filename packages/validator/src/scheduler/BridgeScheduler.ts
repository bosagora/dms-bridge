import "@nomiclabs/hardhat-ethers";
import { Config } from "../common/Config";
import { logger } from "../common/Logger";
import { ValidatorStorage } from "../storage/ValidatorStorage";
import { Scheduler } from "./Scheduler";

// @ts-ignore
import { BlockNumber } from "web3-core";
import { EventCollector } from "./EventCollector";

export class BridgeScheduler extends Scheduler {
    private _config: Config | undefined;
    private _storage: ValidatorStorage | undefined;

    private _collectorA: EventCollector | undefined;
    private _collectorB: EventCollector | undefined;

    constructor(expression: string) {
        super(expression);
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

    public setOption(options: any) {
        if (options) {
            if (options.config && options.config instanceof Config) this._config = options.config;
            if (options.storage && options.storage instanceof ValidatorStorage) this._storage = options.storage;
        }

        if (this._config !== undefined && this._storage !== undefined) {
            this._collectorA = new EventCollector(
                this._config,
                this._storage,
                this._config.bridge.networkAName,
                this._config.bridge.networkAContractAddress,
                1n
            );

            this._collectorB = new EventCollector(
                this._config,
                this._storage,
                this._config.bridge.networkBName,
                this._config.bridge.networkBContractAddress,
                1n
            );
        }
    }

    public get collectorA() {
        if (this._collectorA !== undefined) return this._collectorA;
        else {
            logger.error("collectorA is not ready yet.");
            process.exit(1);
        }
    }

    public get collectorB() {
        if (this._collectorB !== undefined) return this._collectorB;
        else {
            logger.error("_collectorB is not ready yet.");
            process.exit(1);
        }
    }

    protected async work() {
        try {
            await this.collectorA.work();
            await this.collectorB.work();
        } catch (error) {
            logger.error(`Failed to execute the BridgeScheduler: ${error}`);
        }
    }
}
