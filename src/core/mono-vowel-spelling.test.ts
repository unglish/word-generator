import { describe, expect, it } from "vitest";
import { createGenerator, englishConfig, createSeededRng } from "../index.js";
import type { LanguageConfig, Phoneme } from "../types.js";

const SEEDS = [42, 43, 44] as const;
const PER_SEED = 4_000;

function ungated(): LanguageConfig {
  return {
    ...englishConfig,
    syllableStructure: {
      ...englishConfig.syllableStructure,
      letterLengthTargets: undefined,
    },
  };
}

function soundOf(p: string | Phoneme): string {
  return typeof p === "string" ? p : p.sound;
}

describe("monosyllable vowel spelling distribution (#450)", () => {
  it("keeps /ɛ/ /ɔ/ /ʊ/ /eɪ/ form shares in band and bounds aw before clusters", () => {
    const gen = createGenerator(ungated());
    const byPhoneForm: Record<string, Record<string, number>> = {};
    let awCluster = 0;
    let awTotal = 0;

    for (const seed of SEEDS) {
      const rand = createSeededRng(seed);
      let kept = 0;
      let draws = 0;
      while (kept < PER_SEED && draws < PER_SEED * 40) {
        draws++;
        const word = gen.generateWord({
          rand,
          mode: "lexicon",
          morphology: false,
          trace: true,
        });
        if (word.syllables.length !== 1) continue;
        kept++;
        const syl = word.syllables[0];
        const sels = word.trace!.graphemeSelections;
        let si = syl.onset.length;
        for (const raw of syl.nucleus) {
          const phone = soundOf(raw);
          const form = (sels[si]?.emitted || sels[si]?.selected || "").toLowerCase();
          si++;
          if (!form) continue;
          byPhoneForm[phone] ??= {};
          byPhoneForm[phone][form] = (byPhoneForm[phone][form] ?? 0) + 1;
          if (phone === "ɔ" && form === "aw") {
            awTotal++;
            if (syl.coda.length >= 2) awCluster++;
          }
        }
      }
      expect(kept).toBe(PER_SEED);
    }

    function share(phone: string, form: string): number {
      const row = byPhoneForm[phone] ?? {};
      const n = Object.values(row).reduce((a, b) => a + b, 0) || 1;
      return (row[form] ?? 0) / n;
    }

    // Comparator-ish bands (isolated-weight lever; not exact CMU).
    expect(share("ɛ", "ea")).toBeGreaterThan(0.05);
    expect(share("ɛ", "ea")).toBeLessThan(0.20);
    expect(share("ʊ", "oo")).toBeGreaterThan(0.45);
    expect(share("ʊ", "oo")).toBeLessThan(0.80);
    expect(share("ɔ", "aw")).toBeGreaterThan(0.05);
    expect(share("ɔ", "aw")).toBeLessThan(0.40);
    expect(share("eɪ", "ai")).toBeGreaterThan(0.10);
    // /aɪ/ "ai" must stay unlicensed on monos.
    expect(share("aɪ", "ai")).toBe(0);
    // Upper bound: aw before consonant clusters (comparator ~0%).
    expect(awTotal).toBeGreaterThan(0);
    expect(awCluster / awTotal).toBeLessThan(0.35);
  });
});
