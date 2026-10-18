import { describe, expect, it } from "vitest";
import { parseCmuPhone } from "../corpus/cmu.js";
import { FREQUENCY_PHONE_ALPHABET, fitFrequencyCounts, frequencyObservations, scoreFrequencyPopulation,
  scoreFrequencyWord, selectFrequencySmoothing, splitFrequencyObservations, validateFrequencyCounts,
  type FrequencyObservation } from "../corpus/frequency-model.js";

const entry = (spelling: string, raw: string[], count = 1): FrequencyObservation => {
  const phones = raw.map(phone => parseCmuPhone(phone)!);
  return { spelling, count, phones, syllableCount: phones.filter(phone => phone.kind === "vowel").length };
};
const training = [entry("a", ["AH0"], 9), entry("cat", ["K", "AE1", "T"], 1)];

describe("type and token citation counts", () => {
  it("counts each word and repeated phone with its declared weight, retaining vowel stress", () => {
    const types = fitFrequencyCounts(training, "types");
    const tokens = fitFrequencyCounts(training, "tokens");
    expect(types).toEqual({ version: "frequency-citation-counts-v1", weighting: "types", types: 2,
      wordMass: 2, phoneMass: 4, phones: { AH0: 1, K: 1, AE1: 1, T: 1 }, lengths: { 1: 1, 3: 1 },
      syllablesByLength: { 1: { 1: 1 }, 3: { 1: 1 } } });
    expect(tokens.wordMass).toBe(10);
    expect(tokens.phoneMass).toBe(12);
    expect(tokens.phones).toEqual({ AH0: 9, K: 1, AE1: 1, T: 1 });
    const repeated = fitFrequencyCounts([entry("repeat", ["AH0", "AH1", "AH0"], 2)], "tokens");
    expect(repeated.phones).toEqual({ AH0: 4, AH1: 2 });
    expect(repeated.syllablesByLength).toEqual({ 3: { 3: 2 } });
    expect(FREQUENCY_PHONE_ALPHABET).toHaveLength(69);
  });
  it("rejects duplicate, inconsistent or unsupported observations and unsafe accumulated mass", () => {
    for (const entries of [[], [training[0], training[0]], [{ ...training[0], count: 0 }],
      [{ ...training[0], count: 0.5 }], [{ ...training[0], syllableCount: 2 }],
      [{ ...training[0], phones: [{ kind: "vowel" as const, raw: "AH0", base: "AH", stress: 1 as const }] }],
      [entry("unsafe", ["AH0", "K"], Number.MAX_SAFE_INTEGER)]]) {
      expect(() => fitFrequencyCounts(entries, "tokens")).toThrow();
    }
  });
  it("detaches structured phones and rejects a cross-spelling pronunciation join", () => {
    const pronunciation = { line: 1, label: "a", spelling: "a", tokens: ["AH0"], phones: [parseCmuPhone("AH0")!] };
    const frequency = { line: 2, label: "A", spelling: "a", count: 10, lowercaseCount: 3 };
    const observed = frequencyObservations([{ frequency, pronunciation }]);
    pronunciation.phones[0].base = "changed";
    expect(observed[0].phones[0].base).toBe("AH");
    expect(() => frequencyObservations([{ frequency: { ...frequency, spelling: "the" }, pronunciation }])).toThrow(/mismatch/);
  });
  it("reconciles every conditional/count denominator and rejects corrupted model tables", () => {
    const model = fitFrequencyCounts(training, "tokens");
    expect(() => validateFrequencyCounts(model)).not.toThrow();
    const variants = [
      { ...model, wordMass: 11 }, { ...model, phoneMass: 11 },
      { ...model, phones: { ...model.phones, ZZ: 1 } },
      { ...model, phones: { ...model.phones, AH0: 8, K: 2 } },
      { ...model, syllablesByLength: { ...model.syllablesByLength, 1: { 1: 8 } } },
      { ...model, syllablesByLength: { ...model.syllablesByLength, 3: { 4: 1 } } },
      { ...model, syllablesByLength: { ...model.syllablesByLength, 2: { 1: 1 } } },
    ];
    for (const variant of variants) expect(() => scoreFrequencyWord(variant, training[0], 1)).toThrow();
  });
});

