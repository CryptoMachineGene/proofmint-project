import { promises as fs } from "fs";
import path from "path";

const DIR = path.join(__dirname, "..", "..", "deployments");

export async function readAddresses(network: string) {
  try {
    const p = path.join(DIR, `${network}.json`);
    return JSON.parse(await fs.readFile(p, "utf8"));
  } catch {
    return {};
  }
}

export async function writeAddresses(network: string, data: Record<string, string>) {
  const p = path.join(DIR, `${network}.json`);
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, JSON.stringify(data, null, 2));
}
