import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { checkPilot, checkAdapterContracts } from "./shared.mjs";
const temp = mkdtempSync(join(tmpdir(), "unglish-repair-package-"));
try {
  const [packed] = JSON.parse(execFileSync("npm", ["pack", "--ignore-scripts", "--json", "--pack-destination", temp], { encoding: "utf8" }));
  for (const file of ["dist/index.js", "dist/index.d.ts", "dist/wasm/unglish_wasm.js", "dist/wasm/unglish_wasm.d.ts", "dist/wasm/unglish_wasm_bg.wasm", "dist/wasm/manifest.json"]) {
    if (!packed.files.some(f => f.path === file)) throw new Error(`npm artifact missing ${file}`);
  }
  execFileSync("tar", ["-xzf", join(temp, packed.filename), "-C", temp]);
  const root = join(temp, "package");
  const api = await import(pathToFileURL(join(root, "dist/index.js")).href);
  const manifest = JSON.parse(readFileSync(join(root, "dist/wasm/manifest.json"), "utf8"));
  for (const [file, hash] of Object.entries(manifest.hashes)) {
    if (createHash("sha256").update(readFileSync(join(root, "dist/wasm", file))).digest("hex") !== hash) throw new Error(`Packed asset hash mismatch: ${file}`);
  }
  const url = pathToFileURL(join(root, "dist/wasm/unglish_wasm.js"));
  const wasm = readFileSync(new URL("unglish_wasm_bg.wasm", url));
  // There is no implicit bindings URL: bundlers would resolve it against the consumer's chunk.
  let missingUrlRejected = false;
  try { await api.initializeRustRepair(api.englishConfig, { wasm }); } catch (error) { missingUrlRejected = error instanceof TypeError; }
  if (!missingUrlRejected) throw new Error("Packed initialization must require bindingsUrl");
  const backend = await api.initializeRustRepair(api.englishConfig, { bindingsUrl: url, wasm });
  const generator = api.createGenerator(api.englishConfig, { experimentalRepair: backend });
  if (generator.generateWord({ seed: 342 }).written.clean !== api.generateWord({ seed: 342 }).written.clean) throw new Error("Packed initialization mismatch");
  backend.dispose();
  const corpus = JSON.parse(readFileSync("evaluation/repair-pilot/fixtures.json", "utf8"));
  const adapterAssertions = await checkAdapterContracts(api, url, wasm);
  console.log(JSON.stringify({ package: packed.filename, bytes: packed.size, ...await checkPilot(api, corpus, url, wasm), adapterAssertions }, null, 2));
} finally { rmSync(temp, { recursive: true, force: true }); }
