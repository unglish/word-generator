import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
const manifest = JSON.parse(readFileSync("dist/wasm/manifest.json", "utf8"));
for (const dir of ["dist/wasm", "demo/public/repair-wasm", "dist-demo/repair-wasm"]) {
  if (readFileSync(`${dir}/manifest.json`, "utf8") !== readFileSync("dist/wasm/manifest.json", "utf8")) throw new Error(`Stale manifest in ${dir}`);
  for (const [file, hash] of Object.entries(manifest.hashes)) {
    if (createHash("sha256").update(readFileSync(`${dir}/${file}`)).digest("hex") !== hash) throw new Error(`Stale ${dir}/${file}`);
  }
}
console.log("Repair bindings, declarations, and Wasm assets match in npm/demo/production outputs");
