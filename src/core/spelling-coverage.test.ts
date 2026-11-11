import { spellingBoundaryContexts } from "./spelling-context.js";
import { describe, expect, it } from "vitest";
import { createGenerator, createSeededRng, englishConfig, generateWord } from "../index.js";
import type { Grapheme, Phoneme } from "../types.js";
import type { LanguageConfig } from "../config/language.js";
import { buildGraphemeMaps } from "../elements/graphemes/index.js";
import { verifyBaseSpellingEvidence } from "./spelling-evidence.js";
import { findExample } from "../test-support/find-example.js";
import { BaseSpelling } from "./base-spelling.js";
import { createSpellingCoveragePlanner, SPELLING_COVERAGE_SEARCH_LIMIT } from "./spelling-coverage.js";
import type { SpellingChoiceState } from "./spelling-coverage.js";
import type { SpellingCoverageCertificate } from "./spelling-coverage-types.js";

const glyph = (phoneme: string, form: string, frequency = 1): Grapheme => ({ phoneme, form, frequency,
  startWord: 1, midWord: 1, endWord: 1, reading: { kind: "single-phone" } });
const phone = (sound: string): Phoneme => englishConfig.phonemes.find(entry => entry.sound === sound)!;

/** Pure planner fixtures use actual inventory phones; generated-word fixtures below use public APIs. */
function fixture(chosen: Grapheme[], alternatives: Grapheme[] = [], extra: Partial<LanguageConfig> = {}, forms = chosen.map(g => g.form)) {
  const phonemes = chosen.map(g => phone(g.phoneme));
  const graphemes = [...chosen, ...alternatives];
  const config: LanguageConfig = { ...englishConfig, ...extra, graphemes, ...buildGraphemeMaps(graphemes),
    doubling: extra.doubling,
    writtenFormConstraints: { policy: "preserve-phones", maxConsonantLetters: 3, ...extra.writtenFormConstraints } };
  const segmentCounts = { onset: 0, nucleus: 0, coda: 0 };
  const boundary = phonemes.map((phoneme, id) => {
    const segment = phoneme.nucleus ? "nucleus" as const : "coda" as const;
    return { id, part: "root" as const, syllableIndex: 0, segment, segmentIndex: segmentCounts[segment]++,
      soundAtSpelling: phoneme.sound, boundary: { phoneme: structuredClone(phoneme) } };
  });
  const contexts = spellingBoundaryContexts(boundary);
  const choices: SpellingChoiceState[] = chosen.map((grapheme, index) => ({
    ...contexts[index], grapheme, form: forms[index],
  }));
  const makeBase = () => {
    const base = new BaseSpelling(structuredClone(boundary), true, true);
    chosen.forEach((g, i) => base.appendChoice(i, g.form, forms[i], i));
    return base;
  };
  return { config, choices, base: makeBase(), makeBase, planner: createSpellingCoveragePlanner(config) };
}

function fixedRoot(finals: Grapheme[], policy: "preserve-phones" | false = "preserve-phones") {
  const onset = glyph("b", "b");
  const nucleus = glyph("æ", "a");
  const graphemes = [onset, nucleus, ...finals];
  const one: [number, number][] = [[1, 1]];
  const config: LanguageConfig = {
    ...englishConfig, graphemes, ...buildGraphemeMaps(graphemes),
    phonemeMaps: { onset: new Map([["b", [phone("b")]]]), nucleus: new Map([["æ", [phone("æ")]]]), coda: new Map([[finals[0].phoneme, [phone(finals[0].phoneme)]]]) },
    clusterConstraint: undefined, clusterWeights: undefined, clusterLimits: { maxOnset: 1, maxCoda: 1 },
    codaConstraints: { allowedFinal: [finals[0].phoneme] },
    syllableStructure: { ...englishConfig.syllableStructure, maxOnsetLength: 1, maxCodaLength: 1, letterLengthTargets: undefined },
    phonemeLengthWeights: { text: [[3, 1]], lexicon: [[3, 1]] },
    generationWeights: { ...englishConfig.generationWeights,
      onsetLength: { monosyllabic: one, followingNucleus: one, default: one, long: one },
      codaLength: { monosyllabic: { 1: one }, monosyllabicDefault: one, polysyllabicNonzero: one, zeroWeightEndOfWord: 0, zeroWeightMidWord: 0 },
      probability: { ...englishConfig.generationWeights.probability, finalS: 0, nasalStopExtension: 0 } },
    doubling: undefined, silentE: undefined, spellingRules: [], gapSpellings: [],
    pronunciation: { ...englishConfig.pronunciation, aspiration: { enabled: false, targets: [{ segment: "onset" }], rules: [{ id: "disabled", when: {}, probability: 0 }], fallbackProbability: 0 }, vowelReduction: { enabled: false, rules: [], reduceSecondaryStress: false } },
    writtenFormConstraints: { policy: policy || undefined, maxConsonantLetters: 1 },
  };
  return createGenerator(config);
}

