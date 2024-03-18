import { BigNumber } from "ethers";

export const SignatureZero =
    "0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";

export interface IBridgeDepositedEvent {
    network: string;
    depositId: string;
    tokenId: string;
    account: string;
    amount: BigNumber;
    blockNumber: BigInt;
    transactionHash: string;
}
