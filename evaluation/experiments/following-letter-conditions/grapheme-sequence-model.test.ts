import { createSequenceEvidenceSession, verifySequenceEvidence } from "./sequence-evidence.js";
import assert from "node:assert/strict";
import test from "node:test";
import type { Grapheme } from "../../../src/types.js";
import { spellingBoundaryContexts } from "../../../src/core/spelling-context.js";
import { createGenerator, englishConfig } from "../../../src/index.js";
import { createGraphemeSequenceModel, type SequenceSlot } from "./grapheme-sequence-model.js";
import { planConditionedSequence } from "./conditioned-sequence.js";

function slots(): SequenceSlot[] {
  const phones = ["s", "æ"].map(sound => englishConfig.phonemes.find(phone => phone.sound === sound)!);
  assert.ok(phones.every(Boolean));
  return phones.map((phoneme, index) => ({
    grapheme: { phoneme, prevPhoneme: phones[index - 1], nextPhoneme: phones[index + 1], index, total: 2,
      position: index === 0 ? "onset" : "nucleus", syllableIndex: 0, syllableCount: 1,
      onsetLength: 1, nucleusLength: 1, codaLength: 0, isCluster: false },
    doubling: { phoneme, prevPhoneme: phones[index - 1], nextNucleus: phones[index + 1],
      position: index === 0 ? "onset" : "nucleus", prevReduced: false, isCluster: false,
      isFirstInCoda: false, isLastPhoneme: index === 1, isEndOfWord: true,
      isMonosyllabic: true, nextIsConsonant: false },
  }));
}

test("actual resolver alternatives have unit total mass without conditioning", () => {
  const model = createGraphemeSequenceModel(englishConfig, slots(), []);
  const plan = planConditionedSequence(model);
  assert.ok(Math.abs(plan.logMass) < 1e-12);
  for (const first of plan.choices(0, model.initial)) {
    assert.ok(first.choice.inventoryIndex >= 0);
    assert.equal(first.next.currentNucleus, "");
    for (const last of plan.choices(1, first.next)) {
      assert.equal(last.next.currentNucleus, "");
      assert.equal(last.next.previousNucleus, last.choice.selected);
    }
  }
});

test("actual soft-c alternatives are conditioned on written letters", () => {
  const input = slots();
  const baseline = createGraphemeSequenceModel(englishConfig, input, []);
  const baselineFirst = baseline.edges(0, baseline.initial);
  assert.ok(baselineFirst.some(edge => edge.choice.realized === "c"), "fixture must exercise soft c");
  const model = createGraphemeSequenceModel(englishConfig, input, [{ phoneme: "s", form: "c" }, { phoneme: "s", form: "sc" }]);
  const plan = planConditionedSequence(model);
  assert.ok(Number.isFinite(plan.logMass));
  assert.ok(plan.logMass < 0, "conditioning must remove positive incompatible mass");
  for (const first of plan.choices(0, model.initial)) {
    for (const second of plan.choices(1, first.next)) {
      if (["c", "sc"].includes(first.choice.realized)) assert.match(second.choice.realized, /^[eiy]/i);
    }
  }
});


test("a resolver dead end has zero continuation mass without discarding valid siblings", () => {
  const make = (phoneme: string, form: string): Grapheme => ({ phoneme, form, origin: 0,
    frequency: 1, startWord: 1, midWord: 1, endWord: 1, onset: 1, nucleus: 1, coda: 1 });
  const s = make("s", "s");
  const c = make("s", "c");
  const a = { ...make("æ", "a"), condition: { leftGraphemeContext: ["s"] } };
  const config = { ...englishConfig, graphemes: [s, c, a], graphemeMaps: {
    onset: new Map([["s", [s, c]]]), nucleus: new Map([["æ", [a]]]), coda: new Map<string, Grapheme[]>(),
  } };
  const model = createGraphemeSequenceModel(config, slots(), []);
  const plan = planConditionedSequence(model);
  assert.ok(Math.abs(Math.exp(plan.logMass) - 0.5) < 1e-12);
  assert.deepEqual(plan.choices(0, model.initial).map(edge => edge.choice.selected), ["s"]);
  const dead = model.edges(0, model.initial).find(edge => edge.choice.selected === "c")!;
  assert.deepEqual(model.edges(1, dead.next), []);
  assert.throws(() => createGraphemeSequenceModel({ ...config, graphemes: [{ ...s, frequency: -1 }] }, slots(), []), /Invalid grapheme weight/);
});


