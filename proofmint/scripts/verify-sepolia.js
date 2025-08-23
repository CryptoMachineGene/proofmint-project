const fs = require("fs");
const { execSync } = require("child_process");
function sh(cmd){ console.log(cmd); execSync(cmd, { stdio: "inherit" }); }

const meta = JSON.parse(fs.readFileSync("deployments/latest.json","utf8"));
const token = meta.token;
const sale  = meta.crowdsale;
const rate  = meta.rateTokensPerEth;
const cap   = meta.capWei;

sh(`npx hardhat verify --network sepolia --contract contracts/Token.sol:Token ${token} "Sakura" "SKR"`);
sh(`npx hardhat verify --network sepolia ${sale} ${token} ${rate} ${cap}`);
