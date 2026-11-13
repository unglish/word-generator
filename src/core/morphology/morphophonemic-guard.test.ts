import { describe, it, expect } from "vitest";
import type { Phoneme, Syllable } from "../../types.js";
import type { AffixForm } from "./realization.js";
import type { AffixSyllable } from "../../config/language.js";
import type {
  MorphophonemicGuardRuntime,
  MorphophonemicGuardResult,
} from "./morphophonemic-guard.js";
import type { MorphophonemicTarget } from "./morphology-projection.js";
import { evaluateMorphophonemicReplacement } from "./morphophonemic-guard.js";

const definitions: Array<
  [
    string,
    Phoneme["mannerOfArticulation"],
    Phoneme["placeOfArticulation"],
    boolean,
  ]
> = [
  ["s", "sibilant", "alveolar", false],
  ["k", "stop", "velar", false],
  ["t", "stop", "alveolar", false],
  ["p", "stop", "bilabial", false],
  ["b", "stop", "bilabial", true],
  ["n", "nasal", "alveolar", true],
  ["m", "nasal", "bilabial", true],
  ["r", "liquid", "alveolar", true],
  ["l", "liquid", "alveolar", true],
  ["a", "lowVowel", "central", true],
  ["i", "highVowel", "front", true],
];

const phones: Phoneme[] = definitions.map(
  ([sound, mannerOfArticulation, placeOfArticulation, voiced]) => ({
    sound,
    mannerOfArticulation,
    placeOfArticulation,
    voiced,
    onset: ["a", "i"].includes(sound) ? 0 : 1,
    coda: ["a", "i"].includes(sound) ? 0 : 1,
    nucleus: ["a", "i"].includes(sound) ? 1 : 0,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  }),
);

const bySound = new Map(phones.map((p) => [p.sound, p]));
const resolve = (sound: string): Phoneme => {
  expect(bySound.has(sound)).toBe(true);
  return bySound.get(sound)!;
};

const syl = (
  onset: string[] = [],
  nucleus: string[] = ["a"],
  coda: string[] = [],
): Syllable => ({
  onset: onset.map(resolve),
  nucleus: nucleus.map(resolve),
  coda: coda.map(resolve),
});

const form = (
  phonemes: string[] = [],
  syllableCount = 0,
  syllables?: AffixSyllable[],
): AffixForm => ({
  written: "x",
  phonemes,
  syllableCount,
  ...(syllables ? { syllables } : {}),
});

function runtime(): MorphophonemicGuardRuntime {
  const onset = [
    ["t", "r"],
    ["k", "r"],
    ["p", "r"],
    ["p", "l"],
    ["s", "t"],
  ];
  const coda = [
    ["s", "k"],
    ["s", "t", "s"],
    ["k", "s", "t", "s"],
    ["n", "t"],
    ["m", "p"],
  ];
  const prefixes = (clusters: string[][]) =>
    new Set(
      clusters.flatMap((parts) =>
        parts.slice(1).map((_, i) => parts.slice(0, i + 1).join("|")),
      ),
    );
  return {
    config: {
      syllableStructure: {
        maxOnsetLength: 3,
        maxCodaLength: 3,
        maxNucleusLength: 1,
      },
      codaConstraints: { voicingAgreement: true, homorganicNasalStop: true },
    },
    phonemeBySound: bySound,
    positionPhonemes: {
      onset: phones.filter((p) => (p.onset ?? 0) > 0),
      nucleus: phones.filter((p) => (p.nucleus ?? 0) > 0),
      coda: phones.filter((p) => (p.coda ?? 0) > 0),
    },
    sonorityLevels: new Map(
      phones.map((p) => [
        p,
        (
          {
            stop: 1,
            sibilant: 2,
            nasal: 3,
            liquid: 4,
            lowVowel: 5,
            highVowel: 5,
          } as Partial<Record<Phoneme["mannerOfArticulation"], number>>
        )[p.mannerOfArticulation] ?? 0,
      ]),
    ),
    invalidClusterRegexes: { onset: null, coda: null, nucleus: null },
    clusterLimits: { maxOnset: 3, maxCoda: 3 },
    codaAppendantSet: new Set(["s"]),
    attestedOnsetSet: new Set(onset.map((p) => p.join("|"))),
    attestedOnsetPrefixSet: prefixes(onset),
    attestedCodaSet: new Set(coda.map((p) => p.join("|"))),
    attestedCodaPrefixSet: prefixes(coda),
  };
}

