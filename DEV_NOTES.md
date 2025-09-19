# WIP – Frontend white screen (sepolia mode)

Repro:
- `npm run frontend:dev:sepolia` → blank page.

Context:
- Latest Sepolia deploy saved to proofmint/deployments/sepolia.json and synced to frontend:
  - Token:     0x9712820E18e5f2B8cBe3da25f31b8f2F8c8576bF
  - ProofNFT:  0x16878c1557a62868BA38C79E2f238861C69a0eCC
  - Crowdsale: 0x5E63D55662f12D631714FA380fA73dF6829eD319

Suspects:
- `src/env.ts`/`src/config.ts` wiring; JSON import vs env overrides.
- Ensure tsconfig has `"resolveJsonModule": true`.

Quick next steps:
1) Open browser devtools console for the first runtime error.
2) Verify `import deployRaw from "./addresses/sepolia.json"` works; check tsconfig.
3) Temporary fallback: replace env.ts with a minimal static import that maps
   `{Crowdsale, Token, ProofNFT}` to CONTRACTS, no async.
4) Add a tiny debug panel to render CHAIN_ID and CONTRACTS on page.
