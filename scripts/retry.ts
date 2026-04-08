import type { RhinestoneAccountConfig } from "@rhinestone/sdk";
import { getAccount, signerAccount } from "./common";

const depositProcessorUrl = process.env.DEPOSIT_PROCESSOR_URL;
const rhinestoneApiKey = process.env.RHINESTONE_API_KEY!;

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

const account = await getAccount(config);
const address = account.getAddress();
console.log(`Address: ${address}`);
const response = await fetch(`${depositProcessorUrl}/deposits/retry`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": rhinestoneApiKey,
  },
  body: JSON.stringify({ address }),
});
const data = await response.json();
console.log(data);
