import assert from "node:assert/strict";
import test from "node:test";
import { createGenerator, englishConfig } from "../../../src/index.ts";
import { observe as oldObserve, emptyObservation } from "../../quality/probes/stress-pattern-observer/observe.ts";
import { domainObservation, validateActive, validateControl } from "./observe.mjs";

function fixture({ active = true, n = 4, seed = 51, secondary = 100, rhythm = 60, neighbors = true, zero = false, prefix, suffix, reduction = false } = {}) {
  const config = structuredClone(englishConfig);
  const stress = config.pronunciation.stress;
  stress.primary = { type: "fixed", fixedPosition: 0 };
  stress.secondary = { ...stress.secondary, probability: secondary, candidateWindow: "all-nonprimary", ...(zero ? { heavyWeight: 0, lightWeight: 0 } : {}) };
  stress.rhythmic = { ...stress.rhythmic, probability: rhythm, requireUnstressedNeighbors: neighbors };
  if (active) stress.rootPattern = { type: "count-conditioned", lambda: Math.log(2) };
  else delete stress.rootPattern;
  config.syllableStructure.letterLengthTargets = undefined;
  config.pronunciation.vowelReduction.enabled = reduction;
  const templates = { bare: 0, prefixed: 0, suffixed: 0, both: 0 };
  templates[prefix ? suffix ? "both" : "prefixed" : suffix ? "suffixed" : "bare"] = 1;
  config.morphology.prefixes = prefix ? [prefix] : []; config.morphology.suffixes = suffix ? [suffix] : [];
  config.morphology.templateWeights = { lexicon: templates, text: templates };
  if (n === 9) config.phonemeToSyllableWeights = Object.fromEntries(["lexicon", "text"].map(mode => [mode,
    Object.fromEntries(Object.keys(config.phonemeToSyllableWeights[mode]).map(key => [key, [[9, 1]]]))]));
  const word = createGenerator(config).generateWord({ seed, ...(n === 9 ? {} : { syllableCount: n }), morphology: true, trace: true });
  return { word, config };
}
const affix = (type, stressEffect, zero = false) => ({ type, stressEffect, written: zero ? "s" : "in", frequency: 1,
  phonemes: zero ? ["s"] : ["ɪ", "n"], syllableCount: zero ? 0 : 1,
  syllables: zero ? [] : [{ onset: [], nucleus: ["ɪ"], coda: ["n"] }] });