function certificate(base: BaseSpelling): SpellingCoverageCertificate { return base.snapshot().certificates![0]; }

describe("whole-unit spelling budgets", () => {
  it.each(["stress", "cluster", "features", "next-features", "doubling-stress", "doubling-cluster", "prev-reduced", "first-coda", "next-consonant", "next-nucleus"])("rejects certificate-only %s context changes against the actual writer boundary", field => {
    const f = fixture([glyph("æ", "a"), glyph("f", "ph")], [glyph("f", "f")], { writtenFormConstraints: { maxConsonantLetters: 1 } });
    expect(f.planner.apply(f.base, f.choices, "base-before-word-rules").status).toBe("respell");
    const trace = f.base.snapshot();
    expect(() => verifyBaseSpellingEvidence(trace, f.config)).not.toThrow();
    const altered = structuredClone(trace);
    const context = altered.certificates![0].contexts[1];
    if (field === "stress") context.slot.stress = "ˈ";
    if (field === "cluster") context.slot.isCluster = !context.slot.isCluster;
    if (field === "features") context.slot.phoneme.voiced = !context.slot.phoneme.voiced;
    if (field === "next-features") altered.certificates![0].contexts[0].slot.nextPhoneme!.voiced = true;
    if (field === "doubling-stress") context.doubling.stress = "ˈ";
    if (field === "doubling-cluster") context.doubling.isCluster = !context.doubling.isCluster;
    if (field === "prev-reduced") context.doubling.prevReduced = !context.doubling.prevReduced;
    if (field === "first-coda") context.doubling.isFirstInCoda = !context.doubling.isFirstInCoda;
    if (field === "next-consonant") context.doubling.nextIsConsonant = !context.doubling.nextIsConsonant;
    if (field === "next-nucleus") context.doubling.nextNucleus = structuredClone(phone("i:"));
    expect(() => verifyBaseSpellingEvidence(altered, f.config)).toThrow(/writer-boundary context/);
  });

  it.each(["extra-phone", "missing-phone", "selected-form", "selected-inventory"])("rejects %s original ledger corruption", field => {
    const f = fixture([glyph("æ", "a"), glyph("f", "ph")], [glyph("f", "f")]);
    const trace = f.base.snapshot();
    if (field === "extra-phone") trace.phones.push({ ...structuredClone(trace.phones[1]), id: 2, segmentIndex: 1 });
    if (field === "missing-phone") trace.phones.pop();
    if (field === "selected-form") trace.units[1].selected = "f";
    if (field === "selected-inventory") trace.units[1].inventoryIndex = 0;
    expect(() => verifyBaseSpellingEvidence(trace, f.config)).toThrow(/cardinality|selected inventory identity/);
  });

  it("detaches nested boundary features from inventory and returned snapshots", () => {
    const f = fixture([glyph("æ", "a"), glyph("f", "ph")], [glyph("f", "f")]);
    const original = f.base.snapshot();
    const changed = f.base.snapshot();
    changed.phones[0].boundary!.phoneme.voiced = false;
    expect(f.base.snapshot()).toEqual(original);
    expect(f.base.snapshot().phones[0].boundary!.phoneme).toEqual(phone("æ"));
  });

  it("respells a complete ph unit through the public API without changing its phone", () => {
    const word = fixedRoot([glyph("f", "ph", 1000), glyph("f", "f")]).generateWord({ seed: 13, syllableCount: 1, morphology: false, trace: true });
    expect(word.written).toEqual({ clean: "baf", hyphenated: "baf" });
    expect(word.syllables[0].coda.map(p => p.sound)).toEqual(["f"]);
    expect(word.trace!.baseSpelling!.certificates![0].replacements).toEqual([
      expect.objectContaining({ before: "ph", after: "f", phoneIds: [2], partId: 0 }),
    ]);
    expect(word.trace!.spellingBudgets![0].status).toBe("respell");
  });

  it("preserves th and reports infeasibility when no shorter licensed spelling exists", () => {
    const word = fixedRoot([glyph("θ", "th")]).generateWord({ seed: 13, syllableCount: 1, morphology: false, trace: true });
    expect(word.written.clean).toBe("bath");
    expect(word.syllables[0].coda.map(p => p.sound)).toEqual(["θ"]);
    expect(word.trace!.spellingBudgets![0]).toMatchObject({ status: "infeasible", reason: "no-licensed-plan" });
    expect(word.trace!.baseSpelling!.cells.slice(-2).map(cell => cell.text).join("")).toBe("th");
  });

  it("keeps omitted-policy custom configurations on the v1 legacy repair contract", () => {
    const word = fixedRoot([glyph("θ", "th")], false).generateWord({ seed: 13, syllableCount: 1, morphology: false, trace: true });
    expect(word.trace!.baseSpelling!.version).toBe(1);
    expect(word.trace!.spellingBudgets).toBeUndefined();
    expect(word.written.clean).toBe("bat");
  });

  it("does not invent a reading certificate for unannotated custom alternatives", () => {
    const long = glyph("f", "ph", 1000); const short = glyph("f", "f"); delete short.reading;
    const word = fixedRoot([long, short]).generateWord({ seed: 13, syllableCount: 1, morphology: false, trace: true });
    expect(word.written.clean).toBe("baph");
    expect(word.trace!.spellingBudgets![0]).toMatchObject({ status: "infeasible", reason: "unknown-reading" });
  });

  it("retains an intact /l f θ s/ cluster even though lfths cannot fit a three-letter final preference", () => {
    const f = fixture([glyph("æ", "a"), glyph("l", "l"), glyph("f", "f"), glyph("θ", "th"), glyph("s", "s")], [], {
      writtenFormConstraints: { maxConsonantLetters: 4, maxFinalConsonantLetters: 3 },
    });
    const before = f.base.snapshot();
    expect(f.planner.apply(f.base, f.choices, "base-before-word-rules")).toMatchObject({ status: "infeasible", reason: "no-licensed-plan" });
    expect(f.base.snapshot()).toEqual(before);
    expect(before.phones.map(p => p.soundAtSpelling)).toEqual(["æ", "l", "f", "θ", "s"]);
  });

  it("uses normalized full-sequence probabilities, invariant to a uniform per-phone weight rescaling", () => {
    const run = (scale: number) => {
      const f = fixture([glyph("æ", "a"), glyph("f", "ph", 3 * scale), glyph("r", "rh", 4)], [glyph("f", "f", 7 * scale), glyph("r", "r", 6)]);
      expect(f.planner.apply(f.base, f.choices, "base-before-word-rules").status).toBe("respell");
      return certificate(f.base);
    };
    const first = run(1); const scaled = run(100);
    expect(first.after).toBe("afrh");
    expect(first).toEqual(scaled);
    expect(first.phoneIds).toEqual([1]);
    expect(first.choices).toHaveLength(3);
  });

  it.each([false, true])("matches exhaustive unpruned enumeration for fully explored weighted/tied plans (tie=%s)", tie => {
    const rejected = { ...glyph("f", "f", 100), reading: { kind: "unsupported-construction" as const, reason: "fixture" } };
    const f = fixture([glyph("æ", "a"), glyph("f", "ph", tie ? 4 : 3), glyph("r", "rh", 4)],
      [rejected, glyph("f", "f", tie ? 6 : 7), glyph("r", "r", 6)]);
    // Small independent exhaustive oracle: no eligibility conditions or doubling.
    // It visits even the unsupported branch and rejects only complete surfaces.
    const pools = f.choices.map(choice => f.config.graphemes.filter(g => g.phoneme === choice.grapheme.phoneme)
      .sort((a, b) => Number(b === choice.grapheme) - Number(a === choice.grapheme)));
    let best: { indices: number[]; changes: number; score: number } | undefined;
    for (const a of pools[0]) for (const b of pools[1]) for (const c of pools[2]) {
      const plan = [a, b, c];
      const changes = plan.filter((g, i) => g !== f.choices[i].grapheme).length;
      const surface = plan.map(g => g.form).join("");
      if (!changes || /[bcdfghjklmnpqrstvwxyz]{4}/.test(surface) || plan.some(g => g.reading?.kind !== "single-phone")) continue;
      const score = plan.reduce((total, g, i) => total + Math.log(g.frequency / pools[i].reduce((sum, entry) => sum + entry.frequency, 0)) + Math.log(1), 0);
      if (!best || changes < best.changes || (changes === best.changes && score > best.score + 1e-12)) {
        best = { indices: plan.map(g => f.config.graphemes.indexOf(g)), changes, score };
      }
    }
    const outcome = f.planner.apply(f.base, f.choices, "base-before-word-rules");
    expect(outcome.status).toBe("respell");
    expect(outcome.visitedAssignments).toBeLessThan(SPELLING_COVERAGE_SEARCH_LIMIT);
    const actual = certificate(f.base);
    expect(actual.choices.map(choice => choice.inventoryIndex)).toEqual(best!.indices);
    expect(actual.logProbability).toBe(best!.score);
    expect(actual.after).toBe(tie ? "aphr" : "afrh");
  });

  it("never unlocks fallback-only short forms merely to fit a budget", () => {
    const fallback = { ...glyph("f", "f"), fallbackOnly: true };
    const f = fixture([glyph("æ", "a"), glyph("f", "ph")], [fallback], { writtenFormConstraints: { maxConsonantLetters: 1 } });
    expect(f.planner.apply(f.base, f.choices, "base-before-word-rules").status).toBe("infeasible");
    expect(f.base.snapshot().surface).toBe("aph");
  });

  it("does not undouble a forced 100-percent realization", () => {
    const f = fixture([glyph("æ", "a"), glyph("f", "f")], [], {
      doubling: { ...englishConfig.doubling!, probability: 100 }, writtenFormConstraints: { maxConsonantLetters: 1 },
    }, ["a", "ff"]);
    expect(f.planner.apply(f.base, f.choices, "base-before-word-rules").status).toBe("infeasible");
    expect(f.base.snapshot().surface).toBe("aff");
  });

  it("rechecks an unchanged soft c when a neighboring vowel spelling changes", () => {
    const c = { ...glyph("s", "c"), reading: { kind: "following-letter" as const, require: ["e", "i", "y"] } };
    const f = fixture([c, glyph("ɛ", "ea")], [glyph("ɛ", "a", 100), glyph("ɛ", "e")], { writtenFormConstraints: { maxVowelLetters: 1 } });
    f.choices[0].slot.position = "onset"; f.choices[1].slot.codaLength = 0;
    expect(f.planner.apply(f.base, f.choices, "base-before-word-rules").status).toBe("respell");
    expect(f.base.snapshot().surface).toBe("ce");
  });

  it("does not treat a phonologically open vowel as open after a later same-part insertion closes it", () => {
    const short = { ...glyph("i:", "e"), reading: { kind: "open-vowel-or-split-marker" as const } };
    const f = fixture([glyph("i:", "ee")], [short], { writtenFormConstraints: { maxVowelLetters: 1 } });
    f.choices[0].slot.codaLength = 0;
    f.base.edit("word", 2, 0, "t", "test-insertion", 0);
    expect(f.planner.apply(f.base, f.choices, "base-before-word-rules")).toMatchObject({ status: "infeasible", reason: "unresolved-ownership" });
    expect(f.base.snapshot().surface).toBe("eet");
  });

  it("refuses a vowel respelling beside an unchanged unsupported final-e unit", () => {
    const ve = { ...glyph("v", "ve"), reading: { kind: "unsupported-construction" as const, reason: "Marker scope unavailable" } };
    const f = fixture([glyph("ɛ", "ea"), ve], [glyph("ɛ", "e")], { writtenFormConstraints: { maxVowelLetters: 1 } });
    const before = f.base.snapshot();
    expect(f.planner.apply(f.base, f.choices, "base-before-word-rules")).toMatchObject({ status: "infeasible", reason: "construction-obligation" });
    expect(f.base.snapshot()).toEqual(before);
  });

  it("preserves an invalid-junction refusal through both budget passes", () => {
    const f = fixture([glyph("æ", "a"), glyph("p", "pp"), glyph("k", "k"), glyph("æ", "a")], [glyph("p", "p")], { writtenFormConstraints: { maxConsonantLetters: 2 } });
    f.choices.forEach((choice, i) => {
      choice.slot.syllableCount = 2;
      choice.slot.syllableIndex = i < 2 ? 0 : 1;
      choice.slot.position = i === 1 ? "coda" : i === 2 ? "onset" : "nucleus";
    });
    const before = f.base.snapshot();
    for (const scope of ["base-before-word-rules", "base-after-word-rules"] as const) {
      expect(f.planner.apply(f.base, f.choices, scope)).toMatchObject({ status: "infeasible", reason: "invalid-junction", visitedAssignments: 0 });
      expect(f.base.snapshot()).toEqual(before);
    }
  });

  it("excludes zero-weight short alternatives rather than turning them into repairs", () => {
    const f = fixture([glyph("æ", "a"), glyph("f", "ph")], [glyph("f", "f", 0)], { writtenFormConstraints: { maxConsonantLetters: 1 } });
    expect(f.planner.apply(f.base, f.choices, "base-before-word-rules")).toMatchObject({ status: "infeasible", reason: "no-licensed-plan" });
    expect(f.base.snapshot().surface).toBe("aph");
  });

  it("marks cross-part replacements as unknown and rejects mismatched part evidence", () => {
    const phones = [0, 1].map(i => ({ id: i, part: "root" as const, syllableIndex: i, segment: "coda" as const, segmentIndex: 0, soundAtSpelling: "f", boundary: { phoneme: structuredClone(phone("f")) } }));
    const base = new BaseSpelling(phones, true, true);
    base.appendChoice(0, "ph", "ph", 0); base.appendChoice(1, "f", "f", 1);
    base.edit("word", 1, 2, "ff", "cross-part");
    const trace = base.snapshot();
    expect(trace.edits[0].partId).toBeNull();
    expect(trace.edits[0].output.every(cell => cell.partId === null)).toBe(true);
    expect(verifyBaseSpellingEvidence(trace)).toEqual({ version: 2, verifiedCertificates: 0 });
    trace.edits[0].output[0].partId = 0;
    expect(() => verifyBaseSpellingEvidence(trace)).toThrow(/part/);
    expect(base.snapshot().edits[0].output[0].partId).toBeNull();
  });

  it("keeps unresolved rewrite ownership explicit and unchanged", () => {
    const f = fixture([glyph("æ", "a"), glyph("f", "ph")], [glyph("f", "f")], { writtenFormConstraints: { maxConsonantLetters: 1 } });
    f.base.edit("word", 0, 3, "aph", "no-op");
    f.base.edit("word", 0, 3, "phph", "opaque");
    const before = f.base.snapshot();
    expect(f.planner.apply(f.base, f.choices, "base-before-word-rules").status).toBe("infeasible");
    expect(f.base.snapshot()).toEqual(before);
  });

  it("reports bounded search exhaustion separately and does not commit a provisional plan", () => {
    const f = fixture([glyph("æ", "a"), glyph("f", "ph")], Array.from({ length: 9000 }, () => glyph("f", "ph")), { writtenFormConstraints: { maxConsonantLetters: 1 } });
    const before = f.base.snapshot();
    expect(f.planner.apply(f.base, f.choices, "base-before-word-rules")).toMatchObject({ status: "infeasible", reason: "search-budget", visitedAssignments: SPELLING_COVERAGE_SEARCH_LIMIT });
    expect(f.base.snapshot()).toEqual(before);
  });

  it.each(["phone", "part", "probability", "inventory", "version", "surface"])("rejects a mismatched %s certificate before any cell or counter mutation", field => {
    const f = fixture([glyph("æ", "a"), glyph("f", "ph")], [glyph("f", "f")], { writtenFormConstraints: { maxConsonantLetters: 1 } });
    const originalChoices = f.choices.map(choice => ({ ...choice }));
    expect(f.planner.apply(f.base, f.choices, "base-before-word-rules").status).toBe("respell");
    const valid = certificate(f.base); const bad = structuredClone(valid);
    if (field === "phone") bad.phoneIds = [0];
    if (field === "part") bad.replacements[0].partId = 7;
    if (field === "probability") bad.choices[1].graphemeProbability = 0.99;
    if (field === "inventory") bad.choices[1].inventoryIndex = 0;
    if (field === "version") Object.assign(bad, { version: 99 });
    if (field === "surface") bad.after = "lost";
    const target = f.makeBase(); const before = target.snapshot();
    expect(() => f.planner.verify(target, originalChoices, bad)).toThrow(/certificate/);
    expect(target.snapshot()).toEqual(before);
    f.planner.verify(target, originalChoices, valid);
    target.commitLicensedPlan(valid);
    expect(target.snapshot()).toEqual(f.base.snapshot());
  });

  it("rejects unknown evidence versions and preserves v1 as unavailable part identity", () => {
    const word = fixedRoot([glyph("θ", "th")], false).generateWord({ seed: 13, syllableCount: 1, morphology: false, trace: true });
    const trace = word.trace!.baseSpelling!;
    expect(verifyBaseSpellingEvidence(trace)).toEqual({ version: 1, verifiedCertificates: 0 });
    Object.assign(trace, { version: 99 });
    expect(() => verifyBaseSpellingEvidence(trace)).toThrow(/unsupported ledger version/);
  });

  it("keeps identical left-to-right log accumulation in the search and verifier", () => {
    const f = fixture([glyph("æ", "a", 3), glyph("f", "ph", 7)], [glyph("æ", "aa", 7), glyph("f", "f", 3)], {
      doubling: { ...englishConfig.doubling!, probability: 80 }, writtenFormConstraints: { maxConsonantLetters: 1, maxVowelLetters: 1 },
    });
    expect(f.planner.apply(f.base, f.choices, "base-before-word-rules").status).toBe("respell");
    const expected = (Math.log(0.3) + Math.log(0.3)) + Math.log(1 - 0.8);
    expect(expected).not.toBe(Math.log(0.3) + (Math.log(0.3) + Math.log(1 - 0.8)));
    expect(certificate(f.base).logProbability).toBe(expected);
  });

  it("retains resolved morphology presentation when final ownership is unavailable", () => {
    const { word } = findExample(word => word.trace!.spellingBudgets?.some(outcome => outcome.scope === "final-morphology" && outcome.status === "infeasible") ?? false, {
      property: "an affixed word over a final spelling budget", limit: 20_000, options: { morphology: true },
    });
    expect(word.written.hyphenated).toBe(word.written.clean);
    expect(word.trace!.spellingBudgets!.find(outcome => outcome.scope === "final-morphology"))
      .toMatchObject({ status: "infeasible", reason: "unresolved-ownership" });
    const realization = word.trace!.morphology!.realization!;
    expect(realization.emittedParts).toEqual(realization.assembledParts);
    expect(realization.emittedParts.map(part => part.text).join("")).toBe(word.written.clean);
  });

  it("replays the same floating-point accumulation order for every respelled lexicon word", () => {
    let respelled = 0;
    for (let seed = 0; respelled < 20 && seed < 20_000; seed++) {
      const word = generateWord({ seed, mode: "lexicon", trace: true });
      if (!word.trace!.spellingBudgets?.some(outcome => outcome.status === "respell")) continue;
      respelled++;
      expect(() => verifyBaseSpellingEvidence(word.trace!.baseSpelling!, englishConfig)).not.toThrow();
    }
    expect(respelled).toBe(20);
  });

  it("derives suffix-aware selection inputs from the writer boundary", () => {
    // Selection conditions read the planned suffix's first letter and the previous
    // phone's position, so replayed pools must see the same inputs.
    const { word } = findExample(word => word.trace!.baseSpelling!.phones.at(-1)!.boundary?.nextWritten !== undefined, {
      property: "a root spelled before a planned suffix", limit: 200, options: { morphology: true },
    });
    const phones = word.trace!.baseSpelling!.phones;
    const contexts = spellingBoundaryContexts(phones);
    expect(contexts.at(-1)!.slot.nextWritten).toBe(phones.at(-1)!.boundary!.nextWritten);
    expect(contexts.slice(0, -1).every(context => context.slot.nextWritten === undefined)).toBe(true);
    expect(contexts[0].slot.previousPosition).toBeUndefined();
    expect(contexts.slice(1).map(context => context.slot.previousPosition)).toEqual(phones.slice(0, -1).map(phone => phone.segment));
    expect(() => verifyBaseSpellingEvidence(word.trace!.baseSpelling!, englishConfig)).not.toThrow();
  });

  it("keeps trace on/off output and RNG-call parity with active policy", () => {
    const on = createSeededRng(129); const off = createSeededRng(129); let a = 0; let b = 0;
    for (let draw = 0; draw < 200; draw++) {
      const traced = generateWord({ rand: () => { a++; return on(); }, trace: true, morphology: draw % 2 === 0 });
      const plain = generateWord({ rand: () => { b++; return off(); }, morphology: draw % 2 === 0 });
      verifyBaseSpellingEvidence(traced.trace!.baseSpelling!, englishConfig);
      delete traced.trace;
      expect(traced).toEqual(plain); expect(a).toBe(b);
    }
    expect(on()).toBe(off());
  });
});

