import { describe, expect, it } from "vitest";
import { generateWord } from "../index.js";
import {
  narrowIpaProfile,
  phonesFromWord,
  toNarrowIpa,
  toNarrowPhones,
  toNarrowPronunciation,
} from "./narrow-ipa.js";
import type { NarrowPhoneIn } from "./narrow-ipa.js";

const profile = narrowIpaProfile();

describe("narrowIpaProfile chimera-english-v1", () => {
  it("exposes the documented defaults and remaps", () => {
    expect(profile.id).toBe("chimera-english-v1");
    expect(profile.defaults).toEqual({ stripFleeceLength: true, darkL: false });
    expect(profile.remaps.map((r) => [r.from, r.to, r.when ?? null])).toEqual([
      ["r", "ɹ", null],
      ["əʊ", "oʊ", null],
      ["ɜ", "ɝ", null],
      ["ɡ", "g", null],
      ["i:", "i", "stripFleeceLength"],
      ["iː", "i", "stripFleeceLength"],
    ]);
  });

  it("table-drives every unconditional remap through toNarrowIpa", () => {
    for (const remap of profile.remaps) {
      if (remap.when) continue;
      expect(toNarrowIpa(remap.from)).toBe(remap.to);
    }
  });
});

describe("toNarrowIpa", () => {
  it.each([
    ["brɪŋz", "bɹɪŋz"],
    ["bəʊt", "boʊt"],
    ["rɜnd", "ɹɝnd"],
    ["swɜnd", "swɝnd"],
    ["ˈbrəl.ʃən", "ˈbɹəl.ʃən"],
    ["dræl", "dɹæl"],
    ["pʰrær", "pʰɹæɹ"],
    ["bi:t", "bit"],
    ["biːt", "bit"],
    ["ɡoʊ", "goʊ"],
  ])("%s → %s", (broad, narrow) => {
    expect(toNarrowIpa(broad)).toBe(narrow);
  });

  it("is idempotent on already-narrow input", () => {
    const narrow = "ˈbɹɝl.ʃən oʊ ɝ ɫ ɹ";
    expect(toNarrowIpa(narrow)).toBe(narrow);
    expect(toNarrowIpa(toNarrowIpa("rɜnd əʊ brɪ"))).toBe(
      toNarrowIpa("rɜnd əʊ brɪ"),
    );
  });

  it("preserves stress, syllable dots, and aspiration marks", () => {
    expect(toNarrowIpa("ˌənˈsɜn")).toBe("ˌənˈsɝn");
    expect(toNarrowIpa("pʰæt")).toBe("pʰæt");
    expect(toNarrowIpa("ˈək.ə.rɑŋ")).toBe("ˈək.ə.ɹɑŋ");
  });

  it("leaves unknown symbols unchanged and never deletes", () => {
    expect(toNarrowIpa("χaɪ")).toBe("χaɪ");
    expect(toNarrowIpa("aʔə")).toBe("aʔə");
  });

  it("returns empty for empty / whitespace", () => {
    expect(toNarrowIpa("")).toBe("");
    expect(toNarrowIpa("   ")).toBe("");
  });

  it("keeps FLEECE length when stripFleeceLength is false", () => {
    expect(toNarrowIpa("bi:t", { stripFleeceLength: false })).toBe("bi:t");
    expect(toNarrowIpa("biːt", { stripFleeceLength: false })).toBe("biːt");
  });

  it("does not guess darkL from raw strings", () => {
    expect(toNarrowIpa("fil", { darkL: true })).toBe("fil");
    expect(toNarrowIpa("fɪl", { darkL: true })).toBe("fɪl");
  });
});

describe("toNarrowPhones + phonesFromWord", () => {
  it("maps slots and preserves aspiration flags", () => {
    const input: NarrowPhoneIn[] = [
      { sound: "p", aspirated: true, slot: "onset" },
      { sound: "r", slot: "onset" },
      { sound: "æ", slot: "nucleus" },
      { sound: "r", slot: "coda" },
    ];
    expect(toNarrowPhones(input)).toEqual([
      { sound: "p", aspirated: true },
      { sound: "ɹ", aspirated: undefined },
      { sound: "æ", aspirated: undefined },
      { sound: "ɹ", aspirated: undefined },
    ]);
  });

  it("applies darkL only to coda /l/ when enabled", () => {
    const phones: NarrowPhoneIn[] = [
      { sound: "l", slot: "onset" },
      { sound: "ɪ", slot: "nucleus" },
      { sound: "l", slot: "coda", syllableFinal: true },
    ];
    expect(toNarrowPhones(phones)).toEqual([
      { sound: "l", aspirated: undefined },
      { sound: "ɪ", aspirated: undefined },
      { sound: "l", aspirated: undefined },
    ]);
    expect(toNarrowPhones(phones, { darkL: true }).map((p) => p.sound)).toEqual(
      ["l", "ɪ", "ɫ"],
    );
  });

  it("phonesFromWord tags slots for darkL", () => {
    const word = {
      syllables: [
        {
          onset: [{ sound: "f" }],
          nucleus: [{ sound: "ɪ" }],
          coda: [{ sound: "l" }],
          stress: "ˈ" as const,
        },
      ],
    };
    const phones = phonesFromWord(word);
    expect(phones.map((p) => [p.sound, p.slot, p.syllableFinal])).toEqual([
      ["f", "onset", false],
      ["ɪ", "nucleus", false],
      ["l", "coda", true],
    ]);
    expect(toNarrowPronunciation(word, { darkL: true })).toBe("fɪɫ");
    expect(toNarrowPronunciation(word)).toBe("fɪl");
  });

  it("toNarrowPronunciation mirrors guide stress/dot/ʰ rules", () => {
    const word = {
      syllables: [
        {
          onset: [{ sound: "b" }, { sound: "r" }],
          nucleus: [{ sound: "ə" }],
          coda: [{ sound: "l" }],
          stress: "ˈ" as const,
        },
        {
          onset: [{ sound: "ʃ" }],
          nucleus: [{ sound: "ə" }],
          coda: [{ sound: "n" }],
        },
      ],
    };
    expect(toNarrowPronunciation(word)).toBe("ˈbɹəl.ʃən");
    expect(
      toNarrowPronunciation({
        syllables: [
          {
            onset: [{ sound: "p", aspirated: true }, { sound: "r" }],
            nucleus: [{ sound: "æ" }],
            coda: [{ sound: "r" }],
          },
        ],
      }),
    ).toBe("pʰɹæɹ");
  });
});

describe("generateWord round-trip (known keys only)", () => {
  it("only changes documented remap keys across a fixed seed sample", () => {
    const unconditional = new Map(
      profile.remaps.filter((r) => !r.when).map((r) => [r.from, r.to]),
    );
    const lengthKeys = new Set(
      profile.remaps
        .filter((r) => r.when === "stripFleeceLength")
        .map((r) => r.from),
    );

    for (let seed = 1; seed <= 80; seed++) {
      const word = generateWord({ seed, morphology: true });
      const broad = word.pronunciation;
      const narrow = toNarrowPronunciation(word);
      expect(toNarrowIpa(broad)).toBe(narrow);

      const fromPhones = phonesFromWord(word);
      const mapped = toNarrowPhones(fromPhones);
      fromPhones.forEach((phone, i) => {
        if (phone.sound === mapped[i].sound) return;
        if (unconditional.get(phone.sound) === mapped[i].sound) return;
        if (lengthKeys.has(phone.sound) && mapped[i].sound === "i") return;
        throw new Error(
          `unexpected remap ${phone.sound}→${mapped[i].sound} seed=${seed}`,
        );
      });
    }
  });
});
