import { describe, expect, it, vi } from "vitest";
import { createGenerator, englishConfig, TraceCollector } from "../index.js";
import type { LanguageConfig } from "../config/language.js";
import type { Phoneme, Syllable, Word, WordGenerationContext } from "../types.js";
import { findExample } from "../test-support/find-example.js";
import {
  assertRootRimeCompatibility, buildOnsetRimeBans, excludedAfterOnset, isNucleusCompatibleWithOnset,
} from "./rime-compatibility.js";
import { repairRootNuclei, repairStressedNuclei } from "./nucleus-repair.js";

// Issue #497: an onset ending in /r/ before an r-coloured rime (drur /drɚ/,
// trurlu /trɚ.lu/, brerts /brɛrts/). In CMU (first pronunciations, stratified
// by syllable count) it is about 0.19% of words, nearly all word-final
// (terror, mirror, rear, roar). Before this rule the generator produced it in
// 3.1% of words, ×17, and ×26 inside words.

const RHOTIC = new Set(["ɚ", "ɝ"]);
type Shape = { onset: readonly { sound: string }[]; nucleus: readonly { sound: string }[]; coda: readonly { sound: string }[] };
type Kind = "nucleus" | "coda";

/** Each syllable whose onset ends in /r/ and whose rime is /ɚ/ or holds a coda /r/. */
function onsetRhoticRimes(syllables: readonly Shape[]): Kind[] {
  const found: Kind[] = [];
  for (const syllable of syllables) {
    if (syllable.onset.at(-1)?.sound !== "r") continue;
    if (syllable.nucleus.some(p => RHOTIC.has(p.sound))) found.push("nucleus");
    if (syllable.coda.some(p => p.sound === "r")) found.push("coda");
  }
  return found;
}

/** English without the #497 rule: the generator's behavior before the fix. */
function withoutOnsetRimeRule(): LanguageConfig {
  return { ...englishConfig, codaConstraints: { ...englishConfig.codaConstraints, bannedOnsetRimeCombinations: undefined } };
}

const phone = (sound: string): Phoneme => englishConfig.phonemes.find(p => p.sound === sound)!;
const schwa = { ...phone("ə"), nucleus: 1, startWord: 1, midWord: 1, endWord: 1 };
const rhotic = { ...phone("ɚ"), nucleus: 10, startWord: 1, midWord: 1, endWord: 1 };
const goose = { ...phone("u"), nucleus: 2, startWord: 1, midWord: 1, endWord: 1 };
const bans = buildOnsetRimeBans(englishConfig.codaConstraints!.bannedOnsetRimeCombinations);
const rimes = { onsetRime: bans };
const stress = englishConfig.pronunciation.stress;
const repairPolicy = (phonemes: Phoneme[]) => ({ phonemes, stress, rimes, forbidOpenCheckedFinal: false });
function syllable(onset: string[], nucleus: Phoneme, coda: string[] = []): Syllable {
  return { onset: onset.map(phone), nucleus: [nucleus], coda: coda.map(phone), stress: "ˈ" };
}
function repairContext(syllables: Syllable[]): WordGenerationContext {
  return { syllableCount: syllables.length, currSyllableIndex: 0, rand: vi.fn(() => 0), trace: new TraceCollector(),
    word: { syllables, written: { clean: "", hyphenated: "" }, pronunciation: "" } };
}

