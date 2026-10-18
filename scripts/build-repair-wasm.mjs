import { spawnSync } from "node:child_process";
import { mkdirSync, readdirSync, copyFileSync, writeFileSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, stdio: "inherit" });
  if (result.status !== 0) throw new Error(`${command} failed; install the pinned tools in docs/rust-repair-pilot.md`);
}
const version = spawnSync("wasm-bindgen", ["--version"], { encoding: "utf8" });
if (version.stdout?.trim() !== "wasm-bindgen 0.2.100") throw new Error("wasm-bindgen-cli 0.2.100 is required");
run("cargo", ["build", "--locked", "--release", "--target", "wasm32-unknown-unknown", "-p", "unglish-wasm"], "rust");
mkdirSync("dist/wasm", { recursive: true });
run("wasm-bindgen", ["rust/target/wasm32-unknown-unknown/release/unglish_wasm.wasm", "--target", "web", "--out-dir", "dist/wasm", "--out-name", "unglish_wasm"], ".");
const hashes = {};
for (const file of readdirSync("dist/wasm")) {
  if (!/\.(wasm|js|ts)$/.test(file)) continue;
  hashes[file] = createHash("sha256").update(readFileSync(`dist/wasm/${file}`)).digest("hex");
}
writeFileSync("dist/wasm/manifest.json", JSON.stringify({ schema: 1, rust: "1.85.1", bindings: "0.2.100", hashes }, null, 2) + "\n");
for (const destination of ["demo/public/repair-wasm", "dist-demo/repair-wasm"]) {
  mkdirSync(destination, { recursive: true });
  copyFileSync("evaluation/repair-pilot/fixtures.json", `${destination}/fixtures.json`);
  for (const file of [...Object.keys(hashes), "manifest.json"]) copyFileSync(`dist/wasm/${file}`, `${destination}/${file}`);
}