test("adapter recovers sampled choices across public-generator spelling histories", () => {
  const generator = createGenerator(englishConfig);
  let boundaries = 0;
  let doubled = 0;
  let units = 0;
  for (let seed = 1; seed <= 120; seed++) {
    const word = generator.generateWord({ seed, trace: true });
    const ledger = word.trace!.baseSpelling!;
    assert.ok(ledger.version >= 3);
    const contexts = spellingBoundaryContexts(ledger.phones);
    const model = createGraphemeSequenceModel(englishConfig,
      contexts.map(context => ({ grapheme: context.slot, doubling: context.doubling })), []);
    let state = model.initial;
    for (const [index, unit] of ledger.units.entries()) {
      const matches = model.edges(index, state).filter(edge =>
        edge.choice.selected === unit.selected && edge.choice.realized === unit.afterDoubling);
      assert.ok(matches.length > 0, `seed ${seed}, phone ${index}: sampled choice absent`);
      // Duplicate inventory forms can share output; sampled metadata disambiguates them.
      const sampled = matches.find(edge => "inventoryIndex" in unit && edge.choice.inventoryIndex === unit.inventoryIndex &&
        "doublingIncrement" in unit && edge.choice.doublingIncrement === unit.doublingIncrement);
      assert.ok(sampled, `seed ${seed}, phone ${index}: sampled inventory/transition absent`);
      state = sampled.next;
      units++;
      doubled += sampled.choice.doublingIncrement;
      if (index + 1 < contexts.length && contexts[index + 1].slot.syllableIndex !== contexts[index].slot.syllableIndex) {
        boundaries++;
        assert.equal(state.currentNucleus, "");
      }
    }
    assert.ok(model.accepts(state));
  }
  assert.ok(units > 120);
  assert.ok(boundaries > 0);
  assert.ok(doubled > 0);
});


test("conditioned selection evidence replays and rejects altered identity, mass and population", () => {
  const model = createGraphemeSequenceModel(englishConfig, slots(), [{ phoneme: "s", form: "c" }]);
  const session = createSequenceEvidenceSession(model);
  assert.throws(() => session.finish(), /Incomplete/);
  const records = [session.next(0.2), session.next(0.8)];
  session.finish();
  verifySequenceEvidence(model, JSON.parse(JSON.stringify(records)));
  assert.throws(() => session.next(0.1), /already complete/);
  assert.throws(() => verifySequenceEvidence(model, records.slice(0, 1)), /Incomplete/);
  assert.throws(() => verifySequenceEvidence(model, [...records, records[0]]), /already complete/);
  for (const corrupt of [
    () => { const r = structuredClone(records); r[0].choice.inventoryIndex = -1; return r; },
    () => { const r = structuredClone(records); r[0].logConditionalProbability += 0.1; return r; },
    () => { const r = structuredClone(records); r[0].after = "wrong"; return r; },
    () => { const r = structuredClone(records); r[0].roll = 1; return r; },
  ]) assert.throws(() => verifySequenceEvidence(model, corrupt()));
});


test("opt-in public writer produces replayable legal initial sequences with trace parity", () => {
  const targets = [{ phoneme: "s", form: "c" }, { phoneme: "s", form: "sc" }, { phoneme: "dʒ", form: "g" }];
  const config = { ...englishConfig, followingLetters: { targets } };
  const generator = createGenerator(config);
  for (let seed = 1; seed <= 200; seed++) {
    const word = generator.generateWord({ seed, trace: true });
    const plain = generator.generateWord({ seed });
    assert.deepEqual(word.written, plain.written);
    assert.deepEqual(word.syllables, plain.syllables);
    const contexts = spellingBoundaryContexts(word.trace!.baseSpelling!.phones);
    const model = createGraphemeSequenceModel(config,
      contexts.map(context => ({ grapheme: context.slot, doubling: context.doubling })), targets);
    const records = word.trace!.graphemeSelections.map(selection => {
      assert.ok(selection.conditionedSelection);
      assert.equal(selection.selection, undefined);
      assert.equal(selection.doubling, undefined);
      return selection.conditionedSelection;
    });
    verifySequenceEvidence(model, records);
  }
});
