/**
 * Merge-gate plan probes for narrow IPA Speak (UW-15 / UW-16).
 *
 * Loads vendored Chimera wasm, applies `toNarrowIpa`, then asserts tokenize +
 * plan kinds for the three critical remaps and the /dr/ control.
 *
 * Usage (after `npm run build`):
 *   node scripts/narrow-ipa-chimera-probe.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const wasmPath = join(root, "demo/vocal/chimera/wasm/chimera.wasm");

const enc = new TextEncoder();
const dec = new TextDecoder();

async function loadChimera(bytes) {
  const mod = await WebAssembly.compile(bytes);
  if (WebAssembly.Module.imports(mod).length) {
    throw new Error("chimera wasm must not have imports");
  }
  const exports = (await WebAssembly.instantiate(mod, {})).exports;
  function call(fn, args = {}) {
    const payload = enc.encode(JSON.stringify({ fn, ...args }));
    const p = exports.chimera_alloc(payload.length);
    new Uint8Array(exports.memory.buffer, p, payload.length).set(payload);
    const status = exports.chimera_call(p, payload.length);
    exports.chimera_free(p, payload.length);
    const out = dec.decode(
      new Uint8Array(exports.memory.buffer, exports.chimera_result_ptr(), exports.chimera_result_len()),
    );
    const value = JSON.parse(out);
    if (status !== 0) throw new Error(`engine ${fn}: ${value.error}`);
    return value;
  }
  return { call };
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const { toNarrowIpa } = await import(pathToFileURL(join(root, "dist/index.js")).href);
const { call } = await loadChimera(readFileSync(wasmPath));

const body = { female: 0, child: 0 };
const planOpts = { body, t0: 0, rate: 0.85, f0: 110 };

function planKinds(ipa) {
  const segments = call("tokenizeIpa", { text: ipa });
  const plan = call("planUtterance", { segments, options: planOpts });
  return {
    tokens: segments.map((s) => s.ipa),
    kinds: plan.segments.map((s) => s.kind),
    labels: [...new Set(plan.gestures.map((g) => g.label).filter(Boolean))],
    tipMoves: plan.gestures
      .filter((g) => g.targets && ("ttX" in g.targets || "ttY" in g.targets))
      .map((g) => ({ label: g.label, ttX: g.targets.ttX, ttY: g.targets.ttY, ttCurl: g.targets.ttCurl })),
  };
}

const cases = [
  {
    name: "r→ɹ approximant (brɪŋz)",
    broad: "brɪŋz",
    expectNarrow: "bɹɪŋz",
    check(result) {
      assert(result.kinds.includes("approximant"), `expected approximant, got ${result.kinds}`);
      assert(!result.kinds.includes("trill"), `unexpected trill in ${result.kinds}`);
      assert(result.tokens.includes("ɹ"), `token ɹ missing: ${result.tokens}`);
      assert(!result.tokens.includes("r"), `bare r still present: ${result.tokens}`);
    },
  },
  {
    name: "ɜ→ɝ vowel (rɜnd / swɜnd)",
    broad: "rɜnd",
    expectNarrow: "ɹɝnd",
    check(result) {
      assert(result.kinds.includes("vowel") || result.labels.some((l) => l === "ɝ" || l?.includes("ɝ")),
        `expected ɝ vowel gesture; kinds=${result.kinds} labels=${result.labels}`);
      assert(!result.kinds.includes("?"), `silent ? kind still present: ${result.kinds}`);
      const sw = planKinds(toNarrowIpa("swɜnd"));
      assert(!sw.kinds.includes("?"), `swɜnd still has ?: ${sw.kinds}`);
      assert(sw.tokens.includes("ɝ"), `swɜnd missing ɝ: ${sw.tokens}`);
    },
  },
  {
    name: "əʊ→oʊ diphthong (bəʊt)",
    broad: "bəʊt",
    expectNarrow: "boʊt",
    check(result) {
      assert(result.tokens.includes("oʊ") || result.tokens.some((t) => t === "oʊ"),
        `expected oʊ token, got ${result.tokens}`);
      assert(!(result.tokens.includes("ə") && result.tokens.includes("ʊ")),
        `əʊ still split as ə+ʊ: ${result.tokens}`);
    },
  },
  {
    name: "/dr/ approximant tip move (dræl)",
    broad: "dræl",
    expectNarrow: "dɹæl",
    check(result) {
      assert(result.kinds.includes("approximant"), `expected approximant after /d/, got ${result.kinds}`);
      assert(!result.kinds.includes("trill"), `unexpected trill after /d/: ${result.kinds}`);
      const approx = result.tipMoves.find((g) => g.label === "ɹ" || g.ttCurl !== undefined);
      assert(approx, `expected ɹ tip targets; tipMoves=${JSON.stringify(result.tipMoves)}`);
      // Lab control: approximant tip leaves stop place (ttX≈5.35 vs stop 6.25).
      if (approx.ttX !== undefined) {
        assert(approx.ttX < 6.0, `ɹ tip ttX=${approx.ttX} still near stop place`);
      }
    },
  },
];

let failed = 0;
for (const probe of cases) {
  const narrow = toNarrowIpa(probe.broad);
  try {
    assert(narrow === probe.expectNarrow, `narrow mismatch: ${narrow} !== ${probe.expectNarrow}`);
    const result = planKinds(narrow);
    probe.check(result);
    console.log(`PASS  ${probe.name}`);
    console.log(`      broad=${probe.broad} → narrow=${narrow}`);
    console.log(`      tokens=[${result.tokens.join(" ")}] kinds=[${result.kinds.join(" ")}]`);
  } catch (err) {
    failed += 1;
    console.error(`FAIL  ${probe.name}: ${err instanceof Error ? err.message : err}`);
  }
}

if (failed) {
  console.error(`\n${failed} probe(s) failed`);
  process.exit(1);
}
console.log(`\nAll ${cases.length} Chimera plan probes passed.`);
