import { extendEnvironment } from "hardhat/config";
import { createProvider } from "hardhat/internal/core/providers/construction";
import { HttpNetworkConfig } from "hardhat/src/types";
import { JsonRpcProvider } from "@ethersproject/providers";
import { EthereumProvider } from "hardhat/types/provider";

// This import is needed to let the TypeScript compiler know that it should include your type
// extensions in your npm package's types file.
import "hardhat/types/runtime";
declare module "hardhat/types/runtime" {
    interface HardhatRuntimeEnvironment {
        changeNetwork(newNetwork: string): Promise<void>;
        getProvider(newNetwork: string): Promise<EthereumProvider>;
    }
}

extendEnvironment((hre) => {
    // We add a field to the Hardhat Runtime Environment here.
    // We use lazyObject to avoid initializing things until they are actually
    // needed.
    const providers: { [name: string]: EthereumProvider } = {};

    hre.getProvider = async function getProvider(name: string): Promise<EthereumProvider> {
        if (!providers[name]) {
            providers[name] = await createProvider(hre.config, name, this.artifacts);
        }
        return providers[name];
    };

    hre.changeNetwork = async function changeNetwork(newNetwork: string) {
        if (!this.config.networks[newNetwork]) {
            throw new Error(`changeNetwork: Couldn't find network '${newNetwork}'`);
        }

        if (!providers[this.network.name]) {
            providers[this.network.name] = this.network.provider;
        }

        this.network.name = newNetwork;
        this.network.config = this.config.networks[newNetwork];
        this.network.provider = await this.getProvider(newNetwork);

        if ((this as any).ethers) {
            if (newNetwork === "hardhat") {
                const { EthersProviderWrapper } = require("@nomiclabs/hardhat-ethers/internal/ethers-provider-wrapper");
                (this as any).ethers.provider = new EthersProviderWrapper(this.network.provider);
            } else {
                const httpNetConfig = this.config.networks[newNetwork] as HttpNetworkConfig;
                const chainId = httpNetConfig.chainId || 0;
                (this as any).ethers.provider = new JsonRpcProvider(httpNetConfig.url, {
                    name: newNetwork,
                    chainId,
                }) as JsonRpcProvider;
            }
        }
    };
});
