import "@nomiclabs/hardhat-ethers";
import { Config } from "../common/Config";
import { logger } from "../common/Logger";
import { ValidatorStorage } from "../storage/ValidatorStorage";
import { Scheduler } from "./Scheduler";

// @ts-ignore
import { EventCollector } from "./EventCollector";
import { Validator } from "./Validator";

export class BridgeScheduler extends Scheduler {
    private _config: Config | undefined;
    private _storage: ValidatorStorage | undefined;
    private _validators: Validator[] | undefined;

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

    private get validators(): Validator[] {
        if (this._validators !== undefined) return this._validators;
        else {
            logger.error("Validators is not ready yet.");
            process.exit(1);
        }
    }

    public setOption(options: any) {
        if (options) {
            if (options.config && options.config instanceof Config) this._config = options.config;
            if (options.storage && options.storage instanceof ValidatorStorage) this._storage = options.storage;
            if (options.validators) this._validators = options.validators;
        }
    }

    protected async work() {
        try {
            for (const validator of this.validators) {
                await validator.work();
            }
        } catch (error) {
            logger.error(`Failed to execute the BridgeScheduler: ${error}`);
        }
    }
}
