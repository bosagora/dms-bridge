import { BigNumber, ethers } from "ethers";
import { ERC20, IBridge } from "../../typechain-types";

export const SignatureZero =
    "0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";

export interface IBridgeDepositedEvent {
    network: string;
    depositId: string;
    tokenId: string;
    account: string;
    amount: BigNumber;
    blockNumber: bigint;
    transactionHash: string;
    withdrawStatus: WithdrawStatus;
    withdrawTimestamp: bigint;
}

export enum WithdrawStatus {
    None = 0,
    Sent = 1,
    Confirmed = 2,
    Executed = 3,
}

export enum ValidatorType {
    A,
    B,
}

export interface IContractInformation {
    providerA: ethers.providers.Provider;
    providerB: ethers.providers.Provider;
    tokenA: ERC20;
    tokenB: ERC20;
    bridgeA: IBridge;
    bridgeB: IBridge;
    tokenIdA: string;
    tokenIdB: string;
}
