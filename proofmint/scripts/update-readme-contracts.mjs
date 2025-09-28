import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ESM-safe __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---- Config paths
const ROOT = path.resolve(__dirname, "../..");            // repo root
const README_PATH = path.join(ROOT, "README.md");
const DEPLOY_PATH = path.resolve(__dirname, "../deployments/sepolia.json");
const TXLOG_PATH  = path.resolve(__dirname, "../deployments/txlog.json");


// ---- Helpers
const addrLink = (a) => `[\`${a}\`](https://sepolia.etherscan.io/address/${a})`;
const txLink   = (h) => `[\`${h.slice(0,10)}…\`](https://sepolia.etherscan.io/tx/${h})`;

function loadJson(p, fallback) {
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return fallback; }
}

// ---- Load addresses (be tolerant to key naming)
const dep = loadJson(DEPLOY_PATH, {});
const crowd = dep.crowdsale || dep.Crowdsale || dep.sale || "";
const token = dep.token     || dep.Token     || dep.erc20 || "";
const nft   = dep.nft       || dep.NFT       || dep.ProofNFT || "";

// ---- Load txlog and pick latest (prefer latest "purchase")
const txlog = loadJson(TXLOG_PATH, []);
let recent = [...txlog].sort((a,b) => new Date(b.ts) - new Date(a.ts));
let featuredTx = recent.find(x => x.type === "purchase") || recent[0];

// Build optional "Recent" list (last 3)
const recentList = recent.slice(0,3)
  .map(x => `- ${x.type}: ${txLink(x.hash)}  _(${new Date(x.ts).toISOString()})_`)
  .join("\n");

// ---- Compose contracts block
const lines = [];
lines.push(`- **Crowdsale**: ${crowd ? addrLink(crowd) : "_not deployed_"}`);
lines.push(`- **Token (ERC-20)**: ${token ? addrLink(token) : "_not deployed_"}`);
lines.push(`- **ProofNFT (ERC-721, optional)**: ${nft ? addrLink(nft) : "_not deployed_"}`);
lines.push("");
if (featuredTx?.hash) {
  lines.push(`**Recent tx:** ${txLink(featuredTx.hash)}  _(${featuredTx.type})_`);
  if (recentList) {
    lines.push("");
    lines.push("<details><summary>Recent (last 3)</summary>");
    lines.push("");
    lines.push(recentList);
    lines.push("");
    lines.push("</details>");
  }
}

const block = lines.join("\n");

// ---- Patch README between markers
let md = fs.readFileSync(README_PATH, "utf8");
const pattern = /(## Contracts \(Sepolia\)[\s\S]*?<!-- CONTRACTS:START -->)[\s\S]*?(<!-- CONTRACTS:END -->)/;

if (!pattern.test(md)) {
  console.error("Could not find Contracts markers in README.\nMake sure you have:\n\n## Contracts (Sepolia)\n<!-- CONTRACTS:START -->\n<!-- CONTRACTS:END -->");
  process.exit(1);
}

md = md.replace(pattern, `$1\n${block}\n$2`);
fs.writeFileSync(README_PATH, md);
console.log("README Contracts section updated (addresses + recent tx).");
