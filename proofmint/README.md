Proofmint

[![Hardhat](https://img.shields.io/badge/Built%20with-Hardhat-blue)](https://hardhat.org/)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.x-purple)](https://docs.soliditylang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

A minimal Hardhat-based smart contract project for token sales with NFT receipts.

---

Features
- **ERC20-like Token** for sale
- **Crowdsale contract** with cap & rate
- **Receipt NFT (`ProofNFT`)** with minter roles
- **Reentrancy protection** in tests
- **Hardhat tasks** for querying crowdsale + NFT
- **Verified on Sepolia**

---

Setup
```bash
git clone https://github.com/YOUR-USERNAME/proofmint.git
cd proofmint
npm install
npx hardhat compile
npx hardhat test
```
Contracts (Sepolia)

Crowdsale: 0xF7DC27b66fa34Dbbd1369aF2e5aD5bcF20Fcf1b5
ProofNFT: 0x595492ABfFf082596583715f0a568811368AFfbE
Token: 0x9712820E18e5f2B8cBe3da25f31b8f2F8c8576bF

Usage (Hardhat tasks)
Crowdsale info:
```bash
npx hardhat crowdsale:info --network sepolia --sale <SALE_ADDR>
```
Quote & buy:
```bash
npx hardhat crowdsale:quote --network sepolia --sale <SALE_ADDR> --eth 0.001
npx hardhat crowdsale:buy --network sepolia --sale <SALE_ADDR> --eth 0.001
```
NFT total supply:
```bash
npx hardhat proofnft:totalsupply --network sepolia --nft <NFT_ADDR>
```
Grant/revoke minter:
```bash
npx hardhat proofnft:grant-minter --network sepolia --nft <NFT_ADDR> --to <SALE_ADDR>
npx hardhat proofnft:revoke-minter --network sepolia --nft <NFT_ADDR> --from <OLD_ADDR>
```

Extras
Run coverage:
```bash
npm run coverage
```

Clean build artifacts:
```bash
npx hardhat clean
```

Project Structure
```bash
contracts/           # Solidity smart contracts
  Crowdsale.sol
  Token.sol
  MockTokenReenter.sol

test/                # Mocha/Chai test files
  Crowdsale.js

hardhat.config.js    # Hardhat configuration
.gitignore           # Ignores build/cache/coverage outputs
package.json         # Project dependencies and scripts
```

Live Test (Buy Tokens on Sepolia)

Use the script to purchase tokens from the deployed crowdsale:
```bash
npm run buy:sepolia
```

Withdraw Raised ETH (Owner Only)
Withdraws all ETH in the Crowdsale to the owner account.
```bash
# Uses deployments/latest.json for the crowdsale address
npm run withdraw:sepolia

# Or override with a specific address
CROWDSALE_ADDR=0xCFCdAb4566285Ee54650E3B7877f740b83aE8Fcf npm run withdraw:sepolia
```

Buy Tokens (Sepolia)

You can purchase tokens from the deployed Crowdsale using a simple script (no frontend required).

Default (uses deployer account)
```bash
npm run buy:sepolia
```

License

MIT © 2025 Proofmint Contributors
