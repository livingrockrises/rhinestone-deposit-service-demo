import "dotenv/config";
import {
  type RhinestoneAccountConfig,
  RhinestoneSDK,
  type TokenSymbol,
} from "@rhinestone/sdk";
import type { Address, Hex } from "viem";
import {
  arbitrum,
  arbitrumSepolia,
  base,
  baseSepolia,
  bsc,
  mainnet,
  optimism,
  optimismSepolia,
  plasma,
  plasmaTestnet,
  polygon,
  soneium,
} from "viem/chains";
import {
  type EnableSessionDetails,
  getSessionDetails,
  isTestnet,
  signerAccount,
} from "./common";

interface AccountInput {
  address: Address;
  accountParams: {
    factory: Address;
    factoryData: Hex;
    sessionDetails: {
      hashesAndChainIds: {
        chainId: number;
        sessionDigest: Hex;
      }[];
      signature: Hex;
    };
  };
  target: {
    chain: string;
    token: Address | TokenSymbol;
    recipient?: Address;
    outputTokenRules?: {
      match: {
        symbol: string;
      };
      outputToken: Address;
    }[];
  };
}

const rhinestoneApiKey = process.env.RHINESTONE_API_KEY;
if (!rhinestoneApiKey) {
  throw new Error("RHINESTONE_API_KEY is not set");
}
const depositProcessorUrl = process.env.DEPOSIT_PROCESSOR_URL;
if (!depositProcessorUrl) {
  throw new Error("DEPOSIT_PROCESSOR_URL is not set");
}

// Configure chains
// const targetChain = isTestnet ? plasmaTestnet : plasma;
const targetChain = soneium;
const sourceChains = isTestnet
  ? [baseSepolia, optimismSepolia, arbitrumSepolia]
  : [optimism];

// Token on the target chain
// const targetToken = isTestnet
//   ? "0x502012b361aebce43b26ec812b74d9a51db4d412"
//   : "0xb8ce59fc3717ada4c02eadf9682a9e934f625ebb";

const targetToken = "0xbA9986D2381edf1DA03B0B9c1f8b00dc4AacC369"; // USDC.E

// Create account config with sessions enabled
const config: RhinestoneAccountConfig = {
  account: {
    type: "nexus",
  },
  owners: {
    type: "ecdsa",
    accounts: [signerAccount],
  },
  experimental_sessions: {
    enabled: true,
  },
};

const rhinestone = new RhinestoneSDK({
  apiKey: rhinestoneApiKey,
});
const account = await rhinestone.createAccount(config);
const address = account.getAddress();
const { factory, factoryData } = account.getInitData();

console.log(`Account address: ${address}`);

// Get all unique chains (source chains + target chain)
const allChains = [...new Set([...sourceChains, targetChain])];
console.log(
  `Preparing session details for chains: ${allChains.map((c) => c.name).join(", ")}`,
);

// Get session details for all chains
const sessionDetails = await getSessionDetails(account, allChains);
console.log(
  `Session details prepared for ${sessionDetails.hashesAndChainIds.length} chain(s)`,
);

const accountInput: AccountInput = {
  address,
  accountParams: {
    factory,
    factoryData,
    sessionDetails: {
      hashesAndChainIds: sessionDetails.hashesAndChainIds.map(
        ({ chainId, sessionDigest }) => ({
          chainId: Number(chainId),
          sessionDigest,
        }),
      ),
      signature: sessionDetails.signature,
    },
  },
  target: {
    chain: `eip155:${targetChain.id}`,
    token: targetToken, // default target token USDC.E
    recipient: "0x7306aC7A32eb690232De81a9FFB44Bb346026faB", // This would be main smart account. Important because we can't have deposit account receiving on other end but user's main smart account should.
    outputTokenRules: [
        {
          "match": { "symbol": "USDC" },
          "outputToken": "0xbA9986D2381edf1DA03B0B9c1f8b00dc4AacC369"
        },
        {
          "match": { "symbol": "ETH" },
          "outputToken": "0x4200000000000000000000000000000000000006"
        }
      ]
  },
};

const response = await fetch(`${depositProcessorUrl}/register`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": rhinestoneApiKey,
  },
  body: JSON.stringify({ account: accountInput }, (_, v) =>
    typeof v === "bigint" ? v.toString() : v,
  ),
});
console.log(`Register response: ${response.status}`);
const data = await response.json();
console.log(data);
