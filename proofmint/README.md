# Proofmint

[![Hardhat](https://img.shields.io/badge/Built%20with-Hardhat-blue)](https://hardhat.org/)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.x-purple)](https://docs.soliditylang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

A minimal Hardhat-based smart contract project for token sales with NFT receipts.

---

## Features
- **ERC20-like Token** for sale
- **Crowdsale contract** with cap & rate
- **Receipt NFT (`ProofNFT`)** with minter roles
- **Reentrancy protection** in tests
- **Hardhat tasks** for querying crowdsale + NFT
- **Verified on Sepolia**

---

## Quick Start
```bash
git clone https://github.com/YOUR-USERNAME/proofmint.git
cd proofmint
npm install
npx hardhat compile
npx hardhat test
```

## Deploy & Verify (one liner)

Deploy contracts to Sepolia and run verification automatically:
```bash
npx hardhat run scripts/deploy/03_deploy_crowdsale.ts --network sepolia && npm run verify:sepolia:ts
```

## Networks & Deployments (Sepolia)  
 > These parameters apply to the Sepolia deployment above.
```
Crowdsale: 0x4e0B4b8a62De3699634D9f0A53F87B74019eF636
ProofNFT : 0x8583219aDd5958C2aCE04748a87B61448941B82b
Token    : 0x9712820E18e5f2B8cBe3da25f31b8f2F8c8576bF
```

## Tasks & Scripts

**TypeScript helpers:**
```bash
npm run buy:sepolia:ts           # buy (default 0.001 ETH)
ETH=0.01 npm run buy:sepolia:ts  # override amount

npm run withdraw:sepolia:ts      # owner-only withdraw
CROWDSALE_ADDR=0x... npm run withdraw:sepolia:ts
```
**Crowdsale info:**
```bash
npx hardhat crowdsale:info --network sepolia --sale <SALE_ADDR>
```
Quote & buy:
```bash
npx hardhat crowdsale:quote --network sepolia --sale <SALE_ADDR> --eth 0.001
npx hardhat crowdsale:buy   --network sepolia --sale <SALE_ADDR> --eth 0.001
```
NFT totals:
```bash
npx hardhat proofnft:totalsupply --network sepolia --nft <NFT_ADDR>
```
Grant / revoke minter:
```bash
npx hardhat proofnft:grant-minter  --network sepolia --nft <NFT_ADDR> --to   <SALE_ADDR>
npx hardhat proofnft:revoke-minter --network sepolia --nft <NFT_ADDR> --from <OLD_ADDR>
```
Extras:
```bash
# Test coverage
npm run coverage

# Clean build artifacts
npx hardhat clean
```

## Buy Tokens (Sepolia)
Use the TypeScript helper (no frontend required):
```bash
npm run buy:sepolia:ts
# override amount:
ETH=0.01 npm run buy:sepolia:ts
```

## Withdraw Raised ETH (Owner Only):
Withdraws all ETH in the Crowdsale to the owner account.
```bash
# Uses deployments/latest.json for the crowdsale address
npm run withdraw:sepolia

# override crowdsale address if needed (use a full 0x… address):
CROWDSALE_ADDR=0x4e0B4b8a62De3699634D9f0A53F87B74019eF636 npm run withdraw:sepolia:ts
```

**Verify contracts (TypeScript helper):**
```bash
npm run verify:sepolia:ts         # verify Token, ProofNFT, and Crowdsale from deployments/sepolia.json
```

## Project Structure
```bash
contracts/           # Solidity smart contracts
  Crowdsale.sol
  Token.sol
  MockTokenReenter.sol

test/                # Mocha/Chai test files
  Crowdsale.ts

hardhat.config.ts    # Hardhat configuration
.gitignore           # Ignores build/cache/coverage outputs
package.json         # Project dependencies and scripts
deployments/         # Deployment addresses (JSON)
scripts/             # Deploy scripts (TS)
tasks/               # Custom Hardhat tasks (TS)

```

## Crowdsale Parameters
- **Rate**: 1000 tokens / 1 ETH (scaled to 1e18)
- **Cap**: 10 ETH total
- **Receipts**: Mints **one NFT per purchase** (`ReceiptMinted(to, tokenId, paidWei, tokensOut)`)
- **Buy**: send ETH to the Crowdsale contract or call `buyTokens()`
- **Withdraw**: `onlyOwner` can withdraw raised ETH


<details>
<summary>Developer Tips</summary>

- Amount override: `ETH=0.05 npm run buy:sepolia:ts`  
- Address override: `SALE_ADDR=0x... npm run buy:sepolia:ts`  
- Keep `solcover.js` as-is; it’s the expected format for `hardhat-coverage`.
</details>


## License

MIT © 2025 Proofmint Contributors
