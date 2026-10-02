import { readFileSync, writeFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import * as api from "../../dist/index.js";
import ts from "typescript";
import { fileURLToPath } from "node:url";
const args = process.argv.slice(2);
const baselineIndex = args.indexOf("--baseline-report");
const baselineReport = args[baselineIndex + 1];
if (baselineIndex < 0 || !baselineReport || baselineReport.startsWith("--")) {
  throw new Error(
    "Usage: npm run bench:repair-optimization -- --baseline-report PATH [--verify-only]. " +
    "Download the archived optimization-results.json linked from PR #343.",
  );
}
const recorded = JSON.parse(readFileSync(baselineReport, "utf8"));
if (typeof recorded.baselineSource !== "string" || !recorded.baselineSource.trim()) {
  throw new Error("Baseline report must contain the saved adapter baselineSource");
}
const configUrl = new URL("../../dist/config/language.js", import.meta.url)
  .href;
const baselineJs = ts
  .transpileModule(recorded.baselineSource, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  })
  .outputText.replace('"../config/language.js"', JSON.stringify(configUrl));
const { initializeRustRepair: baselineInit } = await import(
  `data:text/javascript;base64,${Buffer.from(baselineJs).toString("base64")}`
);
import { checkPilot } from "./shared.mjs";
const root = fileURLToPath(new URL("../../", import.meta.url));
const url = new URL("../../dist/wasm/unglish_wasm.js", import.meta.url);
const wasm = readFileSync(new URL("unglish_wasm_bg.wasm", url));
const corpus = JSON.parse(
  readFileSync(`${root}/evaluation/repair-pilot/fixtures.json`),
);
const parity = await checkPilot(api, corpus, url, wasm);
if (process.argv.includes("--verify-only")) {
  const baselineParity = await checkPilot(
    { ...api, initializeRustRepair: baselineInit },
    corpus,
    url,
    wasm
  );
  assert.deepEqual(baselineParity, parity);
  console.log(JSON.stringify({ baseline: baselineParity, optimized: parity }));
  process.exit(0);
}
const backends = {
  baseline: await baselineInit(api.englishConfig, { bindingsUrl: url, wasm }),
  optimized: await api.initializeRustRepair(api.englishConfig, {
    bindingsUrl: url,
    wasm,
  }),
};
const median = (a) => [...a].sort((a, b) => a - b)[Math.floor(a.length / 2)];
const results = {
  environment: { node: process.version },
  methodology: {
    samples: 9,
    repairCalls: 200000,
    repairWarmup: 100000,
    generationWords: 2000,
    generationWarmup: 2000,
    ordering:
      "alternating for repair, rotating across three backends for generation",
    reset: "same array reset included in both mutating repair paths",
    trace: "new TraceCollector per traced repair",
    wasm: "same rebuilt artifact in both backends",
  },
  parity,
  sourceHashes: {
    baseline: createHash("sha256")
      .update(recorded.baselineSource)
      .digest("hex"),
    optimized: createHash("sha256")
      .update(readFileSync(`${root}/src/experimental/rust-repair.ts`))
      .digest("hex"),
    wasm: createHash("sha256").update(wasm).digest("hex"),
  },
  repair: {},
  generation: {},
};
let escaped;
const ph = (sound) => ({ sound, stress: 0 });
const ng = ph("ŋ"),
  t = ph("t"),
  p = ph("p"),
  v = ph("æ");
const words = [
  [
    { onset: [p], nucleus: [v], coda: [ng, ng] },
    { onset: [t, t], nucleus: [v], coda: [] },
  ],
  [
    { onset: [p], nucleus: [v], coda: [t] },
    { onset: [t], nucleus: [v], coda: [] },
  ],
  [{ onset: [p], nucleus: [v], coda: [] }],
];
function reset() {
  words[0][0].coda.length = 0;
  words[0][0].coda.push(ng, ng);
  words[0][1].onset.length = 0;
  words[0][1].onset.push(t, t);
}
function batch(backend, index, trace, count) {
  for (let i = 0; i < count; i++) {
    if (index === 0) reset();
    const collector = trace ? new api.TraceCollector() : undefined;
    backend.repair(words[index], collector);
    escaped = collector ?? words[index][0].coda.length;
  }
}
for (const trace of [false, true])
  for (const [index, label] of ["cascade", "unchanged", "single"].entries()) {
    const row = { baseline: [], optimized: [] };
    for (const name of ["baseline", "optimized"])
      batch(backends[name], index, trace, 100000);
    for (let sample = 0; sample < 9; sample++)
      for (const name of sample % 2
        ? ["optimized", "baseline"]
        : ["baseline", "optimized"]) {
        const start = performance.now();
        batch(backends[name], index, trace, 200000);
        row[name].push(((performance.now() - start) * 1e6) / 200000);
      }
    results.repair[`${label}-${trace ? "trace" : "plain"}`] = {
      samplesNs: row,
      baselineNs: median(row.baseline),
      optimizedNs: median(row.optimized),
      improvementPercent:
        100 * (1 - median(row.optimized) / median(row.baseline)),
    };
  }
const generators = {
  typescript: api.createGenerator(api.englishConfig),
  ...Object.fromEntries(
    Object.entries(backends).map(([k, backend]) => [
      k,
      api.createGenerator(api.englishConfig, { experimentalRepair: backend }),
    ]),
  ),
};
for (const trace of [false, true]) {
  const options = { seed: 342, mode: "lexicon", morphology: true, trace };
  const row = { typescript: [], baseline: [], optimized: [] };
  const expected = generators.typescript.generateWords(2000, options);
  for (const name of ["baseline", "optimized"]) {
    const actual = generators[name].generateWords(2000, options);
    if (trace) for (const word of actual) delete word.trace.repairBackend;
    assert.deepEqual(actual, expected);
  }
  for (let trial = 0; trial < 9; trial++) {
    const names = ["typescript", "baseline", "optimized"];
    const order = [...names.slice(trial % 3), ...names.slice(0, trial % 3)];
    for (const name of order) {
      const start = performance.now();
      escaped = generators[name].generateWords(2000, options);
      row[name].push(performance.now() - start);
    }
  }
  const medians = Object.fromEntries(
    Object.entries(row).map(([k, v]) => [k, median(v)]),
  );
  results.generation[trace ? "trace" : "plain"] = {
    samplesMs: row,
    mediansMs: medians,
    improvementPercent: 100 * (1 - medians.optimized / medians.baseline),
  };
}
writeFileSync(
  new URL("optimization-results.local.json", import.meta.url),
  JSON.stringify(results, null, 2),
);
console.log(
  JSON.stringify(
    {
      repair: Object.fromEntries(
        Object.entries(results.repair).map(([k, { samplesNs, ...v }]) => [
          k,
          v,
        ]),
      ),
      generation: Object.fromEntries(
        Object.entries(results.generation).map(([k, { samplesMs, ...v }]) => [
          k,
          v,
        ]),
      ),
    },
    null,
    2,
  ),
);
for (const backend of Object.values(backends)) backend.dispose();
void escaped;