test("public active fixtures replay K0, fixed-K disyllables, variable support and proposal endpoints", () => {
  for (const options of [
    { n: 1 }, { n: 2, rhythm: 0 }, { secondary: 0, rhythm: 0 }, { neighbors: false }, { neighbors: true },
    { zero: true }, { zero: true, secondary: 0 }, { rhythm: 100, secondary: 0 }, { n: 9 }, { reduction: true },
  ]) {
    const { word, config } = fixture(options); const saved = structuredClone(word);
    const observed = validateActive(word, config);
    assert.equal(observed.proposalMarks.filter(mark => mark === "secondary").length, observed.secondaryCount);
    assert.equal(observed.appliedMarks.filter(mark => mark === "secondary").length, observed.secondaryCount);
    assert.deepStrictEqual(word, saved);
  }
});
test("public resolved morphology replays zero arrays, changed allomorph counts and overwrites", () => {
  const prefix = affix("prefix", "secondary");
  prefix.allomorphs = [{ phonologicalCondition: { position: "following" }, written: "arin", phonemes: ["ɑ", "r", "ɪ", "n"], syllableCount: 7,
    syllables: [{ onset: [], nucleus: ["ɑ"], coda: [] }, { onset: ["r"], nucleus: ["ɪ"], coda: ["n"] }] }];
  const flattened = affix("suffix", "primary", true); flattened.syllables = [{ onset: [], nucleus: [], coda: ["s"] }];
  for (const options of [{ prefix }, { prefix: affix("prefix", "primary"), suffix: affix("suffix", "attract-preceding") },
    { prefix: affix("prefix", "primary", true) }, { suffix: flattened }, { n: 2, suffix: affix("suffix", "attract-preceding") }]) {
    const { word, config } = fixture(options); validateActive(word, config);
  }
});
test("v1 remains separate and its frozen observer rejects an active word", () => {
  const active = fixture(); const control = fixture({ active: false });
  validateControl(control.word, control.config);
  assert.throws(() => validateControl(active.word, active.config));
  assert.throws(() => validateActive(control.word, control.config));
  assert.throws(() => oldObserve(active.word, "candidate", emptyObservation()));
  const domains = domainObservation(active.word);
  assert.deepStrictEqual(domains["root-after-rhythmic"], { availability: "unavailable" });
  assert.deepStrictEqual(domains["root-after-explicit-secondary"], { availability: "unavailable" });
  assert.equal(domains["root-after-pattern-application"].availability, "observed");
});
test("active observer rejects forged actual domains, origins, weights and proposal labels", () => {
  const { word, config } = fixture({ neighbors: false, n: 6 });
  const forgeries = [
    value => { value.trace.stressWeight = undefined; },
    value => { value.trace.stressPattern.snapshots[2].domain = "root-after-rhythmic"; },
    value => { value.trace.stressPattern.events[0].id = false; },
    value => { value.trace.stressPattern.snapshots[2].eventCount++; },
    value => { value.trace.stressPattern.snapshots[5].syllables[0].origin = { kind: "event", eventId: 99 }; },
    value => { value.trace.stressPattern.weightInput.syllables[0].operational.weight = "forged"; },
    value => { value.trace.stressPattern.rootPattern.proposal.explicitSecondary.applied = true; },
    value => { value.trace.stressPattern.rootPattern.proposal.secondaryCount++; },
    value => { value.trace.stressPattern.rootPattern.proposal.rhythmic.iterations.pop(); },
    value => { value.trace.stressPattern.rootPattern.proposal.assignments[0].proposalEventId = true; },
    value => { value.trace.stressPattern.rootPattern.application.secondaryIndices.reverse(); },
    value => { value.trace.stressPattern.events.push(structuredClone(value.trace.stressPattern.events[0])); },
  ];
  for (const mutate of forgeries) { const forged = structuredClone(word); mutate(forged); assert.throws(() => validateActive(forged, config)); }
});
test("sample transcript transfer rejects missing uniforms, branches, component IDs and coherent policy forgery", () => {
  const { word, config } = fixture({ neighbors: false, n: 6 });
  const sampling = word.trace.stressPattern.rootPattern.sampling;
  assert(sampling.componentDraws.length + sampling.backward.filter(step => step.kind === "drawn").length > 0);
  for (const mutate of [
    value => { value.selectedComponentIndex = true; },
    value => { value.selectedComponentIndex = (value.selectedComponentIndex + 1) % value.components.length; },
    value => {
      const draw = value.componentDraws[0]; assert(draw);
      draw.uniform = draw.takeCandidate ? 1 - Number.EPSILON : 0;
    },
    value => { const draw = value.componentDraws[0]; assert(draw); draw.takeCandidate = !draw.takeCandidate; },
    value => { value.logPartitionAtK += 0.1; },
    value => { value.targetSecondaryCount++; },
    value => { value.backward.pop(); },
    value => { const draw = value.componentDraws[0] ?? value.backward.find(step => step.kind === "drawn"); draw.drawOrdinal = true; },
    value => { const draw = value.componentDraws[0] ?? value.backward.find(step => step.kind === "drawn"); draw.uniform = 1; },
  ]) { const forged = structuredClone(word); mutate(forged.trace.stressPattern.rootPattern.sampling); assert.throws(() => validateActive(forged, config)); }
  const differentConfig = structuredClone(config); differentConfig.pronunciation.stress.secondary.probability = 0;
  assert.throws(() => validateActive(word, differentConfig));
});
test("morphology origins bind to actual resolved arrays rather than plausible declared offsets", () => {
  const { word, config } = fixture({ prefix: affix("prefix", "primary"), suffix: affix("suffix", "attract-preceding") });
  for (const mutate of [
    value => { value.trace.stressPattern.assembly.rootSyllableStart = 0; },
    value => { value.trace.stressPattern.morphology[0].syllableIndices = []; },
    value => { value.trace.stressPattern.events.find(event => event.cause.kind === "morphology").previousOrigin = { kind: "unmarked" }; },
    value => { value.trace.morphology.realization.prefix.resolved.syllables.push({ onset: [], nucleus: ["ɪ"], coda: [] }); },
  ]) { const forged = structuredClone(word); mutate(forged); assert.throws(() => validateActive(forged, config)); }
});