describe("onset /r/ before an r-coloured rime (#497)", () => {
  it("indexes the English rule by the onset's last sound", () => {
    expect(bans).toEqual({
      nucleus: new Map([["r", new Set(["ɚ", "ɝ"])]]),
      coda: new Map([["r", new Set(["r"])]]),
    });
    expect(buildOnsetRimeBans([{ onsetFinal: ["r"], coda: ["r"] }])).toEqual({ nucleus: undefined, coda: new Map([["r", new Set(["r"])]]) });
    expect(buildOnsetRimeBans([{ onsetFinal: ["r"] }])).toBeUndefined();
    expect(buildOnsetRimeBans(undefined)).toBeUndefined();
  });

  it("applies to every onset ending in /r/, and only those", () => {
    for (const onset of [["r"], ["d", "r"], ["s", "t", "r"]]) {
      expect(isNucleusCompatibleWithOnset("ɚ", onset.map(phone), bans), onset.join("")).toBe(false);
      expect(excludedAfterOnset(onset.map(phone), "coda", bans)).toEqual(new Set(["r"]));
    }
    expect(isNucleusCompatibleWithOnset("ɚ", [phone("d")], bans)).toBe(true);
    expect(isNucleusCompatibleWithOnset("ɚ", [], bans)).toBe(true);
    expect(isNucleusCompatibleWithOnset("u", [phone("r")], bans)).toBe(true);
    expect(excludedAfterOnset([phone("r"), phone("w")], "coda", bans)).toBeUndefined();
  });

  it("rejects either shape in a lexical root", () => {
    expect(() => assertRootRimeCompatibility([syllable(["d", "r"], rhotic)], rimes))
      .toThrow(/onset\/rime pair \/r\/ \+ \/ɚ\/ at syllable 0/);
    expect(() => assertRootRimeCompatibility([syllable(["k"], goose), syllable(["b", "r"], schwa, ["r", "t"])], rimes))
      .toThrow(/onset\/rime pair \/r\/ \+ \/r\/ at syllable 1/);
    expect(() => assertRootRimeCompatibility([syllable(["d", "r"], goose, ["t"])], rimes)).not.toThrow();
    expect(() => assertRootRimeCompatibility([syllable(["d", "r"], rhotic)], {})).not.toThrow();
  });

  it("keeps stress and edge repairs from choosing /ɚ/ after an /r/ onset", () => {
    const stressed = repairContext([syllable(["d", "r"], schwa)]);
    repairStressedNuclei(stressed, repairPolicy([rhotic, goose]));
    expect(stressed.word.syllables[0].nucleus[0].sound).toBe("u");
    expect(stressed.trace!.repairs[0].nucleusReplacement).toMatchObject({ positivePairExclusions: 1 });

    const edgeSource = { ...schwa, nucleusWordPosition: { initial: 1, medial: 0, final: 1 } };
    // A medial /rə/ whose nucleus is barred word-medially must be re-picked.
    const edged = repairContext([syllable(["k"], goose), syllable(["r"], edgeSource), syllable(["k"], goose)]);
    edged.word.syllables[1].stress = undefined;
    repairRootNuclei(edged, repairPolicy([rhotic, goose]));
    expect(edged.word.syllables[1].nucleus[0].sound).toBe("u");
  });

  it("leaves affix syllables to the copied-back root repair unconstrained", () => {
    // Root syllable 0 is retained; syllable 1 is a suffix whose onset is /r/.
    const context = repairContext([syllable(["k"], goose), syllable(["r"], schwa)]);
    context.word.syllables[0].stress = undefined;
    repairStressedNuclei(context, repairPolicy([rhotic]), { syllables: [syllable(["k"], goose)], start: 0 });
    expect(context.word.syllables[1].nucleus[0].sound).toBe("ɚ");
  });

  it("finds each shape in the unconstrained generator, and English avoids it at that seed", () => {
    const unconstrained = createGenerator(withoutOnsetRimeRule());
    const english = createGenerator(englishConfig);
    for (const kind of ["nucleus", "coda"] as const) {
      const example = findExample(word => onsetRhoticRimes(word.syllables).includes(kind), {
        property: `an /r/-final onset before ${kind === "nucleus" ? "/ɚ/" : "a coda /r/"}`,
        generator: unconstrained,
        options: { morphology: false },
        limit: 500,
      });
      const fixed = english.generateWord(example.options);
      expect(onsetRhoticRimes(fixed.syllables), `${example.word.pronunciation} -> ${fixed.pronunciation}`).toEqual([]);
      for (const stage of fixed.trace!.stages) expect(onsetRhoticRimes(stage.after), stage.name).toEqual([]);
    }
  });

  it("removes the shape from roots and keeps finished words under the CMU rate", () => {
    const count = 10_000;
    const sample = (config: LanguageConfig): Word[] => {
      const generator = createGenerator(config);
      // Pair each draw so an earlier word's RNG consumption cannot shift the later comparisons.
      return Array.from({ length: count }, (_, index) => generator.generateWord({ seed: 497 + index }));
    };
    const summarize = (words: Word[]) => {
      let roots = 0, finished = 0, phones = 0, rhotics = 0, rs = 0;
      for (const word of words) {
        if (onsetRhoticRimes(word.lexical!.root).length > 0) roots++;
        if (onsetRhoticRimes(word.syllables).length > 0) finished++;
        for (const s of word.syllables) {
          for (const p of [...s.onset, ...s.nucleus, ...s.coda]) {
            phones++;
            if (RHOTIC.has(p.sound)) rhotics++;
            if (p.sound === "r") rs++;
          }
        }
      }
      return { roots, finished, rhotic: rhotics / phones, r: rs / phones };
    };
    const fixed = summarize(sample(englishConfig));
    const before = summarize(sample(withoutOnsetRimeRule()));
    console.log(`  onset /r/ + rhotic rime: roots ${before.roots} -> ${fixed.roots}, finished ${before.finished} -> ${fixed.finished} of ${count}; `
      + `rhotic share ${before.rhotic.toFixed(4)} -> ${fixed.rhotic.toFixed(4)}; r share ${before.r.toFixed(4)} -> ${fixed.r.toFixed(4)}`);

    // Before the fix about 3% of words had the shape.
    expect(before.finished / count).toBeGreaterThan(0.015);
    expect(fixed.roots).toBe(0);
    // CMU: about 0.19% of words. Only affix joins can still form it.
    expect(fixed.finished / count).toBeLessThan(0.0019);
    // The excluded /ɚ/ and /r/ phones go to other choices; neither share collapses.
    expect(fixed.rhotic / before.rhotic).toBeGreaterThan(0.85);
    expect(fixed.r / before.r).toBeGreaterThan(0.93);
  });
});
