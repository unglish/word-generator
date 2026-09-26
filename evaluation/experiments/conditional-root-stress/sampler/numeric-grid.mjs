import assert from "node:assert/strict";
import { gzipSync } from "node:zlib";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { ROOT, assertStillFrozen, engineIdentity, freshOutput, loadFreeze, parseArgs, sha, writeExclusive } from "./integrity.mjs";

const GRID = 2 ** 32;
const CELLS = 15;

export function lawInput(protocol, caseSpec) {
  const value = { ...protocol.defaults, ...caseSpec };
  assert(["all", "even-indices"].includes(value.heavyMask));
  return {
    beforePrimary: Array(value.n).fill("unmarked"),
    afterPrimary: Array.from({ length: value.n }, (_, i) => i === value.primary ? "primary" : "unmarked"),
    operationalHeavy: Array.from({ length: value.n }, (_, i) => value.heavyMask === "all" || i % 2 === 0),
    secondary: { enabled: value.secondaryEnabled, candidateWindow: value.window, probability: value.secondaryPercent,
      heavyWeight: value.weights[0], lightWeight: value.weights[1] },
    rhythmic: { enabled: value.rhythmicEnabled, probability: value.rhythmicPercent, requireUnstressedNeighbors: value.neighbors },
    lambda: Math.log(2),
  };
}

function numericFirst(a, b, u) {
  const total = Math.max(a, b) + Math.log1p(Math.exp(Math.min(a, b) - Math.max(a, b)));
  return a <= b ? Math.log(u) < a - total : Math.log1p(-u) > b - total;
}

export function drawnSteps(sample) {
  return [...sample.componentDraws.map(step => ({ coordinate: ["component", step.candidateIndex, step.remainingFromIndex],
    first: step.takeCandidate, a: step.logCandidateMass, b: step.logRemainingMass, ordinal: step.drawOrdinal, uniform: step.uniform })),
  ...sample.backward.filter(step => step.kind === "drawn").map(step => ({ coordinate: ["backward", step.syllableIndex, step.remainingSecondaryCount],
    first: !step.previousMarked, a: step.logUnmarkedMass, b: step.logMarkedMass, ordinal: step.drawOrdinal, uniform: step.uniform }))];
}

export function sampleRow(law, count, row) {
  assert.equal(row.length, CELLS);
  assert(row.every(value => Number.isInteger(value) && value >= 0 && value < GRID));
  let consumed = 0;
  const sample = law.sample(count, () => {
    assert(consumed < CELLS, "Sampler exceeded the registered fixed row");
    return row[consumed++] / GRID;
  });
  checkNumericExecution(sample, row, consumed);
  return { sample, consumed };
}

export function checkNumericExecution(sample, row, consumed) {
  const steps = drawnSteps(sample);
  assert.equal(steps.length, consumed);
  steps.forEach((step, i) => {
    assert.equal(step.ordinal, i);
    assert.equal(step.uniform, row[i] / GRID);
    assert.equal(step.first, numericFirst(step.a, step.b, step.uniform), "Recorded branch disagrees with the declared numeric execution");
  });
}

/** Exhausts binary histories, not uint32 values; the grid count assumes a monotone predicate. */
export function buildNumericTree(law, count, call = row => sampleRow(law, count, row)) {
  const nodes = [];
  let apiCalls = 0;
  function visit(prefix) {
    assert(prefix.length <= CELLS);
    const id = nodes.length;
    nodes.push(null);
    const probes = new Map();
    const probe = value => {
      if (!probes.has(value)) {
        const row = [...prefix, value, ...Array(CELLS - prefix.length - 1).fill(0)];
        const observation = call(row);
        apiCalls++;
        probes.set(value, { uint32: value, ...structuredClone(observation) });
      }
      return probes.get(value);
    };
    // A leaf needs no speculative next draw, including when its prefix fills a row.
    const row = [...prefix, ...Array(CELLS - prefix.length).fill(0)];
    const base = call(row);
    apiCalls++;
    if (base.consumed === prefix.length) {
      nodes[id] = { kind: "leaf", prefix: [...prefix], ...structuredClone(base) };
      return id;
    }
    assert(base.consumed > prefix.length && prefix.length < CELLS);
    probes.set(0, { uint32: 0, ...structuredClone(base) });
    const coordinate = drawnSteps(base.sample)[prefix.length].coordinate;
    function first(value) {
      const observation = probe(value);
      const next = drawnSteps(observation.sample)[prefix.length];
      assert(next, "Branch disappeared under its current input value");
      assert.deepEqual(next.coordinate, coordinate, "A current draw changed an earlier decision");
      return next.first;
    }
    let low = 0, high = GRID;
    const search = [];
    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      search.push(middle);
      if (first(middle)) low = middle + 1;
      else high = middle;
    }
    const boundary = low;
    const required = new Set([0, GRID - 1, GRID / 4, GRID / 2, 3 * GRID / 4]);
    for (const value of [boundary - 1, boundary]) if (value >= 0 && value < GRID) required.add(value);
    for (const value of required) assert.equal(first(value), value < boundary, "Numeric boundary/monotonicity probe");
    for (const [value, observation] of probes) assert.equal(drawnSteps(observation.sample)[prefix.length].first, value < boundary);
    const left = boundary > 0 ? visit([...prefix, 0]) : null;
    const right = boundary < GRID ? visit([...prefix, boundary]) : null;
    nodes[id] = { kind: "branch", prefix: [...prefix], boundary, probes: [...probes.values()], search, first: left, second: right };
    return id;
  }
  const root = visit([]);
  return { root, nodes, apiCalls };
}

