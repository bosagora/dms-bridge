import { IDatabaseConfig } from "../common/Config";
import { IBridgeDepositedEvent, ValidatorType } from "../types";
import { Utils } from "../utils/Utils";
import { Storage } from "./Storage";

import MybatisMapper from "mybatis-mapper";

import { BigNumber } from "ethers";

import path from "path";
import { ContractUtils } from "../utils/ContractUtils";

/**
 * The class that inserts and reads the ledger into the database.
 */
export class ValidatorStorage extends Storage {
    constructor(config: IDatabaseConfig) {
        super(config);
    }

    public async initialize() {
        await super.initialize();
        MybatisMapper.createMapper([path.resolve(Utils.getInitCWD(), "src/storage/mapper/table.xml")]);
        MybatisMapper.createMapper([path.resolve(Utils.getInitCWD(), "src/storage/mapper/latest_block_number.xml")]);
        MybatisMapper.createMapper([path.resolve(Utils.getInitCWD(), "src/storage/mapper/events.xml")]);
        await this.createTables();
    }

    public static async make(config: IDatabaseConfig): Promise<ValidatorStorage> {
        const storage = new ValidatorStorage(config);
        await storage.initialize();
        return storage;
    }

    public createTables(): Promise<any> {
        return this.queryForMapper("table", "create_table", {});
    }

    public async clearTestDB(): Promise<any> {
        await this.queryForMapper("table", "clear_table", {});
    }

    public async dropTestDB(): Promise<any> {
        await this.queryForMapper("table", "drop_table", {});
    }

    public setLatestNumber(validator: string, type: ValidatorType, network: string, blockNumber: bigint): Promise<any> {
        return new Promise<void>(async (resolve, reject) => {
            this.queryForMapper("latest_block_number", "set", {
                validator,
                type,
                network,
                blockNumber: blockNumber.toString(10),
            })
                .then(() => {
                    return resolve();
                })
                .catch((reason) => {
                    if (reason instanceof Error) return reject(reason);
                    return reject(new Error(reason));
                });
        });
    }

    public getLatestNumber(validator: string, type: ValidatorType, network: string): Promise<bigint | undefined> {
        return new Promise<bigint | undefined>(async (resolve, reject) => {
            this.queryForMapper("latest_block_number", "get", {
                validator,
                type,
                network,
            })
                .then((result) => {
                    if (result.rows.length > 0) {
                        return resolve(BigInt(result.rows[0].blockNumber));
                    } else {
                        return resolve(undefined);
                    }
                })
                .catch((reason) => {
                    if (reason instanceof Error) return reject(reason);
                    return reject(new Error(reason));
                });
        });
    }

    public postEvents(events: IBridgeDepositedEvent[], validator: string, type: ValidatorType): Promise<void> {
        return new Promise<void>(async (resolve, reject) => {
            this.queryForMapper("events", "postEvents", {
                events: events.map((m) => {
                    return {
                        validator,
                        type,
                        network: m.network,
                        depositId: m.depositId,
                        tokenId: m.tokenId,
                        account: m.account,
                        amount: String(m.amount),
                        blockNumber: m.blockNumber.toString(10),
                        transactionHash: m.transactionHash,
                    };
                }) as any,
            })
                .then(() => {
                    return resolve();
                })
                .catch((reason) => {
                    if (reason instanceof Error) return reject(reason);
                    return reject(new Error(reason));
                });
        });
    }

    public getEvents(
        validator: string,
        type: ValidatorType,
        network: string,
        from: bigint
    ): Promise<IBridgeDepositedEvent[]> {
        return new Promise<IBridgeDepositedEvent[]>(async (resolve, reject) => {
            this.queryForMapper("events", "getEvents", {
                validator,
                type,
                network,
                from: from.toString(10),
            })
                .then((result) => {
                    resolve(
                        result.rows.map((m) => {
                            return {
                                network: m.network,
                                depositId: m.depositId,
                                tokenId: m.tokenId,
                                account: m.account,
                                amount: BigNumber.from(m.amount),
                                blockNumber: BigInt(m.blockNumber),
                                transactionHash: m.transactionHash,
                                withdrawStatus: m.withdrawStatus,
                                withdrawTimestamp: BigInt(m.withdrawTimestamp),
                            };
                        })
                    );
                })
                .catch((reason) => {
                    if (reason instanceof Error) return reject(reason);
                    return reject(new Error(reason));
                });
        });
    }

