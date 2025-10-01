# Proofmint Project

![Status](https://img.shields.io/badge/Status-Live-success.svg)
![Language](https://img.shields.io/badge/Solidity-0.8.x-blue.svg)
![Framework](https://img.shields.io/badge/Hardhat-💛-yellow.svg)
![Testing](https://img.shields.io/badge/Foundry-⚡-black.svg)
![Frontend](https://img.shields.io/badge/React-⚛-blue.svg)
![Network](https://img.shields.io/badge/Sepolia-Testnet-purple.svg)
![License](https://img.shields.io/badge/License-MIT-green.svg)

A full-stack dApp featuring a token crowdsale with optional NFT receipts.  
Built as part of the **Dapp University Blockchain Developer Mentorship (Capstone Project)**.

---

## 🔗 Contracts & Links (Sepolia)

**Network:** Sepolia (Chain ID: 11155111)

- **Crowdsale:** [`0xEcB940c13A1EF6D411f2D7E15345591eb9fce1d7`](https://sepolia.etherscan.io/address/0xEcB940c13A1EF6D411f2D7E15345591eb9fce1d7)
- **Token (ERC-20):** [`0x9712820E18e5f2B8cBe3da25f31b8f2F8c8576bF`](https://sepolia.etherscan.io/address/0x9712820E18e5f2B8cBe3da25f31b8f2F8c8576bF)
- **ProofNFT (ERC-721, optional):** [`0xd3982fF82F27c790176138BC7115C6e32AFb0ED3`](https://sepolia.etherscan.io/address/0xd3982fF82F27c790176138BC7115C6e32AFb0ED3)

**Latest Transaction (example):** [`0x9905c061…`](https://sepolia.etherscan.io/tx/0x9905c061baaf0457115d77b2d47555c15317bc40383ff94725d6c804a283c2c7)

---

## 🚀 Demo

A short, on-chain walkthrough (Sepolia): connect → buy → view on Etherscan → owner withdraw.

- 📸 **Screenshots gallery:** [assets/SCREENSHOTS.md](assets/SCREENSHOTS.md)

### 3-minute flow
1. Open the dApp (read-only state shows via `FALLBACK_RPC`).  
2. Connect wallet → allow/switch to **Sepolia** if prompted.  
3. Buy `0.01` ETH → pending → confirmed → open Etherscan.  
4. (Owner) Withdraw → state reflects updated balances.  
5. Disconnect + hard refresh → read-only state persists.

---

## 🧩 Overview

**Backend (Hardhat + Foundry)**
- ERC-20 Token
- Crowdsale contract
- Optional ProofNFT (receipt NFT)

**Frontend (React + Vite + Tailwind)**
- Wallet connect (MetaMask/Brave)
- Live crowdsale stats
- Buy with ETH (auto-detects payable path)
- Owner withdraw

---

## ⚙️ Setup
Node 18+

### Backend
```bash
cd proofmint
npm install
npx hardhat compile
npx hardhat test
forge test -vv
```

### Deploy to Sepolia (example)
```bash
npx hardhat run scripts/deploy/03_deploy_crowdsale.ts --network sepolia
```

### Frontend
```bash
cd proofmint-frontend
npm install
npm run dev
npm run build && npm run preview
```

#### Create `proofmint-frontend/.env.local`
```ini
VITE_CHAIN_ID=11155111
VITE_CHAIN_ID_HEX=0xaa36a7
VITE_FALLBACK_RPC=<YOUR_PUBLIC_SEPOLIA_RPC_URL>

VITE_CROWDSALE_ADDRESS=0xEcB940c13A1EF6D411f2D7E15345591eb9fce1d7
VITE_TOKEN_ADDRESS=0x9712820E18e5f2B8cBe3da25f31b8f2F8c8576bF
VITE_NFT_ADDRESS=0xd3982fF82F27c790176138BC7115C6e32AFb0ED3
```

--- 

## 🧰 Troubleshooting

**White screen but Vite is running** → Ensure `index.html` has ``<div id="root"></div>`` and `src/main.tsx` uses `createRoot(...)`.

**“Missing VITE_*”** → Add keys to `.env.local` and restart `npm run dev`.

**Auto-reconnect on refresh** → remove `localhost:5173` from wallet **Connected sites**, or use a Private window for the “disconnected + read-only” state.

**Withdraw fails** → only the **owner** can call `withdraw()` (enforced by the contract).

---

## 🗺 Repo Layout
- `assets/SCREENSHOTS.md` — full demo gallery  
- `proofmint-frontend/` — React + Tailwind front-end  
- `proofmint/` — Hardhat + Foundry contracts + scripts  
- `deployments/sepolia.json` — addresses & metadata  
- `deployments/txlog.json` — recent tx log

---

## License
MIT

_Last updated: September 30, 2025_
