import { englishSharedSpellings } from "../elements/graphemes/shared.js";
import { createSharedConstructionPlanner } from "./spelling-construction.js";
import { resolveConstructionSpan } from "./spelling-construction-ownership.js";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import type { Word } from "../types.js";
import { createCurrentSpellingObserver, normalizationReplaySummary } from "../../evaluation/quality/probes/unit-normalization/observe-current.js";
import { describe, expect, it } from "vitest";
import { createGenerator, englishConfig } from "../index.js";
import type { LanguageConfig } from "../config/language.js";
import type { Grapheme } from "../types.js";
import { buildGraphemeMaps } from "../elements/graphemes/index.js";
import { BaseSpelling } from "./base-spelling.js";
import { spellingBoundaryContexts } from "./spelling-context.js";
import { createSpellingNormalizer } from "./spelling-normalization.js";
import { createSpellingCoveragePlanner } from "./spelling-coverage.js";
import { verifyBaseSpellingEvidence } from "./spelling-evidence.js";
import type { NormalizationSite } from "./spelling-normalization-types.js";

const glyph = (phoneme: string, form: string, frequency = 1): Grapheme => ({
  phoneme, form, frequency, origin: 0, startWord: 1, midWord: 1, endWord: 1, reading: { kind: "single-phone" },
});
interface Choice { sound: string; form: string; position: "onset" | "nucleus" | "coda"; part?: number; after?: string; increment?: 0 | 1 }
function fixture(choices: Choice[], extra: Grapheme[] = [], overrides: Partial<LanguageConfig> = {}, appendCount = choices.length) {
  const graphemes = [...choices.map(choice => glyph(choice.sound, choice.form)), ...extra];
  const config: LanguageConfig = { ...englishConfig, doubling: undefined, ...overrides, graphemes, ...buildGraphemeMaps(graphemes) };
  const counts = new Map<string, number>();
  const phones = choices.map((choice, id) => {
    const part = choice.part ?? 0; const key = `${part}/${choice.position}`; const index = counts.get(key) ?? 0; counts.set(key, index + 1);
    const phoneme = structuredClone(englishConfig.phonemes.find(phone => phone.sound === choice.sound)!);
    return { id, part: "root" as const, syllableIndex: part, segment: choice.position, segmentIndex: index,
      soundAtSpelling: choice.sound, boundary: { phoneme, stress: "ˈ" } };
  });
  const base = new BaseSpelling(phones, true, true, true);
  const recordCheck = (site: NormalizationSite) => {
    const { cells, units } = base.current();
    const end = units.length - 1;
    const part = phones[end].syllableIndex;
    const own = (id: number) => cells.filter(cell => cell.origin.kind !== "rewrite" && cell.origin.unitId === id);
    const left = site === "adjacent-choice"
      ? (phones[end - 1]?.syllableIndex === part ? own(end - 1) : [])
      : cells.filter(cell => cell.partId === part - 1);
    const right = site === "adjacent-choice" ? own(end) : cells.filter(cell => cell.partId === part);
    base.recordNormalizationCheck(site, left.length > 0 && right.length > 0);
  };
  choices.slice(0, appendCount).forEach((choice, id) => {
    base.appendChoice(id, choice.form, choice.after ?? choice.form, id, choice.increment ?? 0);
    const final = id === appendCount - 1;
    const prior = choices[id - 1];
    const adjacentCollision = prior && (prior.part ?? 0) === (choice.part ?? 0) &&
      !!(prior.after ?? prior.form).length && !!(choice.after ?? choice.form).length &&
      (prior.after ?? prior.form).slice(-1) === (choice.after ?? choice.form)[0];
    if (final && adjacentCollision) return; // The fixture applies this decision explicitly.
    recordCheck("adjacent-choice");
    if (phones[id + 1]?.syllableIndex === phones[id].syllableIndex) return;
    const part = phones[id].syllableIndex;
    const previous = base.current().cells.filter(cell => cell.partId === part - 1);
    const current = base.current().cells.filter(cell => cell.partId === part);
    if (final && previous.length && current.length && previous[previous.length - 1].text === current[0].text) return;
    recordCheck("syllable-join");
  });
  const contexts = spellingBoundaryContexts(phones);
  const normalizer = createSpellingNormalizer(config);
  const states = () => normalizer.historicalStates(base.current().units, contexts);
  const input = (rightIndex: number, site: NormalizationSite = "adjacent-choice") => ({
    ...base.current(), ...base.normalizationState(), contexts, states: states(), rightIndex, site,
  });
  const apply = (rightIndex: number, site: NormalizationSite = "adjacent-choice") => {
    if (site === "syllable-join") base.setPhase("syllable");
    const current = input(rightIndex, site); const decision = normalizer.decide(current);
    if (decision.status === "normalized") normalizer.verify(current, decision.plan);
    recordCheck(site); base.recordNormalization(site, rightIndex, decision);
    const end = base.current().units.length - 1;
    if (site === "adjacent-choice" && phones[end + 1]?.syllableIndex !== phones[end].syllableIndex) recordCheck("syllable-join");
    return decision;
  };
  return { base, config, contexts, normalizer, input, apply, graphemes };
}
const bed = () => fixture([{ sound: "b", form: "b", position: "onset" }, { sound: "ɛ", form: "e", position: "nucleus" },
  { sound: "d", form: "ed", position: "coda" }], [glyph("d", "d")]);

function publicConfig(finals: Grapheme[]): LanguageConfig {
  const phone = (sound: string) => englishConfig.phonemes.find(entry => entry.sound === sound)!;
  const graphemes = [glyph("b", "b"), glyph("ɛ", "e"), ...finals];
  const one: [number, number][] = [[1, 1]];
  return { ...englishConfig, graphemes, ...buildGraphemeMaps(graphemes),
    phonemeMaps: { onset: new Map([["b", [phone("b")]]]), nucleus: new Map([["ɛ", [phone("ɛ")]]]), coda: new Map([["d", [phone("d")]]]) },
    clusterConstraint: undefined, clusterWeights: undefined, clusterLimits: { maxOnset: 1, maxCoda: 1 }, codaConstraints: { allowedFinal: ["d"] },
    syllableStructure: { ...englishConfig.syllableStructure, maxOnsetLength: 1, maxCodaLength: 1, letterLengthTargets: undefined },
    phonemeLengthWeights: { text: [[3, 1]], lexicon: [[3, 1]] },
    generationWeights: { ...englishConfig.generationWeights,
      onsetLength: { monosyllabic: one, followingNucleus: one, default: one, long: one },
      codaLength: { monosyllabic: { 1: one }, monosyllabicDefault: one, polysyllabicNonzero: one, zeroWeightEndOfWord: 0, zeroWeightMidWord: 0 },
      probability: { ...englishConfig.generationWeights.probability, finalS: 0, nasalStopExtension: 0 } },
    doubling: undefined, silentE: undefined, spellingRules: [], gapSpellings: [],
    pronunciation: { ...englishConfig.pronunciation,
      aspiration: { enabled: false, targets: [{ segment: "onset" }], rules: [{ id: "disabled", when: {}, probability: 0 }], fallbackProbability: 0 },
      vowelReduction: { enabled: false, rules: [], reduceSecondaryStress: false } },
    writtenFormConstraints: { policy: "preserve-phones" },
  };
}

