/** Shared browser/worker/Node checks against the frozen corpus and public API. */
export async function checkPilot(api, corpus, bindingsUrl, wasm) {
  let assertions = 0;
  const check = (value, message) => { assertions++; if (!value) throw new Error(message); };
  const equal = (a, b, message) => check(JSON.stringify(a) === JSON.stringify(b), message);
  const bindings = await import(/* @vite-ignore */ bindingsUrl.href);
  await bindings.default({ module_or_path: wasm ?? new URL("unglish_wasm_bg.wasm", bindingsUrl) });
  for (const fixture of corpus.cases) {
    const compiled = new bindings.RepairConfig(corpus.inventory.length, new Uint32Array(fixture.banned.flat()));
    equal([...compiled.repair(new Uint32Array(fixture.packet), fixture.policy === "drop-onset")], fixture.cuts, `${fixture.name}: raw cuts`);
    compiled.free();
    const config = { ...api.englishConfig, clusterConstraint: { repair: fixture.policy, banned: fixture.banned.map(p => p.map(id => corpus.inventory[id])) } };
    const backend = await api.initializeRustRepair(config, { bindingsUrl, wasm });
    const syllables = fixture.input.map(s => Object.fromEntries(Object.entries(s).map(([key, ids]) => [key, ids.map(id => ({ ...config.phonemes.find(p => p.sound === corpus.inventory[id]), marker: Symbol("metadata") }))])));
    const original = syllables.map(s => ({ onset: s.onset.slice(), nucleus: s.nucleus.slice(), coda: s.coda.slice() }));
    const trace = new api.TraceCollector();
    backend.repair(syllables, trace);
    const encoded = syllables.map(s => Object.fromEntries(Object.entries(s).map(([key, phonemes]) => [key, phonemes.map(p => corpus.inventory.indexOf(p.sound))])));
    equal(encoded, fixture.expected, `${fixture.name}: adapter output`);
    equal(trace.repairs, fixture.repairs, `${fixture.name}: trace`);
    for (let i = 0; i < syllables.length; i++) {
      for (const segment of ["onset", "nucleus", "coda"]) {
        const expected = segment === "onset" ? original[i][segment].slice(original[i][segment].length - syllables[i][segment].length)
          : original[i][segment].slice(0, syllables[i][segment].length);
        check(syllables[i][segment].every((p, j) => p === expected[j]), `${fixture.name}: retained object identity/order`);
      }
    }
    backend.repair(syllables, trace);
    equal(trace.repairs, fixture.repairs, `${fixture.name}: repeated trace unchanged`);
    backend.dispose(); backend.dispose();
    let disposed = false;
    try { backend.repair([]); } catch { disposed = true; }
    check(disposed, "disposed instance rejects repair");
  }
  // Main integration matrix: 3 configurations × 2 modes × 4 counts × morphology
  // × trace × 3 seeds × 12-word sequential batches (3,456 full words).
  let words = 0;
  const configs = [api.englishConfig,
    { ...api.englishConfig, id: "pilot-onset", clusterConstraint: { ...api.englishConfig.clusterConstraint, repair: "drop-onset" } },
    { ...api.englishConfig, id: "pilot-custom", clusterConstraint: { repair: "drop-coda", banned: [["t", "p"], ["p", "t"], ["ŋ", "t"]] } }];
  for (const config of configs) {
    const backend = await api.initializeRustRepair(config, { bindingsUrl, wasm });
    const ts = api.createGenerator(config), rust = api.createGenerator(config, { experimentalRepair: backend });
    check(rust.repairBackend === "rust-wasm-v1", "backend provenance");
    for (const mode of ["text", "lexicon"]) for (const syllableCount of [undefined, 1, 3, 7])
      for (const morphology of [false, true]) for (const trace of [false, true]) for (const seed of [42, 342, 1337]) {
        const options = { mode, syllableCount, morphology, trace, seed };
        const before = ts.generateWords(12, options), after = rust.generateWords(12, options);
        words += after.length;
        for (let i = 0; i < after.length; i++) {
          if (trace) { check(after[i].trace.repairBackend === "rust-wasm-v1", "trace provenance"); delete after[i].trace.repairBackend; }
          equal(after[i], before[i], `full parity ${config.id}/${JSON.stringify(options)}/${i}`);
        }
      }
    let leftDraws = 0, rightDraws = 0;
    const leftRng = api.createSeededRng(342), rightRng = api.createSeededRng(342);
    equal(rust.generateWords(20, { rand: () => { rightDraws++; return rightRng(); } }),
      ts.generateWords(20, { rand: () => { leftDraws++; return leftRng(); } }), "custom RNG stream");
    equal(leftDraws, rightDraws, "no added RNG draws");
    let mismatch = false;
    try { api.createGenerator({ ...config }, { experimentalRepair: backend }); } catch { mismatch = true; }
    check(mismatch, "configuration identity rejected");
    const invalid = [{ onset: [], nucleus: [], coda: [{ sound: "unknown-pilot-phoneme" }] }, { onset: [{ sound: "t" }], nucleus: [], coda: [] }];
    const snapshot = JSON.stringify(invalid);
    let rejected = false;
    try { backend.repair(invalid); } catch { rejected = true; }
    check(rejected && JSON.stringify(invalid) === snapshot, "invalid IDs rejected before mutation");
    // The no-boundary path must preserve validation, metadata and trace behavior.
    const single = [{ onset: Object.freeze([{ sound: "t", marker: "onset" }]),
      nucleus: Object.freeze([{ sound: "æ", marker: "nucleus" }]), coda: Object.freeze([]) }];
    const singleBefore = JSON.stringify(single);
    const singleTrace = new api.TraceCollector();
    backend.repair(single, singleTrace);
    check(JSON.stringify(single) === singleBefore && singleTrace.repairs.length === 0,
      "single syllable preserves frozen segments and metadata without trace events");
    for (const segment of ["onset", "nucleus", "coda"]) {
      const unknown = [{ onset: [], nucleus: [], coda: [], [segment]: [{ sound: "unknown-pilot-phoneme" }] }];
      const before = JSON.stringify(unknown);
      let failed = false;
      try { backend.repair(unknown); } catch { failed = true; }
      check(failed && JSON.stringify(unknown) === before, `single syllable rejects unknown ${segment} IDs before mutation`);
    }
    for (const length of [-1, 0x100000000]) {
      let failed = false;
      try { backend.repair([{ onset: { length }, nucleus: [], coda: [] }]); } catch (error) { failed = error instanceof RangeError; }
      check(failed, "single syllable validates lengths against the u32 format");
    }
    backend.dispose();
  }
  const compiled = new bindings.RepairConfig(corpus.inventory.length, new Uint32Array());
  for (const packet of [[], [0, 0], [1, 0, 2], [1, 0xffffffff], [1, 1, 0xffffffff, 0, 0], [1, 1, 1, 0, 0, 0xffffffff]]) {
    let rejected = false;
    try { compiled.repair(new Uint32Array(packet), false); } catch (error) { rejected = String(error).length > 0; }
    check(rejected, `malformed packet rejected: ${packet}`);
  }
  compiled.free();
  for (const pairs of [[1], [0xffffffff, 0]]) {
    let rejected = false;
    try { new bindings.RepairConfig(corpus.inventory.length, new Uint32Array(pairs)); } catch { rejected = true; }
    check(rejected, "invalid relation rejected");
  }
  let initFailed = false;
  try { await api.initializeRustRepair(api.englishConfig, { bindingsUrl: new URL("missing-bindings.js", bindingsUrl), wasm }); } catch { initFailed = true; }
  check(initFailed, "initialization failure propagated");
  let invalidWasm = false;
  const invalidUrl = new URL(bindingsUrl);
  invalidUrl.search = "?invalid-wasm";
  try { await api.initializeRustRepair(api.englishConfig, { bindingsUrl: invalidUrl, wasm: new Uint8Array([0]) }); } catch { invalidWasm = true; }
  check(invalidWasm, "invalid Wasm bytes reject first initialization");
  let invalidSound = false;
  try { await api.initializeRustRepair({ ...api.englishConfig, phonemes: [{ sound: "a|b" }] }, { bindingsUrl, wasm }); } catch { invalidSound = true; }
  check(invalidSound, "ambiguous inventory sounds explicitly rejected");
  return { fixtures: corpus.cases.length, words, assertions, backend: "rust-wasm-v1" };
}
