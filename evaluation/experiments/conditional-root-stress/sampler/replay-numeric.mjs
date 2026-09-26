import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { ROOT, assertStillFrozen, engineIdentity, freshOutput, loadFreeze, parseArgs, sha, writeExclusive } from "./integrity.mjs";
import { drawnSteps, fixedRows, lawInput, sampleRow } from "./numeric-grid.mjs";

export function replayCase(createLaw, protocol, caseSpec, archived) {
  assert.equal(archived.id, caseSpec.id);
  const input = lawInput(protocol, caseSpec);
  assert.deepEqual(archived.input, input);
  const law = createLaw(input);
  const calls = { fixedIncludingReplay: 0, inputMutation: 0, tree: 0 };
  let numericDecisionsChecked = 0;
  function verify(row, observation, group) {
    const actual = sampleRow(law, caseSpec.K, row);
    assert.deepEqual(actual, observation, "Archived public-API sample differs from same-engine replay");
    calls[group]++;
    numericDecisionsChecked += drawnSteps(actual.sample).length;
  }
  const rows = fixedRows(protocol);
  assert.equal(archived.fixed.length, rows.length);
  archived.fixed.forEach((entry, i) => {
    assert.deepEqual(entry.row, rows[i]);
    verify(entry.row, entry.beforeMutation, "fixedIncludingReplay");
    verify(entry.row, entry.replay, "fixedIncludingReplay");
  });
  const mutationRow = Array(15).fill(2 ** 31);
  assert.deepEqual(archived.inputMutation.row, mutationRow);
  verify(mutationRow, archived.inputMutation.before, "inputMutation");
  input.beforePrimary.fill("primary"); input.afterPrimary.fill("secondary"); input.operationalHeavy.fill(false);
  input.secondary.enabled = false; input.rhythmic.probability = 100;
  assert.deepEqual(input, archived.inputMutation.changedInput);
  verify(mutationRow, archived.inputMutation.after, "inputMutation");
  for (const node of archived.tree.nodes) {
    if (node.kind === "leaf") verify([...node.prefix, ...Array(15 - node.prefix.length).fill(0)], { sample: node.sample, consumed: node.consumed }, "tree");
    else {
      assert.equal(node.kind, "branch");
      for (const probe of node.probes) verify([...node.prefix, probe.uint32, ...Array(14 - node.prefix.length).fill(0)],
        { sample: probe.sample, consumed: probe.consumed }, "tree");
    }
  }
  assert.deepEqual(calls, archived.apiCalls);
  return { id: caseSpec.id, calls, numericDecisionsChecked };
}

async function main() {
  const args = parseArgs(process.argv.slice(2), ["freeze", "freeze-sha", "input", "input-sha", "out"]);
  const output = await freshOutput(args.out);
  const { freeze, freezeBytes, protocol } = await loadFreeze(args.freeze, args["freeze-sha"]);
  const bytes = await readFile(args.input);
  assert.equal(sha(bytes), args["input-sha"], "Externally pinned numeric-tree archive");
  const archived = JSON.parse(gunzipSync(bytes));
  assert.equal(archived.version, "q09-sampler-numeric-tree-v1");
  assert.equal(archived.sourceFreezeSha256, sha(freezeBytes));
  assert.equal(archived.protocolSha256, freeze.protocolSha256);
  const engine = await engineIdentity();
  assert.deepEqual(archived.engine, engine, "Different Node engine/binary requires separately identified evidence");
  const { createRootStressLaw } = await import(pathToFileURL(resolve(ROOT, "src/index.ts")).href);
  assert.equal(archived.cases.length, protocol.cases.length);
  const cases = protocol.cases.map((caseSpec, i) => replayCase(createRootStressLaw, protocol, caseSpec, archived.cases[i]));
  await assertStillFrozen(freeze, args.freeze, freezeBytes);
  assert.deepEqual(await readFile(args.input), bytes, "Archive changed during replay");
  assert.deepEqual(await engineIdentity(), engine, "Node executable changed during replay");
  const result = { version: "q09-sampler-node-replay-v1", passed: true, archiveSha256: sha(bytes), sourceFreezeSha256: sha(freezeBytes),
    protocolSha256: freeze.protocolSha256, engine, cases,
    scope: "Exact same-Node public-API and numeric-predicate replay; independent rational proof is separate; no frequency draws" };
  await writeExclusive(output, Buffer.from(JSON.stringify(result, null, 2) + "\n"));
  console.log(JSON.stringify({ output, cases: cases.length }));
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch(error => { console.error(error); process.exitCode = 1; });
}