function registeredPublicConfig(onset: string, nucleus: string, coda: string, finalS = 0): LanguageConfig {
  const phone = (sound: string) => englishConfig.phonemes.find(entry => entry.sound === sound)!;
  const form = (sound: string) => sound === "θ" || sound === "ð" ? "th" : sound === "æ" ? "a" : sound;
  const graphemes = [glyph(onset, form(onset)), glyph(nucleus, form(nucleus)), glyph(coda, form(coda))];
  const base = publicConfig([]);
  return { ...base, graphemes, ...buildGraphemeMaps(graphemes),
    phonemeMaps: { onset: new Map([[onset, [phone(onset)]]]), nucleus: new Map([[nucleus, [phone(nucleus)]]]), coda: new Map([[coda, [phone(coda)]]]) },
    phonemeLengthWeights: { text: [[finalS ? 3 : 6, 1]], lexicon: [[finalS ? 3 : 6, 1]] },
    clusterLimits: { maxOnset: 1, maxCoda: finalS ? 2 : 1 },
    codaConstraints: { allowedFinal: [coda] },
    sonorityConstraints: undefined,
    generationWeights: { ...base.generationWeights,
      boundaryPolicy: { equalSonorityDrop: 0, risingCodaDrop: 0 },
      probability: { ...base.generationWeights.probability, finalS,
        hasOnsetStartOfWord: 100, hasOnsetAfterCoda: 100, hasCodaMonosyllabic: 100, hasCodaEndOfWord: 100, hasCodaMidWord: 100 } },
  };
}

