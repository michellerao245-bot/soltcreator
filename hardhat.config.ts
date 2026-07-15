import { defineConfig } from "hardhat/config";
import hardhatEthers from "@nomicfoundation/hardhat-ethers";
import hardhatVerify from "@nomicfoundation/hardhat-verify";
import * as dotenv from "dotenv";

dotenv.config();

export default defineConfig({
  plugins: [hardhatEthers, hardhatVerify],

  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },

  networks: {
    bsc: {
      type: "http",
      chainType: "l1",
      url: process.env.BSC_MAINNET_RPC!,
      accounts: [process.env.PRIVATE_KEY!],
    },
  },

  verify: {
    etherscan: {
      apiKey: process.env.BSCSCAN_API_KEY!,
    },
  },
});