describe("realized doubling readings", () => {
  it("records and verifies ck's resulting reading in a coverage replacement", () => {
    const hardC = () => ({ ...glyph("k", "c"), reading: { kind: "following-letter" as const, forbid: ["e", "i", "y"] } });
    const units = [
      { sound: "æ", form: "a", position: "nucleus" as const, part: 0 },
      { sound: "k", form: "chhh", position: "onset" as const, part: 1 },
      { sound: "ɛ", form: "e", position: "nucleus" as const, part: 1 },
      { sound: "d", form: "d", position: "coda" as const, part: 1 },
    ];
    const chosen = units.map(unit => glyph(unit.sound, unit.form));
    const graphemes = [...chosen, hardC()];
    const config: LanguageConfig = { ...englishConfig, graphemes, ...buildGraphemeMaps(graphemes),
      doubling: { ...englishConfig.doubling!, probability: 100, suppressBeforeTense: false },
      writtenFormConstraints: { policy: "preserve-phones", maxConsonantLetters: 2 } };
    const phones = units.map((unit, id) => ({ id, part: "root" as const, syllableIndex: unit.part, segment: unit.position,
      segmentIndex: 0, soundAtSpelling: unit.sound, boundary: { phoneme: structuredClone(phone(unit.sound)), stress: "ˈ" as const } }));
    const contexts = spellingBoundaryContexts(phones);
    const choices = contexts.map((context, id) => ({ ...context, grapheme: chosen[id], form: chosen[id].form }));
    const base = new BaseSpelling(phones, true, true);
    choices.forEach((choice, id) => base.appendChoice(id, choice.grapheme.form, choice.form, id));

    expect(createSpellingCoveragePlanner(config).apply(base, choices, "base-before-word-rules").status).toBe("respell");
    // c before e would read /s/; the realized ck reads /k/ regardless of the next letter.
    expect(base.snapshot().surface).toBe("acked");
    expect(certificate(base).replacements[0]).toMatchObject({ after: "ck", reading: { kind: "single-phone" } });
    expect(() => verifyBaseSpellingEvidence(base.snapshot(), config)).not.toThrow();
    const forged = structuredClone(base.snapshot());
    forged.certificates![0].replacements[0].reading = hardC().reading;
    expect(() => verifyBaseSpellingEvidence(forged, config)).toThrow();
  });
});