describe("local whole-unit normalization", () => {
  it.each([13, 137, 4099].flatMap(seed => ["θ", "ð"].map(sound => ({ seed, sound }))))("preserves the registered public t|th syllable join for $sound at seed $seed", ({ seed, sound }) => {
    const config = registeredPublicConfig(sound, "æ", "t");
    const api = createGenerator(config);
    const result = api.generateWord({ seed, syllableCount: 2, morphology: false, trace: true });
    const trace = result.trace!.baseSpelling!;
    expect(result.syllables.map(syllable => syllable.coda.map(phone => phone.sound))).toEqual([["t"], ["t"]]);
    expect(result.written).toEqual({ clean: "thatthat", hyphenated: "that&shy;that" });
    expect(trace.normalization!.episodes).toMatchObject([{ site: "syllable-join", outcome: { status: "retained", reason: "no-legal-remainder" } }]);
    expect(trace.units.map(unit => unit.phoneIds)).toEqual([[0], [1], [2], [3], [4], [5]]);
    expect(verifyBaseSpellingEvidence(trace, config)).toMatchObject({ verifiedNormalizations: 0, verifiedEpisodes: 1 });
    expect(api.generateWord({ seed, syllableCount: 2, morphology: false })).toEqual({ ...result, trace: undefined });
  });

  it.each([13, 137, 4099])("preserves separate final /s/ phone IDs through the public API at seed %i", seed => {
    const config = registeredPublicConfig("b", "æ", "s", 100);
    const result = createGenerator(config).generateWord({ seed, syllableCount: 1, morphology: false, trace: true });
    const trace = result.trace!.baseSpelling!;
    expect(result.syllables[0].coda.map(phone => phone.sound)).toEqual(["s", "s"]);
    expect(result.written).toEqual({ clean: "bass", hyphenated: "bass" });
    expect(result.trace!.structural).toContainEqual(expect.objectContaining({ event: "finalS", probability: 100 }));
    expect(trace.units.map(unit => unit.phoneIds)).toEqual([[0], [1], [2], [3]]);
    expect(trace.normalization!.episodes).toMatchObject([{ site: "adjacent-choice", outcome: { status: "retained", reason: "would-erase-phone" } }]);
    expect(verifyBaseSpellingEvidence(trace, config)).toMatchObject({ verifiedNormalizations: 0, verifiedEpisodes: 1 });
  });

  it("licenses ed-to-d from actual pre-unit support without requiring ed itself to be a new reading certificate", () => {
    const f = bed(); f.graphemes[2].reading = { kind: "unsupported-construction", reason: "lexical" };
    expect(f.apply(2).status).toBe("normalized");
    const trace = f.base.snapshot();
    expect(trace.surface).toBe("bed");
    expect(trace.normalizationCertificates?.[0]).toMatchObject({ before: "ed", after: "d", phoneIds: [2],
      preUnitState: { previousForm: "e", doublingCount: 0 }, support: { selected: "d", effectiveWeight: 1, poolTotal: 2, graphemeProbability: 0.5 } });
    expect(verifyBaseSpellingEvidence(trace, f.config)).toMatchObject({ version: 3, verifiedNormalizations: 1, verifiedEpisodes: 1 });
  });

  it.each([["k", "lk", "k"], ["m", "lm", "m"]])("licenses complete %s remainder %s-to-%s", (sound, form, remainder) => {
    const f = fixture([{ sound: "l", form: "l", position: "onset" }, { sound, form, position: "onset" }], [glyph(sound, remainder)]);
    expect(f.apply(1).status).toBe("normalized");
    expect(f.base.snapshot().surface).toBe("l" + remainder);
    expect(verifyBaseSpellingEvidence(f.base.snapshot(), f.config)).toMatchObject({ verifiedNormalizations: 1 });
    expect(resolveConstructionSpan(f.base.constructionState(), [0, 1])).toMatchObject({ status: "complete", before: "l" + remainder,
      phoneIds: [0, 1], phonemes: [{ sound: "l" }, { sound }] });
    const forged = structuredClone(f.base.constructionState());
    forged.normalizationCertificates[0].editId += 1;
    expect(resolveConstructionSpan(forged, [0, 1])).toEqual({ status: "refused", reason: "missing-license" });
  });

  it.each([true, false])("checks the conditioned lk-to-k remainder with eligibility=%s", eligible => {
    const target = { ...glyph("k", "k"), condition: { leftContext: [eligible ? "l" : "b"] } };
    const f = fixture([{ sound: "l", form: "l", position: "onset" }, { sound: "k", form: "lk", position: "onset" }], [target]);
    expect(f.apply(1).status).toBe(eligible ? "normalized" : "retained");
    expect(f.base.snapshot().surface).toBe(eligible ? "lk" : "llk");
    expect(verifyBaseSpellingEvidence(f.base.snapshot(), f.config)).toMatchObject({ verifiedNormalizations: eligible ? 1 : 0 });
  });

  it("does not borrow a fallback-only remainder from outside the active ordinary pool", () => {
    const f = fixture([{ sound: "ɛ", form: "e", position: "nucleus" }, { sound: "d", form: "ed", position: "coda" }],
      [{ ...glyph("d", "d"), fallbackOnly: true }]);
    expect(f.apply(1)).toEqual({ status: "retained", reason: "no-legal-remainder" });
    expect(verifyBaseSpellingEvidence(f.base.snapshot(), f.config)).toMatchObject({ verifiedNormalizations: 0 });
  });

  it.each(["missing", "open-vowel"])("refuses a supported remainder with %s reading evidence", kind => {
    const target = glyph("d", "d");
    if (kind === "missing") delete target.reading;
    else target.reading = { kind: "open-vowel-or-split-marker" };
    const f = fixture([{ sound: "ɛ", form: "e", position: "nucleus" }, { sound: "d", form: "ed", position: "coda" }], [target]);
    expect(f.apply(1)).toEqual({ status: "retained", reason: kind === "missing" ? "unknown-reading" : "construction-obligation" });
    expect(f.base.snapshot().surface).toBe("eed");
    expect(verifyBaseSpellingEvidence(f.base.snapshot(), f.config)).toMatchObject({ verifiedNormalizations: 0 });
  });

  it.each(["θ", "ð"])("retains t|th for /t,%s/ with both phones intact", sound => {
    const f = fixture([{ sound: "t", form: "t", position: "coda", part: 0 }, { sound, form: "th", position: "onset", part: 1 }]);
    expect(f.apply(1, "syllable-join")).toEqual({ status: "retained", reason: "no-legal-remainder" });
    expect(f.base.snapshot().surface).toBe("tth");
    expect(f.base.snapshot().units.map(unit => unit.phoneIds)).toEqual([[0], [1]]);
    expect(verifyBaseSpellingEvidence(f.base.snapshot(), f.config)).toMatchObject({ verifiedNormalizations: 0, verifiedEpisodes: 1 });
  });

  it.each([
    ["k", "c", "tʃ", "ch", "no-legal-remainder"],
    ["s", "s", "ʃ", "sh", "no-legal-remainder"],
    ["tʃ", "ch", "h", "h", "would-erase-phone"],
    ["f", "ph", "h", "h", "would-erase-phone"],
    ["k", "c", "s", "c", "would-erase-phone"],
    ["s", "c", "k", "c", "would-erase-phone"],
    ["j", "y", "i:", "y", "would-erase-phone"],
    ["ɚ", "ur", "r", "r", "would-erase-phone"],
    ["s", "s", "s", "s", "would-erase-phone"],
    ["ʌ", "o", "ʌ", "o", "would-erase-phone"],
  ])("retains /%s/ %s followed by /%s/ %s with reason %s", (left, leftForm, right, rightForm, reason) => {
    const f = fixture([{ sound: left, form: leftForm, position: left === "ʌ" || left === "ɚ" ? "nucleus" : "onset" },
      { sound: right, form: rightForm, position: right === "ʌ" || right === "i:" ? "nucleus" : "onset" }]);
    const before = structuredClone(f.base.current());
    expect(f.apply(leftForm.length)).toEqual({ status: "retained", reason });
    const trace = f.base.snapshot();
    expect(trace.surface).toBe(leftForm + rightForm);
    expect(trace.cells).toStrictEqual(before.cells);
    expect(trace.units.map(unit => unit.phoneIds)).toEqual([[0], [1]]);
    expect(verifyBaseSpellingEvidence(trace, f.config)).toMatchObject({ verifiedNormalizations: 0, verifiedEpisodes: 1 });
  });

  it.each([["f", "ff"], ["s", "ss"], ["i:", "ee"], ["k", "ck"]])("preserves the complete single-phone /%s/ form %s without an internal deduplication episode", (sound, form) => {
    const f = fixture([{ sound, form, position: "coda" }]);
    const trace = f.base.snapshot();
    expect(trace.surface).toBe(form);
    expect(trace.units.map(unit => unit.phoneIds)).toEqual([[0]]);
    expect(trace.normalization?.episodes).toEqual([]);
    expect(verifyBaseSpellingEvidence(trace, f.config)).toMatchObject({ verifiedNormalizations: 0, verifiedEpisodes: 0 });
  });

  it("rechecks hard-c when the first following letter changes from c to e", () => {
    const f = fixture([{ sound: "k", form: "c", position: "onset" }, { sound: "ə", form: "ce", position: "nucleus" }], [glyph("ə", "e")]);
    f.graphemes[0].reading = { kind: "following-letter", forbid: ["e", "i", "y"] };
    expect(f.apply(1)).toEqual({ status: "retained", reason: "construction-obligation" });
    expect(f.base.snapshot().surface).toBe("cce");
  });

  it("can license a standalone target before future units without borrowing their letters", () => {
    const f = fixture([{ sound: "b", form: "b", position: "onset" }, { sound: "ɛ", form: "e", position: "nucleus" },
      { sound: "d", form: "ed", position: "coda" }, { sound: "t", form: "t", position: "coda" }], [glyph("d", "d")], {}, 3);
    f.graphemes[0].reading = { kind: "following-letter", require: ["e"] };
    const decision = f.apply(2); expect(decision.status).toBe("normalized");
    // The target's standalone reading needs no future character; unavailable context stays explicit.
    const cert = f.base.snapshot().normalizationCertificates![0];
    expect(cert.cursor.lastAppendedUnitId).toBe(2);
    expect(cert.checkedNeighbors.find(neighbor => neighbor.unitId === 1)?.nextLetter).toEqual({ known: true, value: "d" });
  });

  it("refuses when a same-part neighbor needs a following letter that has not been written", () => {
    const f = fixture([{ sound: "l", form: "l", position: "coda" },
      { sound: "k", form: "lk", position: "onset", part: 1 }, { sound: "s", form: "c", position: "coda", part: 1 },
      { sound: "ɛ", form: "e", position: "nucleus", part: 2 }], [glyph("k", "k")], {}, 3);
    f.graphemes[2].reading = { kind: "following-letter", require: ["e", "i", "y"] };
    expect(f.apply(1, "syllable-join")).toEqual({ status: "retained", reason: "context-unavailable" });
  });

  it("keeps a rewritten right unit unresolved even when it spells the same suffix", () => {
    const f = fixture([{ sound: "ɛ", form: "e", position: "nucleus" }, { sound: "d", form: "ed", position: "onset", part: 1 }], [glyph("d", "d")]);
    f.base.setPhase("syllable"); f.base.edit(1, 2, "edd", "opaque");
    expect(f.apply(1, "syllable-join")).toEqual({ status: "retained", reason: "unresolved-ownership" });
    expect(verifyBaseSpellingEvidence(f.base.snapshot(), f.config)).toMatchObject({ verifiedNormalizations: 0 });
  });

  it.each([0, Number.NaN, Number.POSITIVE_INFINITY])("rejects forged probability %s before advancing IDs", probability => {
    const f = bed(); const decision = f.normalizer.decide(f.input(2)); expect(decision.status).toBe("normalized");
    if (decision.status !== "normalized") throw new Error("Fixture did not normalize");
    const before = f.base.snapshot(); const cursor = f.base.normalizationState().cursor;
    const plan = structuredClone(decision.plan); plan.support.graphemeProbability = probability;
    expect(() => f.base.commitNormalization(plan)).toThrow();
    expect(f.base.snapshot()).toEqual(before); expect(f.base.normalizationState().cursor).toEqual(cursor);
  });

  it("rejects finite weights whose total overflows instead of certifying zero support", () => {
    const f = bed(); const input = f.input(2);
    f.graphemes[2].frequency = Number.MAX_VALUE; f.graphemes[3].frequency = Number.MAX_VALUE;
    expect(f.normalizer.decide(input)).toEqual({ status: "retained", reason: "no-legal-remainder" });
  });

  it("rejects an underflowed alternative probability", () => {
    const f = bed(); const input = f.input(2);
    f.graphemes[2].frequency = Number.MAX_VALUE; f.graphemes[3].frequency = Number.MIN_VALUE;
    expect(f.normalizer.decide(input)).toEqual({ status: "retained", reason: "no-legal-remainder" });
  });

  it("retains normalization history for cap refusal after every normalized cell is rewritten", () => {
    const f = bed(); f.config.writtenFormConstraints = { policy: "preserve-phones", maxConsonantLetters: 1 };
    f.apply(2); f.base.edit(2, 1, "ddd", "opaque-after-normalization");
    expect(f.base.current().cells.some(cell => cell.origin.kind === "normalized")).toBe(false);
    const choices = f.contexts.map((context, id) => ({ ...context, grapheme: f.graphemes[id], form: f.base.current().units[id].afterDoubling }));
    const outcome = createSpellingCoveragePlanner(f.config).apply(f.base, choices, "base-after-word-rules", false);
    expect(outcome).toMatchObject({ status: "infeasible", reason: "normalization-context-unavailable", visitedAssignments: 0 });
  });

  it.each([13, 137, 4099])("public API emits a replayable positive certificate with identical trace-on/off output for registered seed %i", seed => {
    const config = publicConfig([glyph("d", "ed", 1000), glyph("d", "d")]);
    config.graphemes[2].reading = { kind: "unsupported-construction", reason: "lexical" };
    const api = createGenerator(config);
    const traced = api.generateWord({ seed, syllableCount: 1, morphology: false, trace: true });
    const plain = api.generateWord({ seed, syllableCount: 1, morphology: false });
    expect(traced.written.clean).toBe("bed");
    expect(plain).toEqual({ ...traced, trace: undefined });
    expect(verifyBaseSpellingEvidence(traced.trace!.baseSpelling!, config)).toMatchObject({ verifiedNormalizations: 1 });
    expect(traced.trace!.baseSpelling!.normalizationCertificates?.[0].before).toBe("ed");
  });
  it.each([0, 100, Number.NaN])("respects configured doubling support at probability %s", probability => {
    const f = fixture([{ sound: "b", form: "b", position: "onset" }, { sound: "ɛ", form: "e", position: "nucleus" },
      { sound: "d", form: "ed", position: "coda" }], [glyph("d", "d")], {
      doubling: { ...englishConfig.doubling!, enabled: true, probability, maxPerWord: 1,
        neverDouble: [], neverDoubleFinal: [], finalDoublingOnly: [], realizations: undefined, doubledForms: { d: "dd" } },
    });
    expect(f.apply(2).status).toBe(probability === 0 ? "normalized" : "retained");
  });

  it.each([0, 1] as const)("reconstructs equal-text probabilistic quota increment %s before later selection", increment => {
    const f = fixture([{ sound: "b", form: "b", position: "onset" }, { sound: "ɛ", form: "e", position: "nucleus" },
      { sound: "d", form: "d", position: "coda", increment }, { sound: "ɛ", form: "e", position: "nucleus", part: 1 },
      { sound: "d", form: "ed", position: "coda", part: 1 }], [glyph("d", "d")], {
      doubling: { ...englishConfig.doubling!, enabled: true, probability: 50, maxPerWord: 1,
        neverDouble: [], neverDoubleFinal: [], finalDoublingOnly: [], realizations: undefined, doubledForms: { d: "d" } },
    });
    const input = f.input(4);
    expect(input.states[4].doublingCount).toBe(increment);
    const decision = f.apply(4);
    expect(decision.status).toBe(increment ? "retained" : "normalized");
    if (increment) expect(decision).toMatchObject({ reason: "no-legal-remainder" });
    else expect(f.base.snapshot().normalizationCertificates![0].preUnitState.doublingCount).toBe(0);
    expect(verifyBaseSpellingEvidence(f.base.snapshot(), f.config)).toMatchObject({ version: 3 });
  });

  it("requires the actual increment for a forced equal-text doubling outcome", () => {
    const f = fixture([{ sound: "b", form: "b", position: "onset" }, { sound: "ɛ", form: "e", position: "nucleus" },
      { sound: "d", form: "d", position: "coda", increment: 1 }], [], {
      doubling: { ...englishConfig.doubling!, enabled: true, probability: 100, maxPerWord: 1,
        neverDouble: [], neverDoubleFinal: [], finalDoublingOnly: [], realizations: undefined, doubledForms: { d: "d" } },
    });
    expect(verifyBaseSpellingEvidence(f.base.snapshot(), f.config)).toMatchObject({ version: 3 });
    const forged = f.base.snapshot(); forged.units[2].doublingIncrement = 0;
    expect(() => verifyBaseSpellingEvidence(forged, f.config)).toThrow(/original selection support/);
    delete forged.units[2].doublingIncrement;
    expect(() => verifyBaseSpellingEvidence(forged, f.config)).toThrow();
  });

  it("captures equal-text sampler increments identically with and without tracing", () => {
    const config = publicConfig([glyph("d", "d")]);
    config.doubling = { ...englishConfig.doubling!, enabled: true, probability: 50, maxPerWord: 1,
      neverDouble: [], neverDoubleFinal: [], finalDoublingOnly: [], realizations: undefined, doubledForms: { d: "d" } };
    const api = createGenerator(config); const increments = new Set<number>();
    for (let seed = 1; seed <= 20; seed++) {
      const traced = api.generateWord({ seed, syllableCount: 1, morphology: false, trace: true });
      const plain = api.generateWord({ seed, syllableCount: 1, morphology: false });
      expect(plain).toEqual({ ...traced, trace: undefined });
      increments.add(traced.trace!.baseSpelling!.units[2].doublingIncrement!);
      verifyBaseSpellingEvidence(traced.trace!.baseSpelling!, config);
    }
    expect(increments).toEqual(new Set([0, 1]));
  });

  it("retains a marker-bearing predecessor's unresolved construction obligation", () => {
    const f = fixture([{ sound: "v", form: "ve", position: "coda" }, { sound: "d", form: "ed", position: "onset", part: 1 }], [glyph("d", "d")]);
    f.graphemes[0].reading = structuredClone(englishConfig.graphemes.find(grapheme => grapheme.phoneme === "v" && grapheme.form === "ve")!.reading);
    expect(f.apply(2, "syllable-join")).toEqual({ status: "retained", reason: "construction-obligation" });
    expect(f.base.snapshot().surface).toBe("veed");
    expect(verifyBaseSpellingEvidence(f.base.snapshot(), f.config)).toMatchObject({ verifiedNormalizations: 0 });
  });

  it("refuses a collision whose left cell has unresolved rewrite ownership", () => {
    const f = bed();
    const input = f.input(2);
    const cells = structuredClone(input.cells);
    cells[1].origin = { kind: "rewrite", editId: 0, sourceUnitIds: [1], ownership: "unresolved" };
    expect(f.normalizer.decide({ ...input, cells })).toEqual({ status: "retained", reason: "unresolved-ownership" });
    expect(f.base.snapshot().surface).toBe("beed");
  });

  it("certifies the existing soft-quota relaxation when every legal spelling exceeds the preference", () => {
    const f = fixture([{ sound: "ɛ", form: "e", position: "nucleus" }, { sound: "d", form: "ed", position: "coda", increment: 1 }], [glyph("d", "d")], {
      doubling: { ...englishConfig.doubling!, enabled: true, probability: 100, maxPerWord: 0,
        realizations: undefined, doubledForms: { q: "ed", x: "d" }, neverDouble: [], neverDoubleFinal: [], finalDoublingOnly: [] },
    });
    expect(f.apply(1).status).toBe("normalized");
    const trace = f.base.snapshot();
    expect(trace.normalizationCertificates![0].support).toMatchObject({ selected: "d", afterDoubling: "d", quotaRelaxed: true, doublingProbability: 1 });
    expect(trace.units[1].doublingIncrement).toBe(1);
    expect(verifyBaseSpellingEvidence(trace, f.config)).toMatchObject({ verifiedNormalizations: 1 });
  });

  it("rejects a changed writer-boundary vowel feature that changes target doubling support", () => {
    const f = fixture([{ sound: "b", form: "b", position: "onset" }, { sound: "ɛ", form: "e", position: "nucleus" },
      { sound: "d", form: "ed", position: "coda" }], [glyph("d", "d")], {
      doubling: { ...englishConfig.doubling!, enabled: true, probability: 50, maxPerWord: 1,
        trigger: "lax-vowel", realizations: undefined, doubledForms: { d: "dd" }, neverDouble: [], neverDoubleFinal: [], finalDoublingOnly: [] },
    });
    expect(f.apply(2).status).toBe("normalized");
    const trace = f.base.snapshot();
    expect(trace.normalizationCertificates![0].support.doublingProbability).toBe(0.5);
    expect(verifyBaseSpellingEvidence(trace, f.config)).toMatchObject({ verifiedNormalizations: 1 });
    trace.phones[1].boundary!.phoneme.tense = true;
    expect(() => verifyBaseSpellingEvidence(trace, f.config)).toThrow();
  });

  it("preserves case-sensitive noncollisions through the public writer", () => {
    const config = publicConfig([glyph("d", "Ed")]);
    const result = createGenerator(config).generateWord({ seed: 13, syllableCount: 1, morphology: false, trace: true });
    expect(result.written.clean).toBe("beEd");
    expect(result.trace!.baseSpelling!.normalization!.episodes).toEqual([]);
    expect(verifyBaseSpellingEvidence(result.trace!.baseSpelling!, config)).toMatchObject({ verifiedNormalizations: 0 });
  });

  it("uses UTF-16 cell offsets after a supplementary character", () => {
    const f = fixture([{ sound: "b", form: "😀", position: "onset" }, { sound: "ɛ", form: "e", position: "nucleus" },
      { sound: "d", form: "ed", position: "coda" }], [glyph("d", "d")]);
    expect(f.apply(3).status).toBe("normalized");
    const trace = f.base.snapshot();
    expect(trace.surface).toBe("😀ed");
    expect(trace.normalizationCertificates![0]).toMatchObject({ predecessorCellId: 2, inputCellIds: [3, 4], unitId: 2 });
    expect(trace.units[0].sourceCellIds).toHaveLength(2);
    expect(verifyBaseSpellingEvidence(trace, f.config)).toMatchObject({ verifiedNormalizations: 1 });
  });

  it("preserves historical choices and separate phones across two consecutive normalizations", () => {
    const f = fixture([{ sound: "ɛ", form: "e", position: "nucleus" }, { sound: "d", form: "ed", position: "coda" },
      { sound: "d", form: "dd", position: "coda" }], [glyph("d", "d")], {}, 2);
    expect(f.apply(1).status).toBe("normalized");
    f.base.appendChoice(2, "dd", "dd", 2, 0);
    expect(f.apply(2).status).toBe("normalized");
    const trace = f.base.snapshot();
    expect(trace.surface).toBe("edd");
    expect(trace.units.map(unit => unit.phoneIds)).toEqual([[0], [1], [2]]);
    expect(trace.normalizationCertificates!.map(certificate => certificate.preUnitState.previousForm)).toEqual(["e", "ed"]);
    expect(trace.normalizationCertificates![1].checkedNeighbors.find(neighbor => neighbor.unitId === 1)?.source)
      .toEqual({ kind: "normalization", certificateId: 0 });
    expect(verifyBaseSpellingEvidence(trace, f.config)).toMatchObject({ verifiedNormalizations: 2, verifiedEpisodes: 2 });
  });

  it("rejects a sole zero-weight public choice instead of issuing unsupported normalization evidence", () => {
    const config = publicConfig([glyph("d", "ed", 0)]);
    expect(() => createGenerator(config).generateWord({ seed: 13, syllableCount: 1, morphology: false, trace: true }))
      .toThrow(/No legal grapheme/);
  });

  it("rejects replay when a caller changes the supporting custom condition", () => {
    const target = { ...glyph("d", "d"), condition: { leftContext: ["ɛ"] } };
    const f = fixture([{ sound: "ɛ", form: "e", position: "nucleus" }, { sound: "d", form: "ed", position: "coda" }], [target]);
    expect(f.apply(1).status).toBe("normalized");
    const trace = f.base.snapshot();
    expect(verifyBaseSpellingEvidence(trace, f.config)).toMatchObject({ verifiedNormalizations: 1 });
    target.condition.leftContext[0] = "b";
    expect(() => verifyBaseSpellingEvidence(trace, f.config)).toThrow();
  });

  it("detaches all nested certificate and boundary snapshot data", () => {
    const f = bed(); f.apply(2); const before = f.base.snapshot(); const changed = f.base.snapshot();
    changed.normalizationCertificates![0].preUnitState.doublingCount = 99;
    changed.normalizationCertificates![0].checkedNeighbors[0].inputCellIds[0] = 999;
    changed.phones[0].boundary!.phoneme.sound = "forged";
    changed.cells[0].text = "x";
    expect(f.base.snapshot()).toEqual(before);
  });

  it.each([
    ["cursor", (t: ReturnType<BaseSpelling["snapshot"]>) => { t.normalizationCertificates![0].cursor.lastAppendedUnitId--; }],
    ["pre-unit quota", (t: ReturnType<BaseSpelling["snapshot"]>) => { t.normalizationCertificates![0].preUnitState.doublingCount++; }],
    ["input cell", (t: ReturnType<BaseSpelling["snapshot"]>) => { t.normalizationCertificates![0].inputCellIds[0]++; }],
    ["phone identity", (t: ReturnType<BaseSpelling["snapshot"]>) => { t.normalizationCertificates![0].phoneIds[0] = 1; }],
    ["part", (t: ReturnType<BaseSpelling["snapshot"]>) => { t.normalizationCertificates![0].partId++; }],
    ["support", (t: ReturnType<BaseSpelling["snapshot"]>) => { t.normalizationCertificates![0].support.effectiveWeight++; }],
    ["neighbor", (t: ReturnType<BaseSpelling["snapshot"]>) => { t.normalizationCertificates![0].checkedNeighbors[0].nextLetter = { known: true, value: "x" }; }],
    ["license reading", (t: ReturnType<BaseSpelling["snapshot"]>) => { Object.assign(t.normalizationCertificates![0].targetReading, { kind: "unsupported-construction", reason: "forged" }); }],
    ["certificate version", (t: ReturnType<BaseSpelling["snapshot"]>) => { Object.assign(t.normalizationCertificates![0], { version: 99 }); }],
    ["origin", (t: ReturnType<BaseSpelling["snapshot"]>) => { const origin = t.edits[0].output[0].origin; if (origin.kind === "normalized") origin.offset++; }],
  ])("rejects a forged %s claim", (_name, alter) => {
    const f = bed(); f.apply(2); const trace = f.base.snapshot(); alter(trace);
    expect(() => verifyBaseSpellingEvidence(trace, f.config)).toThrow();
  });

  it("keeps all 64 frozen v2 witnesses readable and unchanged", () => {
    const records = JSON.parse(gunzipSync(readFileSync(new URL("../../evaluation/quality/probes/unit-normalization/fixtures/control-witnesses.json.gz", import.meta.url))).toString()) as { records: Record<string, { word: Word }> };
    expect(Object.keys(records.records)).toHaveLength(64);
    const observe = createCurrentSpellingObserver(englishConfig);
    for (const draw of Object.values(records.records)) {
      const before = JSON.stringify(draw);
      expect(verifyBaseSpellingEvidence(draw.word.trace!.baseSpelling!, englishConfig)).toEqual({
        version: 2, verifiedCertificates: draw.word.trace!.baseSpelling!.certificates!.length,
      });
      expect(normalizationReplaySummary(observe(draw))).toEqual({ status: "unavailable", fraction: null, emitted: null, verified: null });
      expect(JSON.stringify(draw)).toBe(before);
    }
  });

  it("retains the exact t|th mechanism in each of the 31 archived partial-th anchors", () => {
    const records = JSON.parse(gunzipSync(readFileSync(new URL("../../evaluation/quality/probes/unit-normalization/fixtures/control-witnesses.json.gz", import.meta.url))).toString()) as { records: Record<string, { word: Word }> };
    let anchors = 0;
    for (const [coordinate, draw] of Object.entries(records.records)) {
      const base = draw.word.trace!.baseSpelling!;
      const present = new Set(base.cells.map(cell => cell.id));
      for (const unit of base.units) {
        if (unit.selected !== "th" || unit.sourceCellIds.filter(id => present.has(id)).length !== 1) continue;
        const missing = unit.sourceCellIds.find(id => !present.has(id));
        const cut = base.edits.find(edit => edit.input.some(cell => cell.id === missing));
        expect(cut?.rule, coordinate).toBe("deduplicateSyllableJoin");
        expect(base.phones[unit.id - 1].soundAtSpelling, coordinate).toBe("t");
        expect(base.units[unit.id - 1].afterDoubling, coordinate).toBe("t");
        const sound = base.phones[unit.id].soundAtSpelling;
        const f = fixture([{ sound: "t", form: "t", position: "coda" }, { sound, form: "th", position: "onset", part: 1 }]);
        expect(f.apply(1, "syllable-join"), coordinate).toEqual({ status: "retained", reason: "no-legal-remainder" });
        expect(f.base.snapshot().surface, coordinate).toBe("tth");
        anchors++;
      }
    }
    expect(anchors).toBe(31);
  });

  it("distinguishes zero/not-applicable replay from a positive authenticated outcome", () => {
    const retainedConfig = publicConfig([glyph("d", "d")]);
    const noCertificate = createGenerator(retainedConfig).generateWord({ seed: 13, syllableCount: 1, morphology: false, trace: true });
    const none = createCurrentSpellingObserver(retainedConfig)({ word: noCertificate });
    expect(normalizationReplaySummary(none)).toEqual({ status: "not-applicable", fraction: null, emitted: 0, verified: 0 });
    const config = publicConfig([glyph("d", "ed", 1000), glyph("d", "d")]);
    const word = createGenerator(config).generateWord({ seed: 13, syllableCount: 1, morphology: false, trace: true });
    const counts = createCurrentSpellingObserver(config)({ word });
    expect(normalizationReplaySummary(counts)).toEqual({ status: "available", fraction: 1, emitted: 1, verified: 1 });
    expect(counts).toMatchObject({ actualSiteComparisons: 2, actualCollisions: 1, normalizationEpisodes: 1,
      wordsWithNormalizedOutcome: 1, wordsWithRetainedOutcome: 0, normalizationPhoneMultiplicityViolations: 0,
      uncertifiedDedupDeletions: 0, dedupAttributedNoLineageUnits: 0, dedupAttributedPartialSourceUnits: 0 });
  });

  it("does not accept normalized origins disguised as a historical version", () => {
    const f = bed(); f.apply(2);
    const forged = f.base.snapshot();
    Object.assign(forged, { version: 2, capabilities: { exactParts: 1, licensedOrigins: 1, writerBoundary: 1 } });
    expect(() => verifyBaseSpellingEvidence(forged, f.config)).toThrow();
    Object.assign(forged, { version: 99 });
    expect(() => verifyBaseSpellingEvidence(forged, f.config)).toThrow(/unsupported ledger version/);
  });

  it("does not add v3 doubling or observation fields to direct v2 ledgers", () => {
    const f = bed(); const legacy = new BaseSpelling(f.base.current().phones.slice(), true, true);
    f.base.current().units.forEach(unit => legacy.appendChoice(unit.id, unit.selected, unit.afterDoubling, unit.inventoryIndex));
    const trace = legacy.snapshot();
    expect(trace.version).toBe(2);
    expect(trace.normalization).toBeUndefined(); expect(trace.normalizationCertificates).toBeUndefined();
    expect(trace.units.every(unit => !("doublingIncrement" in unit))).toBe(true);
    expect(verifyBaseSpellingEvidence(trace, f.config)).toEqual({ version: 2, verifiedCertificates: 0 });
  });

  it("replays a local certificate before later units exist and rejects a future cursor", () => {
    const f = fixture([{ sound: "b", form: "b", position: "onset" }, { sound: "ɛ", form: "e", position: "nucleus" },
      { sound: "d", form: "ed", position: "coda" }, { sound: "ɛ", form: "e", position: "nucleus", part: 1 }], [glyph("d", "d")], {}, 3);
    expect(f.apply(2).status).toBe("normalized");
    f.base.appendChoice(3, "e", "e", 3, 0);
    f.base.recordNormalizationCheck("adjacent-choice", false);
    f.base.recordNormalizationCheck("syllable-join", true);
    expect(verifyBaseSpellingEvidence(f.base.snapshot(), f.config)).toMatchObject({ verifiedNormalizations: 1 });
    const forged = f.base.snapshot();
    forged.normalization!.episodes[0].cursor.lastAppendedUnitId++;
    forged.normalizationCertificates![0].cursor.lastAppendedUnitId++;
    expect(() => verifyBaseSpellingEvidence(forged, f.config)).toThrow(/application point/);
  });

  it("licenses a complete unit at the existing post-syllable-rule join site", () => {
    const f = fixture([{ sound: "ɛ", form: "e", position: "nucleus" }, { sound: "d", form: "ed", position: "onset", part: 1 }], [glyph("d", "d")]);
    expect(f.apply(1, "syllable-join").status).toBe("normalized");
    expect(f.base.snapshot().edits[0]).toMatchObject({ phase: "syllable", rule: "unitNormalization:syllable-join", before: "ed", after: "d" });
    expect(verifyBaseSpellingEvidence(f.base.snapshot(), f.config)).toMatchObject({ verifiedNormalizations: 1 });
  });

  it("rejects an altered comparison denominator even inside the old structural bounds", () => {
    const config = publicConfig([glyph("d", "d")]);
    const word = createGenerator(config).generateWord({ seed: 13, syllableCount: 1, morphology: false, trace: true });
    const trace = structuredClone(word.trace!.baseSpelling!);
    expect(verifyBaseSpellingEvidence(trace, config)).toMatchObject({ version: 3 });
    if (trace.version !== 3) throw new Error("Expected v3");
    expect(trace.normalization.comparisons["adjacent-choice"]).toBe(2);
    expect(trace.normalization.collisions["adjacent-choice"]).toBe(0);
    trace.normalization.comparisons["adjacent-choice"] = 1;
    expect(() => verifyBaseSpellingEvidence(trace, config)).toThrow(/comparison counts/);
  });

  it("rejects dropping a noncollision checkpoint even with a matching lowered counter", () => {
    const config = publicConfig([glyph("d", "d")]);
    const word = createGenerator(config).generateWord({ seed: 13, syllableCount: 1, morphology: false, trace: true });
    const trace = structuredClone(word.trace!.baseSpelling!);
    if (trace.version !== 3) throw new Error("Expected v3");
    trace.normalization.checks.splice(1, 1);
    trace.normalization.comparisons["adjacent-choice"]--;
    expect(() => verifyBaseSpellingEvidence(trace, config)).toThrow(/incomplete schedule/);
  });

  it("records empty spelling guards without comparing across the empty previous unit", () => {
    const config = publicConfig([glyph("d", "d")]);
    config.graphemes[1].form = "";
    Object.assign(config, buildGraphemeMaps(config.graphemes));
    const word = createGenerator(config).generateWord({ seed: 13, syllableCount: 1, morphology: false, trace: true });
    const trace = word.trace!.baseSpelling!;
    expect(verifyBaseSpellingEvidence(trace, config)).toMatchObject({ version: 3 });
    expect(trace.normalization!.checks).toHaveLength(4);
    expect(trace.normalization!.comparisons).toEqual({ "adjacent-choice": 0, "syllable-join": 0 });
  });

  it("rejects omission of a retained collision and its matching counter", () => {
    const f = fixture([{ sound: "t", form: "t", position: "coda", part: 0 },
      { sound: "θ", form: "th", position: "onset", part: 1 }]);
    f.apply(1, "syllable-join");
    const trace = f.base.snapshot();
    if (trace.version !== 3) throw new Error("Expected v3");
    trace.normalization.episodes = [];
    trace.normalization.collisions["syllable-join"] = 0;
    expect(() => verifyBaseSpellingEvidence(trace, f.config)).toThrow(/collision episode/);
  });

  it("recounts skipped joins after a syllable rule removes the complete written part", () => {
    const config = publicConfig([glyph("d", "d")]);
    config.spellingRules = [{ name: "empty-test-part", pattern: "^.+$", replacement: "", scope: "syllable", probability: 100 }];
    const word = createGenerator(config).generateWord({ seed: 13, syllableCount: 2, morphology: false, trace: true });
    const trace = word.trace!.baseSpelling!;
    expect(trace.phones.some(phone => phone.syllableIndex === 1)).toBe(true);
    expect(verifyBaseSpellingEvidence(trace, config)).toMatchObject({ version: 3 });
    expect(trace.normalization!.checks.filter(check => check.site === "syllable-join")).toHaveLength(2);
    expect(trace.normalization!.comparisons["syllable-join"]).toBe(0);
  });

  it.each(["delay-adjacent", "advance-join"])("rejects a %s checkpoint across its syllable rewrite", mutation => {
    const config = publicConfig([glyph("d", "d")]);
    config.spellingRules = [{ name: "empty-test-part", pattern: "^.+$", replacement: "", scope: "syllable", probability: 100 }];
    const word = createGenerator(config).generateWord({ seed: 13, syllableCount: 1, morphology: false, trace: true });
    const trace = structuredClone(word.trace!.baseSpelling!);
    expect(verifyBaseSpellingEvidence(trace, config)).toMatchObject({ version: 3 });
    if (trace.version !== 3) throw new Error("Expected v3");
    if (mutation === "delay-adjacent") {
      trace.normalization.checks[2].cursor.nextEditId = 1;
      trace.normalization.comparisons["adjacent-choice"] = 1;
    } else trace.normalization.checks[3].cursor.nextEditId = 0;
    expect(() => verifyBaseSpellingEvidence(trace, config)).toThrow(/phase\/part cursor/);
  });

});


