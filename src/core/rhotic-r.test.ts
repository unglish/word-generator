import { describe, expect, it, vi } from "vitest";
import { createGenerator, createSeededRng, englishConfig, TraceCollector } from "../index.js";
import type { LanguageConfig } from "../config/language.js";
import type { Phoneme, Syllable, Word, WordGenerationContext } from "../types.js";
import { findExample, searchSeeds } from "../test-support/find-example.js";
import {
  assertRootRimeCompatibility, buildBannedNucleusPairs, isNucleusCompatibleWithFollowingOnset,
} from "./rime-compatibility.js";
import { repairStressedNuclei } from "./stress-repair.js";
import { repairNucleusWordPositions } from "./nucleus-position.js";

// Issue #410: English has no /ɚ/ (or /ɝ/) directly followed by /r/ inside a
// root. CMU has ER + R only across affix and compound joins (overrule,
// interracial); root-internally the /r/ merges into the vowel (stirring
// /ɚ ɪ ŋ/, furry /ɚ i/).

const RHOTIC = new Set(["ɚ", "ɝ"]);
type Shape = { onset: readonly { sound: string }[]; nucleus: readonly { sound: string }[]; coda: readonly { sound: string }[] };

/** Each place a rhotic nucleus is directly followed by /r/, as its coda or as the next onset. */
function rhoticR(syllables: readonly Shape[]): Array<"coda" | "onset"> {
  const found: Array<"coda" | "onset"> = [];
  syllables.forEach((syllable, index) => {
    if (!RHOTIC.has(syllable.nucleus.at(-1)?.sound ?? "")) return;
    if (syllable.coda.length > 0) {
      if (syllable.coda[0].sound === "r") found.push("coda");
    } else if (syllables[index + 1]?.onset[0]?.sound === "r") {
      found.push("onset");
    }
  });
  return found;
}

/** English with the #410 rule removed: the generator's behavior before the fix. */
function withoutRhoticRRule(): LanguageConfig {
  return {
    ...englishConfig,
    codaConstraints: {
      ...englishConfig.codaConstraints,
      bannedNucleusCodaCombinations: englishConfig.codaConstraints!.bannedNucleusCodaCombinations!
        .filter(rule => !rule.coda.includes("r")),
    },
  };
}

const phone = (sound: string): Phoneme => englishConfig.phonemes.find(p => p.sound === sound)!;
const schwa = { ...phone("ə"), nucleus: 1, startWord: 1, midWord: 1, endWord: 1 };
const rhotic = { ...phone("ɚ"), nucleus: 10, startWord: 1, midWord: 1, endWord: 1 };
const goose = { ...phone("u"), nucleus: 2, startWord: 1, midWord: 1, endWord: 1 };
const codaPairs = buildBannedNucleusPairs(englishConfig.codaConstraints!.bannedNucleusCodaCombinations);
const onsetPairs = buildBannedNucleusPairs(englishConfig.codaConstraints!.bannedNucleusCodaCombinations, true);
const stress = englishConfig.pronunciation.stress;
function open(nucleus: Phoneme, onset: Phoneme[] = [phone("k")]): Syllable {
  return { onset, nucleus: [nucleus], coda: [], stress: "ˈ" };
}
function repairContext(syllables: Syllable[]): WordGenerationContext {
  return { syllableCount: syllables.length, currSyllableIndex: 0, rand: vi.fn(() => 0), trace: new TraceCollector(),
    word: { syllables, written: { clean: "", hyphenated: "" }, pronunciation: "" } };
}

