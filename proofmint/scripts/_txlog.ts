import fs from "node:fs";
import path from "node:path";

const LOG_PATH = path.resolve(__dirname, "../deployments/txlog.json");

export function appendTx(
  type: "purchase" | "withdraw" | "deploy" | "misc", 
  hash: string,
  meta: Record<string, any> = {}
  ) {
  try {
    let arr: any[] = [];
    if (fs.existsSync(LOG_PATH)) {
      arr = JSON.parse(fs.readFileSync(LOG_PATH, "utf8"));
      if (!Array.isArray(arr)) arr = [];
    }
    arr.push({ type, hash, ts: new Date().toISOString(), ...meta });
    fs.writeFileSync(LOG_PATH, JSON.stringify(arr, null, 2));
    console.log(`txlog: appended ${type} ${hash}`);
  } catch (e) {
    console.warn("txlog: failed to append tx:", e);
  }
}