describe("realized doubling readings in repair planners", () => {
  const hardC = () => ({ ...glyph("k", "c"), reading: { kind: "following-letter" as const, forbid: ["e", "i", "y"] } });
  const doubling = { ...englishConfig.doubling!, probability: 100, suppressBeforeTense: false };

  it("checks the expanded ck neighbor rather than the original hard c before e", () => {
    const f = fixture([
      { sound: "æ", form: "a", position: "nucleus" },
      { sound: "k", form: "c", after: "ck", increment: 1, position: "onset", part: 1 },
      { sound: "ɛ", form: "e", position: "nucleus", part: 1 },
      { sound: "d", form: "ed", position: "coda", part: 1 },
    ], [glyph("d", "d")], { doubling });
    f.graphemes[1].reading = hardC().reading;
    const result = f.apply(4);
    expect(result.status).toBe("normalized");
    expect(f.base.snapshot().surface).toBe("acked");
    const certificate = f.base.snapshot().normalizationCertificates![0];
    expect(certificate.checkedNeighbors.find(entry => entry.unitId === 1)?.reading).toEqual({ kind: "single-phone" });
    expect(() => verifyBaseSpellingEvidence(f.base.snapshot(), f.config)).not.toThrow();
    const forged = structuredClone(f.base.snapshot());
    forged.normalizationCertificates![0].checkedNeighbors.find(entry => entry.unitId === 1)!.reading = hardC().reading;
    expect(() => verifyBaseSpellingEvidence(forged, f.config)).toThrow();
  });

  it("records and verifies ck's resulting reading in a coverage replacement", () => {
    const f = fixture([
      { sound: "æ", form: "a", position: "nucleus" },
      { sound: "k", form: "chhh", position: "onset", part: 1 },
      { sound: "ɛ", form: "e", position: "nucleus", part: 1 },
      { sound: "d", form: "d", position: "coda", part: 1 },
    ], [hardC()], { doubling, writtenFormConstraints: { policy: "preserve-phones", maxConsonantLetters: 2 } });
    const choices = f.contexts.map((context, id) => ({ ...context, grapheme: f.graphemes[id], form: f.graphemes[id].form }));
    // Coverage v2 has no normalization checkpoint schedule; this fixture tests its own certificate.
    const base = new BaseSpelling(f.base.snapshot().phones, true, true);
    choices.forEach((choice, id) => base.appendChoice(id, choice.grapheme.form, choice.form, id));
    const planner = createSpellingCoveragePlanner(f.config);
    expect(planner.apply(base, choices, "base-before-word-rules").status).toBe("respell");
    expect(base.snapshot().surface).toBe("acked");
    expect(base.snapshot().certificates![0].replacements[0]).toMatchObject({ after: "ck", reading: { kind: "single-phone" } });
    expect(() => verifyBaseSpellingEvidence(base.snapshot(), f.config)).not.toThrow();
    const forged = structuredClone(base.snapshot());
    forged.certificates![0].replacements[0].reading = hardC().reading;
    expect(() => verifyBaseSpellingEvidence(forged, f.config)).toThrow();
  });
});


