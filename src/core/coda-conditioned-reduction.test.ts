import { describe, expect, it } from "vitest";
import { generateWord, generateWords } from "../index.js";
import type { Word } from "../types.js";
import type { SyllableSnapshot } from "./trace.js";
import { findExample } from "../test-support/find-example.js";

// #475. Unstressed /ɪ/ → /ə/ reduction ignored the following sound, so 30% of
// -ing words ended /əŋ/ (CMU: never) and /ɪ/ before velars, postalveolars and
// /v/ reduced far more than CMU does. English now blocks the rule before those
// codas and still applies elsewhere, e.g. before /z s d t/ (roses [ˈɹoʊzəz]).

const BLOCKED_CODAS = new Set(["ŋ", "k", "g", "ʃ", "tʃ", "dʒ", "v"]);
const KEPT_CODAS = new Set(["z", "s", "d", "t"]);

interface IhRime {
  syllableIndex: number;
  /** First consonant of the syllable's coda. */
  coda: string;
  /** Surface vowel after realization. */
  surface: string;
}

/** The lexical form handed to surface realization (before vowel reduction). */
function lexicalSyllables(word: Word): SyllableSnapshot[] {
  return word.trace!.stages.find((s) => s.name === "generatePronunciation")!.before;
}

/** Unstressed closed syllables whose lexical nucleus is /ɪ/, with their surface vowel. */
function unstressedIhRimes(word: Word): IhRime[] {
  return lexicalSyllables(word).flatMap((lexical, syllableIndex) => {
    const surface = word.syllables[syllableIndex];
    if (surface.stress || lexical.nucleus.join("") !== "ɪ" || !lexical.coda.length) return [];
    return [{ syllableIndex, coda: lexical.coda[0], surface: surface.nucleus.map((p) => p.sound).join("") }];
  });
}

const isIngWord = (word: Word): boolean => word.trace!.morphology?.suffix === "ing";

/** The -ing suffix rime: the final syllable of a word with the -ing suffix. */
function ingRime(word: Word): IhRime | undefined {
  if (!isIngWord(word)) return undefined;
  const last = word.syllables.length - 1;
  return unstressedIhRimes(word).find((r) => r.syllableIndex === last && r.coda === "ŋ");
}

describe("coda-conditioned /ɪ/ reduction (#475)", () => {
  it("keeps /ɪŋ/ in unstressed -ing suffixes", () => {
    // Twenty consecutive finds: before #475 about 30% of them ended /əŋ/.
    let firstSeed = 4_750_000;
    for (let found = 0; found < 20; found++) {
      const { seed, word } = findExample((w) => ingRime(w) !== undefined, {
        property: "an unstressed -ing suffix",
        limit: 2_000,
        firstSeed,
      });
      expect(word.written.clean).toMatch(/ing$/);
      expect(word.pronunciation, word.written.clean).toMatch(/ɪŋ$/);
      firstSeed = seed + 1;
    }
  });

  it("never reduces /ɪ/ before a blocked coda, but still does before /z s d t/, over a seeded sample", () => {
    let ingWords = 0;
    let blocked = 0;
    let kept = 0;
    let keptReduced = 0;
    for (const word of generateWords(8_000, { seed: 4750, trace: true })) {
      const ing = ingRime(word);
      if (ing) {
        ingWords++;
        expect(word.pronunciation, word.written.clean).toMatch(/ɪŋ$/);
      }
      for (const rime of unstressedIhRimes(word)) {
        const where = `${word.written.clean} /${word.pronunciation}/ syllable ${rime.syllableIndex}`;
        if (BLOCKED_CODAS.has(rime.coda)) {
          blocked++;
          expect(rime.surface, where).toBe("ɪ");
        } else if (KEPT_CODAS.has(rime.coda)) {
          kept++;
          if (rime.surface === "ə") keptReduced++;
        }
      }
    }
    expect(ingWords).toBeGreaterThan(100);
    expect(blocked).toBeGreaterThan(ingWords);
    // 45% × positional modifier (0.65–1.0) before /z s d t/: roughly a third reduce.
    expect(kept).toBeGreaterThan(300);
    expect(keptReduced / kept).toBeGreaterThan(0.2);
    expect(keptReduced / kept).toBeLessThan(0.5);
  });

  it("is deterministic and trace-neutral for a word with a blocked reduction", () => {
    const { seed } = findExample(
      (w) => ingRime(w) !== undefined && unstressedIhRimes(w).some((r) => KEPT_CODAS.has(r.coda)),
      { property: "an -ing word that also has /ɪ/ before /z s d t/", limit: 20_000, firstSeed: 4_750_000 },
    );
    const traced = generateWord({ seed, trace: true });
    const untraced = generateWord({ seed });
    expect(untraced.written.clean).toBe(traced.written.clean);
    expect(untraced.pronunciation).toBe(traced.pronunciation);
    expect(generateWord({ seed }).pronunciation).toBe(untraced.pronunciation);
  });
});