    public getNotConfirmedEvents(
        validator: string,
        type: ValidatorType,
        network: string
    ): Promise<IBridgeDepositedEvent[]> {
        return new Promise<IBridgeDepositedEvent[]>(async (resolve, reject) => {
            this.queryForMapper("events", "getNotConfirmedEvents", {
                validator,
                type,
                network,
            })
                .then((result) => {
                    resolve(
                        result.rows.map((m) => {
                            return {
                                network: m.network,
                                depositId: m.depositId,
                                tokenId: m.tokenId,
                                account: m.account,
                                amount: BigNumber.from(m.amount),
                                blockNumber: BigInt(m.blockNumber),
                                transactionHash: m.transactionHash,
                                withdrawStatus: m.withdrawStatus,
                                withdrawTimestamp: BigInt(m.withdrawTimestamp),
                            };
                        })
                    );
                })
                .catch((reason) => {
                    if (reason instanceof Error) return reject(reason);
                    return reject(new Error(reason));
                });
        });
    }

    public getNotExecutedEvents(
        validator: string,
        type: ValidatorType,
        network: string
    ): Promise<IBridgeDepositedEvent[]> {
        return new Promise<IBridgeDepositedEvent[]>(async (resolve, reject) => {
            this.queryForMapper("events", "getNotExecutedEvents", {
                validator,
                type,
                network,
            })
                .then((result) => {
                    resolve(
                        result.rows.map((m) => {
                            return {
                                network: m.network,
                                depositId: m.depositId,
                                tokenId: m.tokenId,
                                account: m.account,
                                amount: BigNumber.from(m.amount),
                                blockNumber: BigInt(m.blockNumber),
                                transactionHash: m.transactionHash,
                                withdrawStatus: m.withdrawStatus,
                                withdrawTimestamp: BigInt(m.withdrawTimestamp),
                            };
                        })
                    );
                })
                .catch((reason) => {
                    if (reason instanceof Error) return reject(reason);
                    return reject(new Error(reason));
                });
        });
    }

    public setConfirmed(validator: string, type: ValidatorType, network: string, depositId: string): Promise<void> {
        return new Promise<void>(async (resolve, reject) => {
            this.queryForMapper("events", "setConfirmed", {
                validator,
                type,
                network,
                depositId,
            })
                .then(() => {
                    resolve();
                })
                .catch((reason) => {
                    if (reason instanceof Error) return reject(reason);
                    return reject(new Error(reason));
                });
        });
    }

    public setExecuted(validator: string, type: ValidatorType, network: string, depositId: string): Promise<void> {
        return new Promise<void>(async (resolve, reject) => {
            this.queryForMapper("events", "setExecuted", {
                validator,
                type,
                network,
                depositId,
            })
                .then(() => {
                    resolve();
                })
                .catch((reason) => {
                    if (reason instanceof Error) return reject(reason);
                    return reject(new Error(reason));
                });
        });
    }

    public setSent(validator: string, type: ValidatorType, network: string, depositId: string): Promise<void> {
        return new Promise<void>(async (resolve, reject) => {
            this.queryForMapper("events", "setSent", {
                validator,
                type,
                network,
                depositId,
                withdrawTimestamp: ContractUtils.getTimeStampBigInt().toString(10),
            })
                .then(() => {
                    resolve();
                })
                .catch((reason) => {
                    if (reason instanceof Error) return reject(reason);
                    return reject(new Error(reason));
                });
        });
    }
}
