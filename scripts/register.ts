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
  toEip155ChainId,
} from "./common";
import { experimental_getRhinestoneInitData } from "@rhinestone/sdk/utils";

interface AccountInput {
  address: Address;
  accountParams: {
    factory: Address;
    factoryData: Hex;
    sessionDetails: EnableSessionDetails;
  };
  target: {
    chain: string; // eip155:chainId format
    token: Address | TokenSymbol;
    recipient?: Address;
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

console.log("signer account address", signerAccount.address);

// const initData = experimental_getRhinestoneInitData({
//   account: {
//     type: "startale",
//   },
//   owners: {
//     type: "ecdsa",
//     accounts: [signerAccount],
//     module: '0x00000072f286204bb934ed49d8969e86f7dec7b1',
//   },
//   // experimental_sessions: {
//   //   enabled: true,
//   // },
// });
// console.log("initData for startale account according to Rhinestone", initData);

// Create account config with sessions enabled
const config: RhinestoneAccountConfig = {
  account: {
    type: "startale",
  },
  owners: {
    type: "ecdsa",
    accounts: [signerAccount],
    // module: '0x00000072f286204bb934ed49d8969e86f7dec7b1',
  },
  // initData: {
  //   address: '0x5578FB0b52AC0C0E6cb3b19B299bf3E592a49f86',
  //   factory: '0x0000003b3e7b530b4f981ae80d9350392defef90',  
  //   factoryData: '0xea6d13ac000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000280000000000000000000000000000000552a5fae3db7a8f3917c435448f49ba6a9000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000002045888596b00000000000000000000000000000000000000000000000000000000000000c000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000120000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000001c000000000000000000000000000000000000000000000000000000000000001e00000000000000000000000000000000000000000000000000000000000000014af02fb42343a67badd074e917321964aec010c320000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
  //   intentExecutorInstalled: true,
  // },
  experimental_sessions: {
    enabled: true,
  },
};

const rhinestone = new RhinestoneSDK({
  apiKey: rhinestoneApiKey,
});
const account = await rhinestone.createAccount(config);
const { factory, factoryData } = account.getInitData();
const address = account.getAddress();

console.log(`Account address: ${address}`);

// Get all unique chains (source chains + target chain)
const allChains = [...new Set([...sourceChains])];
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
    sessionDetails,
  },
  target: {
    chain: toEip155ChainId(targetChain.id),
    token: targetToken,
    // Optional: custom recipient address
    // recipient: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
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