describe("normalized open support and registered likelihood units", () => {
  it("matches independently calculated known and unseen phone/length probabilities", () => {
    const types = fitFrequencyCounts(training, "types");
    const tokens = fitFrequencyCounts(training, "tokens");
    const known = scoreFrequencyWord(tokens, training[0], 1);
    expect(Math.exp(-known.jointLengthSyllableNll)).toBeCloseTo(19 / 22, 14);
    expect(Math.exp(-known.phoneNllSum)).toBeCloseTo(622 / 897, 14);
    const unseen = entry("we", ["W", "IY1"]);
    expect(scoreFrequencyWord(types, unseen, 1).objective).toBeCloseTo(Math.log(24) + Math.log(345), 12);
    expect(scoreFrequencyWord(tokens, unseen, 1).objective).toBeCloseTo(Math.log(88) + Math.log(897), 12);
  });
  it("preserves normalized joint support and positive log probabilities beyond floating-point underflow", () => {
    const model = fitFrequencyCounts(training, "types");
    let mass = 0;
    for (let length = 1; length <= 40; length++) {
      for (let vowels = 1; vowels <= length; vowels++) {
        const word = entry("probe", [...Array(vowels).fill("AH0"), ...Array(length - vowels).fill("K")]);
        mass += Math.exp(-scoreFrequencyWord(model, word, 1).jointLengthSyllableNll);
      }
    }
    expect(mass + 2 ** -40 / 3).toBeCloseTo(1, 13);
    const long = entry("rare", [...Array(1500).fill("ZH"), "AH0"]);
    const score = scoreFrequencyWord(model, long, 1);
    expect(score.objective).toBeGreaterThan(1000);
    expect(Number.isFinite(score.objective)).toBe(true);
  });
  it("uses token and phone denominators separately and chooses smoothing from all registered trials", () => {
    const model = fitFrequencyCounts(training, "types");
    const development = [entry("a", ["AH0"], 9), entry("we", ["W", "IY1"], 1)];
    const { words, summary } = scoreFrequencyPopulation(model, development, 1);
    expect(summary.types).toBe(2);
    expect(summary.tokens).toBe(10);
    expect(summary.phones).toBe(11);
    expect(summary.meanObjective).toBeCloseTo((9 * words[0].objective + words[1].objective) / 10, 14);
    expect(summary.meanPhoneNll).toBeCloseTo((9 * words[0].phoneNllSum + words[1].phoneNllSum) / 11, 14);
    const selection = selectFrequencySmoothing(model, development, [64, 1, 0.5]);
    expect(selection.trials.map(trial => trial.alpha)).toEqual([0.5, 1, 64]);
    expect(selection.alpha).toBe([...selection.trials].sort((a, b) => a.meanObjective - b.meanObjective || a.alpha - b.alpha)[0].alpha);
    for (const grid of [[], [1, 1], [0], [Infinity]]) expect(() => selectFrequencySmoothing(model, development, grid)).toThrow();
  });
});

describe("lexical spelling split", () => {
  it("is deterministic, disjoint and unchanged by input ordering, without splitting token multiplicity", () => {
    const entries = Array.from({ length: 100 }, (_, index) => entry(`word${String.fromCharCode(97 + index % 26)}${String.fromCharCode(97 + Math.floor(index / 26))}`, ["AH0"], index + 1));
    const first = splitFrequencyObservations(entries, "q19-2026-10-02");
    const reversed = splitFrequencyObservations([...entries].reverse(), "q19-2026-10-02");
    expect(Object.values(first).flat()).toHaveLength(100);
    expect(new Set(Object.values(first).flat().map(word => word.spelling)).size).toBe(100);
    for (const key of ["training", "development", "heldOut"] as const) {
      expect(first[key].map(word => word.spelling).sort()).toEqual(reversed[key].map(word => word.spelling).sort());
      expect(first[key].length).toBeGreaterThan(0);
    }
    expect(() => splitFrequencyObservations(entries, "")).toThrow();
  });
});
