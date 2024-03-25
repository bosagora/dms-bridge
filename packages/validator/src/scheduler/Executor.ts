import { IBridge, IBridge__factory } from "../../typechain-types";
import { logger } from "../common/Logger";
import { GasPriceManager } from "../contract/GasPriceManager";
import { ValidatorStorage } from "../storage/ValidatorStorage";
import { ValidatorType, WithdrawStatus } from "../types";
import { ResponseMessage } from "../utils/Errors";

import { Wallet } from "ethers";
import * as hre from "hardhat";

import { NonceManager } from "@ethersproject/experimental";
import { ContractUtils } from "../utils/ContractUtils";

export class Executor {
    private storage: ValidatorStorage;
    private wallet: Wallet;
    private readonly sourceType: ValidatorType;
    private readonly targetType: ValidatorType;
    private readonly sourceNetwork: string;
    private readonly targetNetwork: string;
    private readonly targetContractAddress: string;

    constructor(
        storage: ValidatorStorage,
        sourceType: ValidatorType,
        sourceNetwork: string,
        targetType: ValidatorType,
        targetNetwork: string,
        targetContractAddress: string,
        wallet: Wallet
    ) {
        this.storage = storage;
        this.sourceType = sourceType;
        this.targetType = targetType;
        this.sourceNetwork = sourceNetwork;
        this.targetNetwork = targetNetwork;
        this.targetContractAddress = targetContractAddress;
        this.wallet = new Wallet(wallet.privateKey);
    }

    public async work() {
        const events = await this.storage.getNotExecutedEvents(
            this.wallet.address,
            this.sourceType,
            this.sourceNetwork
        );
        if (events.length === 0) return;

        await hre.changeNetwork(this.targetNetwork);
        const signer = new NonceManager(new GasPriceManager(this.wallet.connect(hre.ethers.provider)));

        const contract = new hre.ethers.Contract(
            this.targetContractAddress,
            IBridge__factory.createInterface(),
            hre.ethers.provider
        ) as IBridge;

        for (const event of events) {
            const status = await contract.getWithdrawInfo(event.depositId);
            if (!status.executed) {
                const confirmed = await contract.isConfirmedOf(event.depositId, this.wallet.address);
                if (!confirmed) {
                    if (
                        event.withdrawStatus < WithdrawStatus.Sent ||
                        (event.withdrawStatus === WithdrawStatus.Sent &&
                            ContractUtils.getTimeStampBigInt() - event.withdrawTimestamp > 30n)
                    ) {
                        try {
                            logger.info(
                                `[${this.wallet.address}]-[${this.targetNetwork}]: Starting Withdraw [${event.depositId}]`
                            );
                            const tx = await contract
                                .connect(signer)
                                .withdrawFromBridge(event.tokenId, event.depositId, event.account, event.amount);

                            logger.info(
                                `[${this.wallet.address}]-[${this.targetNetwork}]: Sent Withdraw [${event.depositId}]`
                            );
                            await this.storage.setSent(
                                this.wallet.address,
                                this.sourceType,
                                this.sourceNetwork,
                                event.depositId
                            );
                        } catch (error) {
                            const msg = ResponseMessage.getEVMErrorMessage(error);
                            logger.error(
                                `Failed Executor: [${this.wallet.address}]-[${this.targetNetwork}]: ${msg.code}, ${msg.error.message}`
                            );
                        }
                    }
                } else {
                    logger.info(
                        `[${this.wallet.address}]-[${this.targetNetwork}]: Confirmed Withdraw [${event.depositId}]`
                    );
                    await this.storage.setConfirmed(
                        this.wallet.address,
                        this.sourceType,
                        this.sourceNetwork,
                        event.depositId
                    );
                }
            } else {
                logger.info(`[${this.wallet.address}]-[${this.targetNetwork}]: Executed Withdraw [${event.depositId}]`);
                await this.storage.setExecuted(
                    this.wallet.address,
                    this.sourceType,
                    this.sourceNetwork,
                    event.depositId
                );
            }
        }
    }
}
