import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { observeDoubling } from "./observe-doubling.mjs";

const inventory = JSON.parse(gunzipSync(readFileSync(new URL("./exploration/inventory.json.gz", import.meta.url))));
const { ordinaryRelations } = JSON.parse(readFileSync(new URL("./protocol.json", import.meta.url)));
const witnesses = inventory.firstWitnessPerSuccessfulOrDirectRelation;
const mismatch = witnesses.find(entry => entry.key[0] === "s" && entry.key[1] === "c");

for (const witness of witnesses) {
  test(`observes archived relation ${JSON.stringify(witness.key)}`, () => {
    const observation = observeDoubling(witness.word, ordinaryRelations);
    const event = observation.events[witness.unitId];
    assert.deepEqual(event.relation, witness.key.slice(0, 3));
    assert.equal(event.kind, witness.key[3]);
    assert.equal(observation.counts.units, witness.word.trace.baseSpelling.units.length);
  });
}
test("separates the concrete s→ck mismatch from ordinary-policy exclusions", () => {
  for (const [sound, form] of [["s", "c"], ["z", "s"], ["ʃ", "s"]]) {
    const witness = witnesses.find(entry => entry.key[0] === sound && entry.key[1] === form);
    const { counts } = observeDoubling(witness.word, ordinaryRelations);
    assert.equal(counts.unsupportedOrdinaryExpansions, 1);
    assert.equal(counts.sToCkExpansions, sound === "s" ? 1 : 0);
  }
});
const mutations = {
  "missing trace": word => { delete word.trace; },
  "wrong version": word => { word.trace.baseSpelling.version = 2; },
  "missing unit": word => { word.trace.baseSpelling.units.pop(); },
  "missing phone": word => { word.trace.baseSpelling.phones.pop(); },
  "wrong ownership": word => { word.trace.baseSpelling.units[mismatch.unitId].phoneIds = [0]; },
  "wrong selected spelling": word => { word.trace.baseSpelling.units[mismatch.unitId].selected = "s"; },
  "wrong source sound": word => { word.trace.baseSpelling.phones[mismatch.unitId].soundAtSpelling = "k"; },
  "missing increment": word => { delete word.trace.baseSpelling.units[mismatch.unitId].doublingIncrement; },
  "missing success": word => { delete word.trace.graphemeSelections[mismatch.unitId].doubling.result; },
  "missing attempt": word => { word.trace.graphemeSelections[mismatch.unitId].doubling.attempted = false; },
  "wrong result": word => { word.trace.graphemeSelections[mismatch.unitId].doubling.result = "ss"; },
  "invalid probability": word => { word.trace.graphemeSelections[mismatch.unitId].doubling.probability = 0; },
};
for (const [name, mutate] of Object.entries(mutations)) {
  test(`rejects ${name} rather than assigning a clean count`, () => {
    const word = structuredClone(mismatch.word); mutate(word);
    assert.throws(() => observeDoubling(word, ordinaryRelations));
  });
}
