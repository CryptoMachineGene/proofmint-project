# Proofmint Project

![Status](https://img.shields.io/badge/Status-In%20Progress-orange.svg)
![Language](https://img.shields.io/badge/solidity-0.8.x-blue.svg)
![Framework](https://img.shields.io/badge/Hardhat-💛-yellow.svg)
![Frontend](https://img.shields.io/badge/React-⚛-blue.svg)
![Chain](https://img.shields.io/badge/Network-Sepolia-purple.svg)

A full-stack dApp featuring a token crowdsale with optional NFT receipts.  
Built as part of the Dapp University Blockchain Developer Mentorship.

---

## Overview
- **Backend (Hardhat)**  
  - ERC20 Token  
  - Crowdsale contract  
  - Optional ProofNFT (NFT receipts for buyers)  

- **Frontend (React + Vite + Tailwind)**  
  - Connect wallet (MetaMask or other EIP-1193 providers)  
  - View live crowdsale stats  
  - Purchase tokens with ETH  
  - (Future) Display ProofNFT receipts  

---

## Dev Notes
- Frontend runs on [http://localhost:5173](http://localhost:5173) with Vite.
- Connect wallet → Buy tokens → Refresh sale state.


## Features
- Crowdsale contract where users can buy tokens with ETH
- Live stats (rate, cap, raised) displayed in the frontend
- ERC20 token integration
- Optional ProofNFT receipts for token buyers

---

## Tech Stack
- **Smart Contracts**: Solidity, Hardhat, TypeScript, Ethers.js  
- **Frontend**: React, Vite, Tailwind CSS  
- **Network**: Sepolia testnet  

---

## Setup

### Backend
```bash
cd proofmint
npm install
npx hardhat compile
npx hardhat test
```

### Deploy to Sepolia (example):
```bash
npx hardhat run scripts/deploy_crowdsale.ts --network sepolia
```

### Frontend
```bash
cd proofmint-frontend
npm install
npm run dev
```

## Demo Flow

1. Connect wallet (Sepolia)

2. See crowdsale stats (rate, cap, raised, token metadata)

3. Buy tokens with ETH

4. (Optional) View ProofNFT receipt

## Contracts (Sepolia)

Crowdsale: 0x...

Token: 0x...

ProofNFT: 0x... (optional)

Replace with your deployed contract addresses after Sepolia deployment.

## Screenshots / Demo

## License

MIT