export function fixedRows(protocol) {
  return [...protocol.transcriptRows.constantUint32.map(value => Array(CELLS).fill(value)),
    Array.from({ length: CELLS }, (_, i) => protocol.transcriptRows.alternatingUint32[i % 2])];
}

function mutateReturned(result) {
  result.sample.marks.fill("secondary");
  result.sample.count.components.length = 0;
  result.sample.backward.length = 0;
  result.sample.componentDraws.length = 0;
  result.sample.work.allocatedCells = -1;
}

export function captureCase(createLaw, protocol, caseSpec) {
  const input = lawInput(protocol, caseSpec);
  const untouched = structuredClone(input);
  const law = createLaw(input);
  const fixed = fixedRows(protocol).map(row => {
    const first = sampleRow(law, caseSpec.K, row);
    const saved = structuredClone(first);
    mutateReturned(first);
    const replay = sampleRow(law, caseSpec.K, row);
    assert.deepEqual(replay, saved, "A previous returned result mutated the law");
    return { row, beforeMutation: saved, replay: structuredClone(replay) };
  });
  const mutationRow = Array(CELLS).fill(GRID / 2);
  const beforeInputMutation = structuredClone(sampleRow(law, caseSpec.K, mutationRow));
  input.beforePrimary.fill("primary");
  input.afterPrimary.fill("secondary");
  input.operationalHeavy.fill(false);
  input.secondary.enabled = false;
  input.rhythmic.probability = 100;
  const afterInputMutation = sampleRow(law, caseSpec.K, mutationRow);
  assert.deepEqual(afterInputMutation, beforeInputMutation, "Input mutation reached the law");
  const tree = buildNumericTree(law, caseSpec.K);
  return { id: caseSpec.id, input: untouched, fixed,
    inputMutation: { row: mutationRow, changedInput: structuredClone(input), before: beforeInputMutation, after: structuredClone(afterInputMutation) },
    tree, apiCalls: { fixedIncludingReplay: fixed.length * 2, inputMutation: 2, tree: tree.apiCalls } };
}

async function main() {
  const args = parseArgs(process.argv.slice(2), ["freeze", "freeze-sha", "out"]);
  const output = await freshOutput(args.out);
  const { freeze, freezeBytes, protocol } = await loadFreeze(args.freeze, args["freeze-sha"]);
  const engine = await engineIdentity();
  const { createRootStressLaw } = await import(pathToFileURL(resolve(ROOT, "src/index.ts")).href);
  const cases = protocol.cases.map(caseSpec => captureCase(createRootStressLaw, protocol, caseSpec));
  await assertStillFrozen(freeze, args.freeze, freezeBytes);
  assert.deepEqual(await engineIdentity(), engine, "Node executable changed during execution");
  const result = { version: "q09-sampler-numeric-tree-v1", sourceFreezeSha256: sha(freezeBytes), protocolSha256: freeze.protocolSha256,
    engine, cases,
    scope: "Conditional on reviewed monotonic numeric predicate; no random tapes or frequency outcomes" };
  await writeExclusive(output, gzipSync(Buffer.from(JSON.stringify(result) + "\n"), { mtime: 0 }));
  console.log(JSON.stringify({ output, cases: cases.length, apiCalls: cases.reduce((sum, value) => sum + Object.values(value.apiCalls).reduce((a, b) => a + b, 0), 0) }));
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch(error => { console.error(error); process.exitCode = 1; });
}
