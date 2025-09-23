# Proofmint Project

![Status](https://img.shields.io/badge/Status-Live-success.svg)
![Language](https://img.shields.io/badge/Solidity-0.8.x-blue.svg)
![Framework](https://img.shields.io/badge/Hardhat-💛-yellow.svg)
![Testing](https://img.shields.io/badge/Foundry-⚡-black.svg)
![Frontend](https://img.shields.io/badge/React-⚛-blue.svg)
![Network](https://img.shields.io/badge/Sepolia-Testnet-purple.svg)

A full-stack dApp featuring a token crowdsale with optional NFT receipts.  
Built as part of the Dapp University Blockchain Developer Mentorship.

---

## Project Status
- ✅ Contracts deployed & verified on Sepolia
- ✅ Frontend scaffolded (wallet connect, state panel)
- ✅ README & DEV_NOTES polish
- ⏳ Final UI polish (screenshots, tiny UX nits)
- ⏳ Demo video recording
- ⏳ Portfolio site card + live demo link

---

## Overview
- **Backend (Hardhat + Foundry)**  
  - ERC20 Token  
  - Crowdsale contract  
  - Optional ProofNFT (NFT receipts for buyers)  

- **Frontend (React + Vite + Tailwind)**  
  - Connect wallet (MetaMask, Sepolia)  
  - View live crowdsale stats  
  - Purchase tokens with ETH  
  - (Future) Display ProofNFT receipts  

---

## 🚀 Demo Flow
1. Connect wallet (MetaMask, Sepolia testnet)  
2. Enter ETH amount and buy tokens  
3. Receive tokens + auto-mint ProofNFT receipt (if enabled)  
4. Refresh sale state to view updated stats  
5. Withdraw balance (owner only)  

---

## Features
- Crowdsale contract where users can buy tokens with ETH  
- Live stats (rate, cap, raised, balance) displayed in the frontend  
- ERC20 token integration  
- Optional ProofNFT receipts for token buyers  

---

## Tech Stack
- **Smart Contracts**: Solidity, Hardhat, Foundry, TypeScript, Ethers.js  
- **Frontend**: React, Vite, Tailwind CSS  
- **Network**: Sepolia testnet  

---

## Testing
The contracts are tested with both **Hardhat** and **Foundry** to showcase flexibility in tooling.  
- **Hardhat** provides the main TypeScript-based workflow for compilation, deployment, and verification.  
- **Foundry** adds fast Solidity-native tests (`forge test -vv`) for critical flows like token minting, crowdsale purchases, and reverts.  

Together, these frameworks ensure the system is covered end-to-end while demonstrating cross-toolchain proficiency.

---

## Setup
To run Proofmint locally, clone the repo and install dependencies for both the backend (contracts) and the frontend (React app).  
You’ll need **Node.js (>=18)**, **npm**, and a Sepolia testnet wallet funded with ETH for testing purchases.  
The frontend also requires a `.env.local` file with deployed contract addresses and RPC configuration.

---

### Backend
```bash
cd proofmint
npm install
npx hardhat compile
npx hardhat test
forge test -vv
```

## Deploy to Sepolia (example)
# adjust path if your deploy script differs
```bash
npx hardhat run scripts/deploy/03_deploy_crowdsale.ts --network sepolia
```

---

## How to Run(Frontend)
```bash
cd proofmint-frontend
npm install
npm run dev
```
Create a .env.local file in proofmint-frontend/ with the following values (replace with your deployed addresses):
```bash
VITE_CHAIN_ID=11155111
VITE_CHAIN_ID_HEX=0xaa36a7

# Deployed contract addresses (Sepolia)
VITE_TOKEN_ADDR=0x...
VITE_NFT_ADDR=0x...
VITE_CROWDSALE_ADDR=0x...

# RPC (for reads if wallet is disconnected)
VITE_FALLBACK_RPC=https://eth-sepolia.g.alchemy.com/v2/your-key
```

---

## Known Gotchas
Sepolia only. The dApp is coded for chain ID 11155111 (0xaa36a7). On other chains, UI is disabled and a “Switch to Sepolia” prompt appears.

.env.local required. Missing or incorrect VITE_CROWDSALE_ADDR or VITE_FALLBACK_RPC can cause a blank screen or read-only state.

Read-only until wallet connects. The app uses a fallback RPC for initial reads; connect your wallet for live updates + write actions.

Owner-only Withdraw. The Withdraw button is hidden unless your connected wallet matches the Crowdsale owner(). This is enforced in both UI and contract.

State timing. After buys/withdraws, on-chain state can take a moment to index. The UI shows toasts + an Etherscan link and then refreshes state.

More docs: See proofmint-frontend/DEV_NOTES.md
 for current Sepolia addresses and the step-by-step UI test flow.

 ---

## Contracts (Sepolia)
(Addresses update with each new deployment)

Crowdsale: 0x...
Token: 0x...
ProofNFT: 0x... (optional)

---

Screenshots / Demo

(Add screenshots or GIFs showing wallet connect, buy flow, refresh state)

---

License

MIT

Last updated: 2025-09-22
