import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@typechain/hardhat";
import * as dotenv from "dotenv";
import "./tasks/accounts";
import "./tasks/accounts";
import "./tasks/buy";
import "./tasks/balance";
import "./tasks/grantMinter";
import "./tasks/proofnft";
import "./tasks/crowdsale";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: { 
      optimizer: { enabled: true, runs: 200 },
      viaIR: false,          // try false first
      evmVersion: "paris"
    }
  },
  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6"
  },
  networks: {
    hardhat: {},
    localhost: { url: "http://127.0.0.1:8545" },
    anvil:     { url: "http://127.0.0.1:8545" }, // anvil
    sepolia: {
      // Make sure this env var name matches your .env
      url: process.env.ALCHEMY_SEPOLIA_URL || process.env.SEPOLIA_RPC_URL || "",
      accounts: process.env.WALLET_PRIVATE_KEY ? [process.env.WALLET_PRIVATE_KEY] : []
    }
  },
  etherscan: {
    apiKey: {
      sepolia: process.env.ETHERSCAN_API_KEY || ""
    }
  }
};

export default config;
