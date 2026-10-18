import { describe, expect, it } from "vitest";
import { createGenerator, createSeededRng, generateWord, englishConfig } from "../index.js";
import type { Phoneme, Syllable, WordGenerationContext } from "../types.js";
import { resolveAspirationRules } from "../config/language.js";
import { assertFinalVowelAllowed, repairFinalCheckedVowel, resolveFinalVowels } from "./final-vowel.js";
import { generatePronunciation } from "./pronounce.js";
import { replayFinalNuclei } from "./final-nucleus-evidence.js";
import { verifyWordPronunciation } from "./pronunciation-evidence.js";

const checked = resolveFinalVowels(englishConfig.finalNucleus);
const phone = (sound: string): Phoneme => ({ ...englishConfig.phonemeMaps.nucleus.get(sound)![0] });
const syllable = (sound: string, stress?: Syllable["stress"]): Syllable => ({ onset: [], nucleus: [phone(sound)], coda: [], ...(stress ? { stress } : {}) });
const context = (syllables: Syllable[], rand: () => number): WordGenerationContext => ({
  word: { syllables, written: { clean: "", hyphenated: "" }, pronunciation: "" }, rand,
  syllableCount: syllables.length, currSyllableIndex: 0,
});
const stress = englishConfig.pronunciation.stress;
const pool = [phone("ɪ"), phone("ə"), phone("i:"), phone("u")];

function repair(ctx: WordGenerationContext, root = structuredClone(ctx.word.syllables), rootStart = 0, candidates = pool) {
  repairFinalCheckedVowel(ctx, root, rootStart, ctx.word.syllables.map(s => [...s.nucleus]), candidates, stress, checked);
}