const target = (
  segment: MorphophonemicTarget["segment"],
  index = 0,
  syllableIndex = 0,
): MorphophonemicTarget => ({ syllableIndex, segment, index });

function check(
  root: readonly Syllable[],
  where: MorphophonemicTarget,
  next: string,
  rt = runtime(),
  prefix?: AffixForm,
  suffix?: AffixForm,
) {
  return evaluateMorphophonemicReplacement(
    rt,
    root,
    where,
    resolve(next),
    prefix,
    suffix,
    resolve,
  );
}

function has(
  result: MorphophonemicGuardResult,
  reason: MorphophonemicGuardResult["rejections"][number]["reason"],
) {
  expect(result.accepted).toBe(false);
  expect(result.rejections.some((row) => row.reason === reason)).toBe(true);
}

describe("morphophonemic cluster legality guard", () => {
  it("blocks observed root /sk/ to /ss/ without mutating the derivation", () => {
    const root = [syl([], ["a"], ["s", "k"])];
    const before = structuredClone(root);
    has(check(root, target("coda", 1), "s"), "repetition");
    expect(root).toEqual(before);
  });

  it("retains licensed single-coda softening and separated /sts/ and /ksts/", () => {
    expect(check([syl([], ["a"], ["k"])], target("coda"), "s").accepted).toBe(
      true,
    );
    for (const coda of [
      ["s", "t", "s"],
      ["k", "s", "t", "s"],
    ]) {
      expect(
        check([syl([], ["a"], coda)], target("nucleus"), "i").accepted,
      ).toBe(true);
    }
  });

  it("both neighbours of an interior replacement are checked", () => {
    has(
      check([syl([], ["a"], ["k", "s", "t", "s"])], target("coda", 1), "t"),
      "repetition",
    );
  });

  it("custom onset substitutions use full attested onset licensing", () => {
    has(check([syl(["t", "r"])], target("onset", 1), "s"), "attestation");
    expect(check([syl(["k", "r"])], target("onset"), "p").accepted).toBe(true);
  });

  it("distinct flat-prefix/root and root/flat-suffix repetitions stay source-owned", () => {
    const prefixed = check(
      [syl(["r"])],
      target("onset"),
      "r",
      runtime(),
      form(["r"]),
    );
    expect(prefixed.accepted).toBe(true);
    expect(prefixed.boundaryRepetitionLicenses).toHaveLength(1);
    expect(
      prefixed.boundaryRepetitionLicenses[0].members.map(
        (member) => member.source.part,
      ),
    ).toEqual(["prefix", "root"]);
    const result = check(
      [syl([], ["a"], ["k"])],
      target("coda"),
      "s",
      runtime(),
      undefined,
      form(["s"]),
    );
    expect(result.accepted).toBe(true);
    expect(result.assembledTarget.index).toBe(0);
  });

  it("nucleus replacement checks a mixed-source coda conflict", () => {
    const rt = runtime();
    rt.bannedNucleusCodaMap = new Map([["i", new Set(["t"])]]);
    const result = check(
      [syl()],
      target("nucleus"),
      "i",
      rt,
      undefined,
      form(["t"]),
    );
    has(result, "nucleus-coda");
    expect(result.rejections.some((row) => row.parts.includes("suffix"))).toBe(
      true,
    );
  });

  it("aggregate coda features catch voicing/place conflicts across morphology domains", () => {
    has(
      check(
        [syl([], ["a"], ["k"])],
        target("coda"),
        "b",
        runtime(),
        undefined,
        form(["t"]),
      ),
      "voicing",
    );
    has(
      check(
        [syl([], ["a"], ["m"])],
        target("coda"),
        "n",
        runtime(),
        undefined,
        form(["p"]),
      ),
      "place",
    );
  });

  it("selected syllabic affix boundary bans are checked before mutation", () => {
    const rt = runtime();
    rt.bannedSet = new Set(["s|t"]);
    has(
      check(
        [syl([], ["a"], ["k"])],
        target("coda"),
        "s",
        rt,
        undefined,
        form([], 1, [{ onset: ["t"], nucleus: ["a"], coda: [] }]),
      ),
      "boundary",
    );
  });

  it("canonical position pool rejects an unavailable replacement", () => {
    const rt = runtime();
    rt.positionPhonemes.coda = rt.positionPhonemes.coda.filter(
      (p) => p.sound !== "s",
    );
    has(check([syl([], ["a"], ["k"])], target("coda"), "s", rt), "inventory");
  });

  it("actual initial/final position includes selected flat affixes", () => {
    const rt = runtime();
    rt.allowedFinalSet = new Set(["k"]);
    has(check([syl([], ["a"], ["k"])], target("coda"), "s", rt), "word-final");
    expect(
      check(
        [syl([], ["a"], ["k"])],
        target("coda"),
        "s",
        rt,
        undefined,
        form(["k"]),
      ).accepted,
    ).toBe(true);
  });

  it("coda length and appendant status are evaluated on complete assembly", () => {
    const rt = runtime();
    rt.clusterLimits!.maxCoda = 1;
    has(
      check(
        [syl([], ["a"], ["k"])],
        target("coda"),
        "t",
        rt,
        undefined,
        form(["k"]),
      ),
      "length",
    );
  });

  it("invalid coordinates fail before any proposal is returned", () => {
    expect(() => check([syl()], target("nucleus", 9), "i")).toThrow(/outside/);
  });

  it("mixed clusters still require attestation after source-domain checks", () => {
    has(
      check([syl(["r"])], target("onset"), "s", runtime(), form(["p"])),
      "attestation",
    );
  });

  it("a morpheme license cannot hide two duplicates within the root", () => {
    const result = check(
      [syl(["r", "r"])],
      target("onset", 1),
      "r",
      runtime(),
      form(["r"]),
    );
    has(result, "repetition");
    expect(result.boundaryRepetitionLicenses[0].members).toHaveLength(2);
  });

  it("fallback pattern bans and weighted cluster suppression remain effective", () => {
    const onsetRuntime = runtime();
    delete onsetRuntime.attestedOnsetSet;
    delete onsetRuntime.attestedOnsetPrefixSet;
    onsetRuntime.invalidClusterRegexes.onset = /kr/;
    has(
      check([syl(["p", "r"])], target("onset"), "k", onsetRuntime),
      "pattern",
    );
    const codaRuntime = runtime();
    codaRuntime.attestedCodaSet!.add("t|s");
    codaRuntime.clusterWeights = { coda: new Map([["t,s", 0]]) };
    has(
      check([syl([], ["a"], ["k", "s"])], target("coda"), "t", codaRuntime),
      "cluster-weight",
    );
  });

  it("banned coda sounds and configured nucleus size remain enforced", () => {
    const rt = runtime();
    rt.bannedCodaSet = new Set(["s"]);
    has(check([syl([], ["a"], ["k"])], target("coda"), "s", rt), "banned-coda");
    has(check([syl([], ["a", "a"])], target("nucleus"), "i"), "length");
  });

  it("unregistered replacement metadata cannot silently enter the assembly", () => {
    const rt = runtime();
    const replacement = { ...resolve("s"), sound: "q" };
    has(
      evaluateMorphophonemicReplacement(
        rt,
        [syl([], ["a"], ["k"])],
        target("coda"),
        replacement,
        undefined,
        undefined,
        resolve,
      ),
      "inventory",
    );
  });
});
