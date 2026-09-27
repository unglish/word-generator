import { englishSharedSpellings } from "../elements/graphemes/shared.js";
import { createSharedConstructionPlanner } from "./spelling-construction.js";
import { createConstructionNeighborGuard } from "./spelling-construction-neighbors.js";
import { resolveConstructionSpan } from "./spelling-construction-ownership.js";
import { spellingBoundaryContexts } from "./spelling-context.js";
import { describe, expect, it } from "vitest";
import { createGenerator, createSeededRng, englishConfig, generateWord } from "../index.js";
import type { Grapheme, Phoneme } from "../types.js";
import type { LanguageConfig } from "../config/language.js";
import { buildGraphemeMaps } from "../elements/graphemes/index.js";
import { verifyBaseSpellingEvidence } from "./spelling-evidence.js";
import { BaseSpelling } from "./base-spelling.js";
import { createSpellingCoveragePlanner } from "./spelling-coverage.js";
import type { SpellingChoiceState } from "./spelling-coverage.js";
import type { SpellingCoverageCertificate } from "./spelling-coverage-types.js";

const glyph = (phoneme: string, form: string, frequency = 1): Grapheme => ({ phoneme, form, frequency, origin: 0,
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
  const makeBase = (shared = false) => {
    const base = new BaseSpelling(structuredClone(boundary), true, true, shared, shared ? englishSharedSpellings : undefined, shared ? config : undefined);
    chosen.forEach((g, i) => base.appendChoice(i, g.form, forms[i], i, shared ? 0 : undefined));
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

describe("shared readings during coverage planning and commits", () => {
  it.each([{ after: "e", prefix: "a" }, { after: "h", prefix: "a" }, { after: "e", prefix: "aa" }, { after: "h", prefix: "aa" }])(
    "checks gz following context through $prefix → a and ee → $after", ({ after, prefix }) => {
      // h is deliberately declared as a synthetic vowel spelling: ownership alone
      // must not override the existing shared rule's separate written-letter condition.
      const f = fixture([glyph("æ", prefix), glyph("g", "g"), glyph("z", "z"), glyph("i:", "ee")],
        [glyph("i:", after), ...(prefix === "aa" ? [glyph("æ", "a")] : [])], { writtenFormConstraints: { maxConsonantLetters: 10, maxVowelLetters: 1 } });
      const originalChoices = f.choices.map(choice => ({ ...choice }));
      expect(f.planner.apply(f.base, f.choices, "base-before-word-rules").status).toBe("respell");
      const plan = structuredClone(certificate(f.base));
      const target = f.makeBase(true);
      target.setPhase("word");
      const slot = { phase: "word", partId: null } as const;
      const attempt = createSharedConstructionPlanner(englishSharedSpellings, f.config)
        .decide(target.constructionState(), slot, "gz-to-x", [1, 2], () => 0);
      expect(target.recordSharedAttempt(slot, "gz-to-x", [1, 2], attempt)).toBe(0);
      // Rebind the independent repair's surface to test the commit's structural
      // contract. This does not claim coverage-search integration or v4 replay.
      plan.before = prefix + "xee";
      plan.after = "ax" + after;
      plan.inputCellIds = target.current().cells.map(cell => cell.id);
      const before = target.snapshot();
      if (after === "h") {
        expect(() => target.commitLicensedPlan(plan)).toThrow(/coverage certificate/);
        expect(target.snapshot()).toEqual(before);
      } else {
        expect(target.commitLicensedPlan(plan)).toBe(0);
        const trace = target.snapshot();
        expect(trace.surface).toBe("axe");
        expect(trace.cells[1]).toEqual(before.cells[prefix.length]);
        expect(target.constructionState().constructions[0].phoneIds).toEqual([1, 2]);
        expect(trace.cells[2].origin).toMatchObject({ kind: "licensed", unitId: 3, certificateId: 0 });
      }
      const candidate = f.makeBase(true);
      candidate.setPhase("word");
      const candidateAttempt = createSharedConstructionPlanner(englishSharedSpellings, f.config)
        .decide(candidate.constructionState(), slot, "gz-to-x", [1, 2], () => 0);
      candidate.recordSharedAttempt(slot, "gz-to-x", [1, 2], candidateAttempt);
      const input = structuredClone(candidate.constructionState());
      const snapshot = candidate.snapshot();
      const planner = createSpellingCoveragePlanner(f.config, undefined, undefined, englishSharedSpellings);
      const outcome = planner.apply(candidate, originalChoices.map(choice => ({ ...choice })), "base-after-word-rules");
      if (after === "h") {
        expect(outcome).toMatchObject({ status: "infeasible", reason: "construction-obligation" });
        expect(candidate.snapshot()).toEqual(snapshot);
      } else {
        expect(outcome.status).toBe("respell");
        expect(candidate.snapshot().surface).toBe("axe");
        const candidateTrace = candidate.snapshot();
        if (candidateTrace.version !== 4) throw new Error("Expected shared trace");
        expect(candidateTrace.shared.timeline[candidateTrace.shared.timeline.length - 1]).toEqual({
          kind: "coverage", index: 0, cursor: { lastAppendedUnitId: 3, nextEditId: 1 },
        });
        const proof = certificate(candidate);
        expect(proof.preservedSharedConstructionIds).toEqual([0]);
        expect(proof.replacements.some(entry => entry.unitId === 1 || entry.unitId === 2)).toBe(false);
        const replay = { current: () => ({ ...input, normalizationCount: 0 }), constructionState: () => input };
        planner.verify(replay, originalChoices, proof);
        expect(() => f.planner.verify(replay, originalChoices, proof)).toThrow(/coverage certificate/);
        const missing = { ...input, constructions: [] };
        expect(() => planner.verify({ current: () => ({ ...missing, normalizationCount: 0 }), constructionState: () => missing }, originalChoices, proof))
          .toThrow(/coverage certificate/);
        const forged = structuredClone(proof);
        forged.preservedSharedConstructionIds = [];
        expect(() => planner.verify(replay, originalChoices, forged)).toThrow(/coverage certificate/);
      }
    });
});

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
    expect(outcome.visitedAssignments).toBeLessThan(8192);
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
    f.base.edit(2, 0, "t", "test-insertion", 0);
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
    base.edit(1, 2, "ff", "cross-part");
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
    f.base.edit(0, 3, "aph", "no-op");
    f.base.edit(0, 3, "phph", "opaque");
    const before = f.base.snapshot();
    expect(f.planner.apply(f.base, f.choices, "base-before-word-rules").status).toBe("infeasible");
    expect(f.base.snapshot()).toEqual(before);
  });

  it("reports bounded search exhaustion separately and does not commit a provisional plan", () => {
    const f = fixture([glyph("æ", "a"), glyph("f", "ph")], Array.from({ length: 9000 }, () => glyph("f", "ph")), { writtenFormConstraints: { maxConsonantLetters: 1 } });
    const before = f.base.snapshot();
    expect(f.planner.apply(f.base, f.choices, "base-before-word-rules")).toMatchObject({ status: "infeasible", reason: "search-budget", visitedAssignments: 8192 });
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

  it("resolves complete source units after an authenticated coverage repair", () => {
    const f = fixture([glyph("æ", "a"), glyph("f", "ph")], [glyph("f", "f")], { writtenFormConstraints: { maxConsonantLetters: 1 } });
    expect(f.planner.apply(f.base, f.choices, "base-before-word-rules").status).toBe("respell");
    expect(verifyBaseSpellingEvidence(f.base.snapshot(), f.config)).toMatchObject({ verifiedCertificates: 1 });
    expect(resolveConstructionSpan(f.base.constructionState(), [0, 1])).toMatchObject({ status: "complete", before: "af",
      phoneIds: [0, 1], sourcePartIds: [0, 0], phonemes: [{ sound: "æ" }, { sound: "f" }] });
    const forged = structuredClone(f.base.constructionState());
    forged.certificates[0].replacements[0].phoneIds = [99];
    expect(resolveConstructionSpan(forged, [0, 1])).toEqual({ status: "refused", reason: "missing-license" });
  });

  it("checks a neighboring reading from a replayed whole-unit repair certificate", () => {
    const f = fixture([glyph("æ", "a"), glyph("f", "ph"), glyph("k", "k"), glyph("s", "s")], [glyph("f", "f")],
      { writtenFormConstraints: { maxConsonantLetters: 3 } });
    expect(f.planner.apply(f.base, f.choices, "base-before-word-rules").status).toBe("respell");
    expect(verifyBaseSpellingEvidence(f.base.snapshot(), f.config)).toMatchObject({ verifiedCertificates: 1 });
    expect(createConstructionNeighborGuard(f.config)(f.base.constructionState(), [2, 3], "x")).toMatchObject({ status: "preserved",
      checks: [{ unitId: 1, form: "f", reading: { kind: "single-phone" }, before: { nextLetter: "k" }, after: { nextLetter: "x" } }],
      unchangedContextUnitIds: [0] });
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
    const word = generateWord({ seed: 11420, morphology: true, trace: true });
    expect(word.written.hyphenated).toBe(word.written.clean);
    expect(word.trace!.spellingBudgets!.find(outcome => outcome.scope === "final-morphology"))
      .toMatchObject({ status: "infeasible", reason: "unresolved-ownership" });
    const realization = word.trace!.morphology!.realization!;
    expect(realization.emittedParts).toEqual(realization.assembledParts);
    expect(realization.emittedParts.map(part => part.text).join("")).toBe(word.written.clean);
  });

  it("replays the same floating-point accumulation order at the seed-23656 witness", () => {
    const word = generateWord({ seed: 23656, mode: "lexicon", trace: true });
    expect(word.written.clean.length).toBeGreaterThan(0);
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