describe("configured final checked vowels", () => {
  it("does not classify FOOT by its tense metadata or schwa by its lax metadata", () => {
    expect(phone("ʊ").tense).toBe(true);
    expect(() => assertFinalVowelAllowed([syllable("ʊ")], checked)).toThrow();
    expect(() => assertFinalVowelAllowed([syllable("ə")], checked)).not.toThrow();
    expect(() => assertFinalVowelAllowed([syllable("ɑ")], checked)).not.toThrow();
    expect(resolveFinalVowels()).toEqual(new Set());
    expect(() => resolveFinalVowels({ checkedVowels: [{ sound: "ɪ" }, { sound: "ɪ" }] })).toThrow();
  });

  it("retains closed checked nuclei and internal open nuclei without drawing", () => {
    const closed = syllable("ɪ", "ˈ"); closed.coda = [{ ...englishConfig.phonemeMaps.coda.get("t")![0] }];
    for (const syllables of [[closed], [syllable("ɪ", "ˈ"), syllable("i:")]]) {
      const ctx = context(syllables, () => { throw new Error("unexpected draw"); });
      const before = structuredClone(syllables); repair(ctx);
      expect(ctx.word.syllables).toEqual(before);
    }
  });

  it("repairs all stress categories and uses legal weighted final candidates", () => {
    for (const stressMark of ["ˈ", "ˌ", undefined] as const) {
      const ctx = context([syllable("ʊ", stressMark)], () => 0.999999); repair(ctx);
      expect(ctx.word.syllables[0].nucleus[0].sound).toBe("u");
      expect(() => assertFinalVowelAllowed(ctx.word.syllables, checked)).not.toThrow();
    }
    const ctx = context([syllable("ɪ", "ˈ")], () => 0); repair(ctx);
    expect(ctx.word.syllables[0].nucleus[0].sound).toBe("i:");
    expect(() => repair(context([syllable("ɪ", "ˈ")], () => 0), undefined, 0, [phone("ɪ"), phone("ə")])).toThrow("No eligible");
  });

  it("rejects invalid affix and derived-root endings without inventing an allomorph", () => {
    const affixed = context([syllable("i:"), syllable("ɪ")], () => 0);
    expect(() => repair(affixed, [syllable("i:")])).toThrow("affix or derived alternation");
    expect(affixed.word.syllables[1].nucleus[0].sound).toBe("ɪ");
    const derived = context([syllable("ɪ")], () => 0);
    expect(() => repair(derived, [syllable("i:")])).toThrow("affix or derived alternation");
  });

  it("preserves resolved suffix phones and explicitly rejects an illegal declared suffix", () => {
    const weights = { bare: 0, prefixed: 0, suffixed: 1, both: 0 };
    const suffix = englishConfig.morphology!.suffixes.find(affix => affix.written === "ly")!;
    const config = { ...englishConfig, morphology: { ...englishConfig.morphology!, suffixes: [suffix],
      templateWeights: { text: weights, lexicon: weights } } };
    const legal = createGenerator(config);
    for (let seed = 0; seed < 25; seed++) {
      const word = legal.generateWord({ seed, morphology: true, syllableCount: 3, trace: true });
      expect(word.syllables.at(-1)!.nucleus[0].sound).toBe("i:");
      expect(() => verifyWordPronunciation(word, config)).not.toThrow();
    }
    const invalid = createGenerator({ ...config, morphology: { ...config.morphology,
      suffixes: [{ ...suffix, phonemes: ["l", "ɪ"], syllables: [{ onset: ["l"], nucleus: ["ɪ"], coda: [] }] }] } });
    for (const trace of [false, true]) {
      expect(() => invalid.generateWord({ seed: 42, morphology: true, syllableCount: 3, trace })).toThrow("affix or derived alternation");
    }
  });

  it("blocks illegal surface reductions while retaining the same reduction in a closed syllable", () => {
    const runtime = { aspiration: resolveAspirationRules({ ...englishConfig.pronunciation.aspiration, enabled: false }),
      finalVowels: resolveFinalVowels({ checkedVowels: [{ sound: "ɪ" }] }), vowelReduction: { enabled: true, rules: [{ source: "ɛ", target: "ɪ", probability: 100 }] } };
    const open = context([syllable("ɑ", "ˈ"), syllable("ɛ")], () => { throw new Error("ineligible reduction must not draw"); });
    generatePronunciation(open, runtime);
    expect(open.word.syllables[1].nucleus[0].sound).toBe("ɛ");
    let draws = 0;
    const closed = context([syllable("ɑ", "ˈ"), syllable("ɛ")], () => { draws++; return 0; });
    closed.word.syllables[1].coda = [{ ...englishConfig.phonemeMaps.coda.get("t")![0] }];
    generatePronunciation(closed, runtime);
    expect(closed.word.syllables[1].nucleus[0].sound).toBe("ɪ");
    expect(draws).toBe(1);
  });

  it("preserves trace-on/off output and RNG boundaries and replays repaired source ownership", () => {
    let repaired = 0;
    for (const mode of ["text", "lexicon"] as const) for (const morphology of [false, true]) {
      const tracedRng = createSeededRng(42); const plainRng = createSeededRng(42);
      for (let index = 0; index < 250; index++) {
        const word = generateWord({ rand: tracedRng, mode, morphology, trace: true });
        const plain = generateWord({ rand: plainRng, mode, morphology });
        const { trace, ...withoutTrace } = word;
        expect(plain).toEqual(withoutTrace);
        const last = word.syllables.at(-1)!;
        expect(last.coda.length > 0 || !["ɪ", "ɛ", "æ", "ʌ", "ʊ"].includes(last.nucleus.at(-1)!.sound)).toBe(true);
        if (trace!.finalNucleus!.repairs.some(r => r.rule === "repairFinalCheckedVowel")) {
          repaired++;
          expect(word.lexical!.root).toEqual(trace!.writerInput);
          expect(() => replayFinalNuclei(JSON.parse(JSON.stringify(word)), englishConfig)).not.toThrow();
          expect(() => verifyWordPronunciation(JSON.parse(JSON.stringify(word)), englishConfig)).not.toThrow();
        }
      }
      expect(tracedRng()).toBe(plainRng());
    }
    expect(repaired).toBeGreaterThan(0);
  }, 60000);
});
