# DEV_NOTES

Internal developer notes for Proofmint Frontend + Contracts.

---

## Deploy Addresses (Sepolia)

- **Token**: `0x9712820E18e5f2B8cBe3da25f31b8f2F8c8576bF`  
- **ProofNFT**: `0x16878c1557a62868BA38C79E2f238861C69a0eCC`  
- **Crowdsale**: `0x5E63D55662f12D631714FA380fA73dF6829eD319`

_Source of truth: `deployments/sepolia.json` — always copy these into `.env.local` and the README’s Contracts section after redeploys._

---

## Scripts

### Check Crowdsale

Inspect contract for core fields (owner, rate, cap, raised):

```bash
CHECK_ADDR=0xYourCrowdsale \
npx hardhat run scripts/check_crowdsale.ts --network sepolia
```

Sample output:
```json
{
    "owner": "0x5eFA0F877F5434a8859815F4238425cA53430C26",
  "rate": "1000000000000000000000",
  "capPretty": "10.0 ETH",
  "weiRaisedPretty": "0.02 ETH",
  "hasBuyTokens": true,
  "hasWithdraw": true,
  "acceptsPlainETH": true
}
```

Gotchas

Must be on Sepolia (11155111).
Withdraw is owner-only (non-owners won’t see the button).
VITE_FALLBACK_RPC required in .env.local for read-only load.
buyWithAuto handles both plain ETH and buyTokens() fallback.
Sync .env.local with latest deployments/sepolia.json.

Workflow

Dev server:
```bash
cd proofmint-frontend
npm run dev
```

Build:
```bash
npm run build && npm run preview
```

Docs:

Update README.md Project Status when milestones are hit.

Keep screenshots current (docs/screenshots/).

Always refresh Sepolia addresses in README + .env.local.

Project Status (Internal)

✅ Contracts complete & verified on Sepolia
✅ Frontend functional (wallet connect, buy, withdraw, state refresh)
✅ Buy/Withdraw UI polish
⏳ README + DEV_NOTES polish
⏳ Portfolio/demo site polish

Last updated: 2025-09-21

Troubleshooting
WIP – Frontend white screen (Sepolia mode)

Repro:
```bash
npm run frontend:dev:sepolia → blank page.
```

Context:

Latest Sepolia deploy saved to proofmint/deployments/sepolia.json and synced to frontend:

Token: 0x9712820E18e5f2B8cBe3da25f31b8f2F8c8576bF

ProofNFT: 0x16878c1557a62868BA38C79E2f238861C69a0eCC

Crowdsale: 0x5E63D55662f12D631714FA380fA73dF6829eD319

Suspects:

src/env.ts / src/config.ts wiring; JSON import vs env overrides.

Ensure tsconfig.json has "resolveJsonModule": true.

Quick next steps:

Open browser devtools console for the first runtime error.

Verify import deployRaw from "./addresses/sepolia.json" works; check tsconfig.

Temporary fallback: replace env.ts with a minimal static import that maps {Crowdsale, Token, ProofNFT} to CONTRACTS, no async.

Add a tiny debug panel to render CHAIN_ID and CONTRACTS on page.
