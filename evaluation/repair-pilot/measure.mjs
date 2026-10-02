import { performance } from "node:perf_hooks";
import { cpus, platform, arch } from "node:os";
import { readFileSync, writeFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import * as api from "../../dist/index.js";
import { repairClusters } from "../../dist/core/repair.js";

const url = new URL("../../dist/wasm/unglish_wasm.js", import.meta.url);
const wasm = readFileSync(new URL("unglish_wasm_bg.wasm", url));
const beforeMemory = process.memoryUsage();
const cold = performance.now();
const backend = await api.initializeRustRepair(api.englishConfig, { bindingsUrl: url, wasm });
const coldMs = performance.now() - cold;
const bindings = await import(url.href);
const raw = new bindings.RepairConfig(4, new Uint32Array([2, 1]));
const packet = new Uint32Array([1, 2, 1, 1, 2, 0, 3, 2, 2, 2, 1, 0, 1, 1, 3]);
const ph = sound => ({ sound, stress: 0 });
const fixture = () => [{ onset: [ph("p")], nucleus: [ph("æ")], coda: [ph("ŋ"), ph("ŋ")] }, { onset: [ph("t"), ph("t")], nucleus: [ph("æ")], coda: [] }];
// Controlled pair relation matches the native measurement, rather than all English bans.
const config = { ...api.englishConfig, clusterConstraint: { repair: "drop-coda", banned: [["ŋ", "t"]] } };
const controlled = await api.initializeRustRepair(config, { bindingsUrl: url, wasm });
const banned = new Set(["ŋ|t"]);
function sample(action, count) {
  for (let i = 0; i < 2000; i++) action();
  return Array.from({ length: 5 }, () => {
    const start = performance.now();
    for (let i = 0; i < count; i++) action();
    return (performance.now() - start) * 1e6 / count;
  });
}
const repair = {
  packetCopyNs: sample(() => new Uint32Array(packet), 20000),
  rawWasmNs: sample(() => raw.repair(packet, false), 20000),
  typescriptNs: sample(() => repairClusters(fixture(), banned, "drop-coda"), 20000),
  adapterNs: sample(() => controlled.repair(fixture()), 20000),
  typescriptTraceNs: sample(() => repairClusters(fixture(), banned, "drop-coda", new api.TraceCollector()), 20000),
  adapterTraceNs: sample(() => controlled.repair(fixture(), new api.TraceCollector()), 20000),
};
const ts = api.createGenerator(api.englishConfig), rust = api.createGenerator(api.englishConfig, { experimentalRepair: backend });
const generation = [];
for (const trace of [false, true]) {
  const options = { seed: 342, mode: "lexicon", morphology: true, trace };
  ts.generateWords(200, options); rust.generateWords(200, options);
  const row = { options, wordsPerSample: 2000, typescriptMs: [], rustWasmMs: [] };
  for (let trial = 0; trial < 5; trial++) {
    for (const name of trial % 2 ? ["rustWasm", "typescript"] : ["typescript", "rustWasm"]) {
      const generator = name === "typescript" ? ts : rust;
      const start = performance.now();
      generator.generateWords(2000, options);
      row[`${name}Ms`].push(performance.now() - start);
    }
  }
  generation.push(row);
}
const files = ["unglish_wasm.js", "unglish_wasm_bg.wasm"].map(file => {
  const data = readFileSync(new URL(file, url));
  return { file, bytes: data.length, gzipBytes: gzipSync(data).length, sha256: createHash("sha256").update(data).digest("hex") };
});
const native = JSON.parse(execFileSync("cargo", ["+1.85.1", "run", "--locked", "--release", "--manifest-path", "rust/Cargo.toml", "-p", "unglish-core", "--example", "measure"], { encoding: "utf8" }));
const result = {
  schema: 1, environment: { node: process.version, platform: platform(), arch: arch(), cpu: cpus()[0].model },
  provenance: { source: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(), sourceState: "pilot working tree", sourceHashes: Object.fromEntries(["rust/unglish-core/src/lib.rs", "rust/unglish-wasm/src/lib.rs", "src/experimental/rust-repair.ts", "src/core/generate.ts", "evaluation/repair-pilot/measure.mjs"].map(path => [path, createHash("sha256").update(readFileSync(path)).digest("hex")])), config: "englishConfig + controlled repair-only relation", backends: ["typescript", "rust-wasm-v1", "native-rust"], fixtureSha256: createHash("sha256").update(readFileSync(new URL("fixtures.json", import.meta.url))).digest("hex"), seed: 342 },
  coldMs, repair, generation, native, files,
  memory: { before: beforeMemory, after: process.memoryUsage(), limitation: "process totals include JIT and allocation; not isolated Wasm resident memory" },
};
writeFileSync("evaluation/repair-pilot/results.local.json", JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify(result, null, 2));
raw.free(); controlled.dispose(); backend.dispose();