describe("joint readings during normalization commit", () => {
  it.each([{ restricted: false, crossPart: false }, { restricted: true, crossPart: false },
    { restricted: false, crossPart: true }, { restricted: true, crossPart: true }])("checks normalization after qu ($restricted/$crossPart)", ({ restricted, crossPart }) => {
    const f = fixture([{ sound: "k", form: "c", position: "onset" }, { sound: "w", form: "u", position: "onset", part: crossPart ? 1 : 0 },
      { sound: "i:", form: "ue", position: "nucleus", part: crossPart ? 1 : 0 }], [glyph("i:", "e")]);
    const input = f.input(2);
    const decision = f.normalizer.decide(input);
    expect(decision.status).toBe("normalized");
    if (decision.status !== "normalized") throw new Error("Expected normalization fixture");
    f.normalizer.verify(input, decision.plan);
    const rules = structuredClone(englishSharedSpellings);
    if (restricted) rules.find(rule => rule.id === "cw-to-qu")!.context = { following: { phoneClass: "vowel", letters: ["u"] } };
    const target = new BaseSpelling(structuredClone(f.base.snapshot().phones), true, true, true, rules, f.config);
    f.base.snapshot().units.forEach(unit => target.appendChoice(unit.id, unit.selected, unit.afterDoubling, unit.inventoryIndex, 0));
    target.setPhase("word");
    const slot = { phase: "word", partId: null } as const;
    const attempt = createSharedConstructionPlanner(rules, f.config).decide(target.constructionState(), slot, "cw-to-qu", [0, 1], () => 0);
    expect(target.recordSharedAttempt(slot, "cw-to-qu", [0, 1], attempt)).toBe(0);
    const sharedState = target.constructionState();
    const jointInput = { ...target.current(), ...target.normalizationState(), contexts: f.contexts, states: input.states,
      rightIndex: 2, site: "adjacent-choice" as const,
      shared: { constructions: sharedState.constructions, certificates: sharedState.certificates } };
    const jointNormalizer = createSpellingNormalizer(f.config, undefined, undefined, rules);
    const jointDecision = jointNormalizer.decide(jointInput);
    if (restricted) {
      expect(jointDecision).toEqual({ status: "retained", reason: "construction-obligation" });
    } else {
      expect(jointDecision.status).toBe("normalized");
      if (jointDecision.status !== "normalized") throw new Error("Expected joint normalization");
      expect(jointDecision.plan.preservedSharedConstructionIds).toEqual([0]);
      expect(jointDecision.plan.checkedNeighbors).toEqual([]);
      jointNormalizer.verify(jointInput, jointDecision.plan);
      const forged = structuredClone(jointDecision.plan);
      forged.preservedSharedConstructionIds = [];
      expect(() => jointNormalizer.verify(jointInput, forged)).toThrow(/normalization certificate/);
      expect(jointNormalizer.decide({ ...jointInput, shared: { ...jointInput.shared, constructions: [] } }))
        .toEqual({ status: "retained", reason: "unresolved-ownership" });
      expect(createSpellingNormalizer(f.config).decide(jointInput))
        .toEqual({ status: "retained", reason: "unsupported-shared-construction" });
    }
    // Separately test commit rejection against a structurally rebound old plan.
    const plan = structuredClone(decision.plan);
    plan.cursor = target.normalizationState().cursor;
    plan.editId = plan.cursor.nextEditId;
    plan.predecessorCellId = target.current().cells[1].id;
    const before = target.snapshot();
    if (restricted) {
      expect(() => target.commitNormalization(plan)).toThrow(/normalization certificate/);
      expect(target.snapshot()).toEqual(before);
    } else {
      if (jointDecision.status !== "normalized") throw new Error("Expected joint normalization");
      expect(target.commitNormalization(jointDecision.plan)).toBe(0);
      const trace = target.snapshot();
      expect(trace.surface).toBe("que");
      expect(trace.cells.slice(0, 2)).toEqual(before.cells.slice(0, 2));
      expect(trace.cells[2].origin).toMatchObject({ kind: "normalized", unitId: 2, certificateId: 0, editId: 1 });
      expect(target.constructionState().constructions[0].phoneIds).toEqual([0, 1]);
      const coverageConfig = { ...f.config, writtenFormConstraints: { policy: "preserve-phones" as const, maxVowelLetters: 1 } };
      const coverage = createSpellingCoveragePlanner(coverageConfig, undefined, undefined, rules);
      const choices = f.contexts.map((context, id) => ({ ...context, grapheme: f.graphemes[id], form: target.current().units[id].afterDoubling }));
      const beforeCoverage = target.snapshot();
      expect(coverage.apply(target, choices, "base-after-word-rules")).toMatchObject({
        status: "infeasible", reason: "normalization-context-unavailable", visitedAssignments: 0,
      });
      expect(target.snapshot()).toEqual(beforeCoverage);
    }
  });
});