describe("rhotic vowel + /r/ (#410)", () => {
  it("indexes only the rules flagged for the following onset", () => {
    expect(onsetPairs).toEqual(new Map([["ɚ", new Set(["r"])], ["ɝ", new Set(["r"])]]));
    expect(codaPairs!.get("ɚ")).toEqual(new Set(["ŋ", "r"]));
    expect(buildBannedNucleusPairs([{ nucleus: ["ɚ"], coda: ["ŋ"] }], true)).toBeUndefined();
  });

  it("checks the next onset only after an open syllable", () => {
    expect(isNucleusCompatibleWithFollowingOnset("ɚ", [], [phone("r")], onsetPairs)).toBe(false);
    expect(isNucleusCompatibleWithFollowingOnset("ɚ", [], [phone("t"), phone("r")], onsetPairs)).toBe(true);
    expect(isNucleusCompatibleWithFollowingOnset("ɚ", [phone("t")], [phone("r")], onsetPairs)).toBe(true);
    expect(isNucleusCompatibleWithFollowingOnset("ɚ", [], undefined, onsetPairs)).toBe(true);
    expect(isNucleusCompatibleWithFollowingOnset("ə", [], [phone("r")], onsetPairs)).toBe(true);
    expect(() => assertRootRimeCompatibility([open(rhotic), open(schwa, [phone("r")])], codaPairs, onsetPairs))
      .toThrow(/nucleus\/onset pair \/ɚ\/ \+ \/r\/ at syllables 0-1/);
    expect(() => assertRootRimeCompatibility([open(rhotic), open(schwa, [phone("r")])], codaPairs)).not.toThrow();
  });

  it("keeps stress and edge repairs from choosing a rhotic vowel before a root /r/ onset", () => {
    const stressed = repairContext([open(schwa), open(goose, [phone("r")])]);
    repairStressedNuclei(stressed, [rhotic, goose], stress, codaPairs, undefined, onsetPairs);
    expect(stressed.word.syllables[0].nucleus[0].sound).toBe("u");
    expect(stressed.trace!.repairs[0].nucleusReplacement).toMatchObject({ positivePairExclusions: 1 });

    const edgeSource = { ...schwa, nucleusWordPosition: { initial: 1, medial: 0, final: 1 } };
    const edged = repairContext([open(edgeSource), open(goose, [phone("r")])]);
    repairNucleusWordPositions(edged, [rhotic, goose], stress, codaPairs, onsetPairs);
    expect(edged.word.syllables[0].nucleus[0].sound).toBe("u");
  });

  it("leaves affix joins to the copied-back root repair unconstrained", () => {
    // Root-final syllable 0 sits before suffix syllable 1, whose onset is /r/.
    const context = repairContext([open(schwa), open(goose, [phone("r")])]);
    const retained = open(schwa);
    repairStressedNuclei(context, [rhotic], stress, codaPairs, { syllables: [retained], start: 0 }, onsetPairs);
    expect(context.word.syllables[0].nucleus[0].sound).toBe("ɚ");
  });

  it("finds an /ɚ r/ root in the unconstrained generator, and English avoids it at that seed", () => {
    const unconstrained = createGenerator(withoutRhoticRRule());
    const english = createGenerator(englishConfig);
    for (const kind of ["coda", "onset"] as const) {
      const example = findExample(word => rhoticR(word.syllables).includes(kind), {
        property: `a rhotic vowel followed by /r/ in the ${kind}`,
        generator: unconstrained,
        options: { morphology: false },
        limit: 3000,
      });
      const fixed = english.generateWord(example.options);
      expect(rhoticR(fixed.syllables), `${example.word.pronunciation} -> ${fixed.pronunciation}`).toEqual([]);
      for (const stage of fixed.trace!.stages) expect(rhoticR(stage.after), stage.name).toEqual([]);
    }
  });

  it("still allows /ɚ r/ across a prefix join (overrule)", () => {
    const templates = { bare: 0, prefixed: 1, suffixed: 0, both: 0 };
    const generator = createGenerator({
      ...englishConfig,
      morphology: { ...englishConfig.morphology!,
        prefixes: englishConfig.morphology!.prefixes.filter(affix => affix.written === "over"),
        templateWeights: { text: templates, lexicon: templates },
      },
    });
    const word = searchSeeds({ property: "over- before an /r/-initial root", limit: 1000 }, seed => {
      const candidate = generator.generateWord({ seed, morphology: true });
      return rhoticR(candidate.syllables).includes("onset") ? candidate : undefined;
    });
    const rootStart = word.lexical!.rootSyllableStart;
    expect(word.syllables[rootStart - 1].nucleus.at(-1)!.sound).toBe("ɚ");
    expect(word.syllables[rootStart].onset[0].sound).toBe("r");
    expect(rhoticR(word.lexical!.root)).toEqual([]);
  });

  it("removes root-internal /ɚ r/ while keeping /ɚ/ at its rate", () => {
    const count = 10_000;
    const sample = (config: LanguageConfig): Word[] => {
      const generator = createGenerator(config), rand = createSeededRng(410);
      return Array.from({ length: count }, () => generator.generateWord({ rand }));
    };
    const shares = (words: Word[]) => {
      let phones = 0, rhotics = 0, rs = 0, hits = 0;
      for (const word of words) {
        if (rhoticR(word.lexical!.root).length > 0) hits++;
        for (const syllable of word.syllables) {
          for (const p of [...syllable.onset, ...syllable.nucleus, ...syllable.coda]) {
            phones++;
            if (RHOTIC.has(p.sound)) rhotics++;
            if (p.sound === "r") rs++;
          }
        }
      }
      return { hits, rhotic: rhotics / phones, r: rs / phones };
    };
    const fixed = shares(sample(englishConfig));
    const before = shares(sample(withoutRhoticRRule()));

    // Before the fix, about 1.2% of roots had the sequence.
    expect(before.hits / count).toBeGreaterThan(0.005);
    console.log(`  root /ɚ r/: ${before.hits} -> ${fixed.hits} of ${count}; rhotic share ${before.rhotic.toFixed(4)} -> ${fixed.rhotic.toFixed(4)}; r share ${before.r.toFixed(4)} -> ${fixed.r.toFixed(4)}`);
    expect(fixed.hits).toBe(0);
    // /ɚ/ is chosen before its coda and the following onset, so its rate holds.
    expect(Math.abs(fixed.rhotic / before.rhotic - 1)).toBeLessThan(0.05);
    // Only the merged /r/ phones disappear.
    expect(fixed.r / before.r).toBeGreaterThan(0.9);
  });
});
