# DEV_NOTES

## Addresses
- Crowdsale: <ADDR>
- Token: <ADDR>
- NFT: <ADDR>

## Gotchas
- Must be on Sepolia (11155111 / 0xaa36a7)
- .env.local required: CHAIN_ID, CHAIN_ID_HEX, FALLBACK_RPC, CROWDSALE_ADDRESS, etc.
- Buy: uses buyWithAuto (send ETH, fallback buyTokens)
- Withdraw: owner-only, hidden for others

