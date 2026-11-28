import { describe, expect, it } from "vitest";
import { englishConfig } from "../../src/config/english.js";
import { LEGACY_ENGLISH_IDENTITIES } from "../../src/phonology/identity.js";
import { CONSONANTS, VOWELS } from "../corpus/cmu.js";
import { histogram } from "../corpus/joint.js";
import { compareGenerated, countBoundaryChanges } from "../corpus/syllabified-generated.js";
import { checkTextPin, phaseOneRows, verifyMappedRootPairs, X5_POPULATION } from "../corpus/syllabified-population.js";
import {
  CMU_ROOT_SYLLABIFICATION_V1, configClusterLicense, inferSyllables, mapReferencePronunciation, nativePairs, onsetInventories, suppliedSyllables,
} from "../corpus/syllabified-reference.js";
import { compatibilityConstituents, countConstituents, createConstituentTables, fittingEvent } from "../corpus/syllabified-tables.js";
import { cmuLegacyEnglishAdapter, mapCmuTokens, mapLegacyRoot } from "../corpus/variety-adapter.js";

const license = configClusterLicense(englishConfig);
const inventories = onsetInventories(["", "R", "P R", "S T R"], [
  ["S", "T", "R", "AH1"], ["S", "T", "R", "IH1"],
  ["P", "R", "OW1"], ["P", "R", "IH1"], ["P", "R", "IY1"],
  ["R", "IH1"], ["R", "OW1"], ["R", "IY1"],
].map(mapCmuTokens), license);
const vowel = (sound: string, stress?: string) => ({ onset: [], nucleus: [{ sound }], coda: [], stress });

describe("audited UCI root-pair parity", () => {
  const roots = [
    { phones: mapCmuTokens(["AH0", "N"]), surfaces: [{ line: 1, spelling: "a", stem: "a" }] },
    { phones: mapCmuTokens(["AH1", "N"]), surfaces: [
      { line: 2, spelling: "b", stem: "b" }, { line: 3, spelling: "bs", stem: "b" },
    ] },
  ];
  const pair = { slot: "final-VC", left: "AH", right: "N", rightStress: null, stemWeightedOccurrences: 1 } as const;
  const expected = {
    retained: { distinctStems: 2, surfaceObservations: 3 },
    pairTotals: { stemWeightedOccurrences: 2, surfaceWeightedOccurrences: 3 },
    rows: [
      { ...pair, leftStress: 0 as const, surfaceWeightedOccurrences: 1 },
      { ...pair, leftStress: 1 as const, surfaceWeightedOccurrences: 2 },
    ],
  };

  it("compares both weights in each stressed pair even when the overall totals match", () => {
    verifyMappedRootPairs(roots, expected);
    const swapped = roots.map((root, i) => ({ ...root, surfaces: roots[1 - i].surfaces }));
    expect(() => verifyMappedRootPairs(swapped, expected)).toThrow(/cell 1.*Expected .*"surfaceWeightedOccurrences":1.*observed .*"surfaceWeightedOccurrences":2/);
    const changedStress = [{ ...roots[0], phones: mapCmuTokens(["AH2", "N"]) }, roots[1]];
    expect(() => verifyMappedRootPairs(changedStress, expected)).toThrow(/cell 1.*Expected .*"leftStress":0.*observed .*"leftStress":1/);
  });

  it("rejects a stress label that disagrees with the mapped row's native vowel", () => {
    const phones = [{ ...roots[0].phones[0], stress: 1 as const }, roots[0].phones[1]];
    expect(() => verifyMappedRootPairs([{ ...roots[0], phones }, roots[1]], expected)).toThrow("native CMU token");
  });
});

describe("CMU root-to-variety fitting contract", () => {
  it("accounts for the entire 69-token native and 41-identity generated spaces", () => {
    const native = [...CONSONANTS, ...[...VOWELS].flatMap(base => [0, 1, 2].map(stress => base + stress))];
    const observed = mapCmuTokens(native);
    expect(observed).toHaveLength(69);
    expect(observed.map(({ raw }) => raw)).toEqual(native);
    expect(observed.filter(phone => phone.fit.status === "permitted")).toHaveLength(66);
    expect(observed.filter(phone => phone.fit.status === "ambiguous").map(phone => phone.raw)).toEqual(["ER0", "ER1", "ER2"]);
    const generated = LEGACY_ENGLISH_IDENTITIES.flatMap(({ sound, kind }) => mapLegacyRoot({
      syllables: [kind === "vowel" ? vowel(sound, "ˈ") : { onset: [{ sound }], nucleus: [], coda: [] }],
    }));
    expect(generated).toHaveLength(41);
    expect(new Set(generated.map(phone => phone.sourceIdentityId)).size).toBe(41);
    expect(generated.filter(phone => phone.fit.status === "ambiguous").map(phone => phone.raw)).toEqual(["ɜ"]);
  });

  it("keeps AH conventions separate and exposes uncertainty in ER and GOAT", () => {
    const phones = mapCmuTokens(["AH0", "AH1", "AH2", "OW2", "ER0"]);
    expect(phones.map(phone => phone.stress)).toEqual([0, 1, 2, 2, 0]);
    expect(phones.map(phone => phone.comparison)).toEqual(["AH", "AH", "AH", "OW", "ER"]);
    expect(phones.map(phone => phone.fit.status === "permitted" ? phone.fit.sound : phone.fit.status))
      .toEqual(["ə", "ʌ", "ʌ", "əʊ", "ambiguous"]);
    expect(phones[4].fit).toMatchObject({ status: "ambiguous", alternatives: [{ sound: "ɜ" }, { sound: "ɚ" }] });
    const generated = mapLegacyRoot({ syllables: [vowel("əʊ", "ˈ"), vowel("o", "ˈ"), vowel("oʊ", "ˈ"), vowel("əʊ"), vowel("ɜ", "ˌ")] });
    expect(generated.map(phone => phone.comparison)).toEqual(["OW", "OW", null, "OW", "ER"]);
    expect(generated.map(phone => phone.fit)).toMatchObject([
      { status: "permitted", sound: "əʊ" }, { status: "unavailable", reason: "comparison-only" },
      { status: "unavailable", reason: "unsupported-token" }, { status: "permitted", sound: "əʊ" },
      { status: "ambiguous" },
    ]);
    expect(generated.map(phone => phone.stress)).toEqual([1, 1, 1, "unmarked", 2]);
    expect(generated[3].sourceIdentityId).toBe(generated[0].sourceIdentityId);
    expect(generated[4].sourceIdentityId).toBe("english-legacy:25c");
  });

  it.each([[undefined, "unmarked"], ["?", "invalid"]] as const)(
    "fits known sounds with stress mark %s only in cells that have the required observations", (mark, stress) => {
      const phones = mapLegacyRoot({ syllables: [{ ...vowel("ə", mark), onset: [{ sound: "t" }] }] });
      expect(phones[1]).toMatchObject({ stress, fit: { status: "permitted", sound: "ə" } });
      expect(fittingEvent(phones, [1])).toEqual({ identities: ["english-legacy:259"], conditioning: [] });
      expect(fittingEvent(phones, [0], [1])).toEqual({ identities: ["english-legacy:74"], conditioning: ["english-legacy:259"] });
      expect(fittingEvent(phones, [0], [], [1])).toBeNull();

      const tables = createConstituentTables();
      countConstituents(tables, phones, inferSyllables(phones, CMU_ROOT_SYLLABIFICATION_V1.policy, inventories), 2);
      expect(tables.completeCase.phones.counts).toEqual({ t: 2, ə: 2 });
      expect(tables.onset.permitted).toEqual({});
      expect(tables.onset.withheld[`initial:${stress}`].counts).toEqual({ t: 2 });
      expect(tables.rime.permitted).toEqual({});
      expect(tables.rime.withheld[`final:${stress}`].counts).toEqual({ ə: 2 });
      expect(tables.compatibility).toEqual({});
    });

  it("validates all slot, identity-context and stress indices even after an ambiguous phone", () => {
    const phones = mapCmuTokens(["ER1", "T"]);
    for (const invalid of [-1, 2, 0.5, NaN]) {
      expect(() => fittingEvent(phones, [0, invalid])).toThrow(RangeError);
      expect(() => fittingEvent(phones, [0], [0, invalid])).toThrow(RangeError);
      expect(() => fittingEvent(phones, [0], [0], [1, invalid])).toThrow(RangeError);
    }
  });

  it("retains raw aliases independently of the unchanged legacy comparator", () => {
    const phones = mapLegacyRoot({ syllables: [{ onset: [{ sound: "ɡ" }], nucleus: [{ sound: "iː" }], coda: [], stress: "ˈ" }] });
    expect(phones).toMatchObject([
      { raw: "ɡ", notationAlias: true, fit: { sound: "g" }, comparison: null, stress: "not-applicable" },
      { raw: "iː", notationAlias: true, fit: { sound: "i:" }, comparison: null, stress: 1 },
    ]);
  });

  it("fits an inferred syllable whose vowel has no #304 comparison symbol", () => {
    const phones = mapLegacyRoot({ syllables: [vowel("iː", "ˈ")] });
    const tables = createConstituentTables();
    countConstituents(tables, phones, inferSyllables(phones, CMU_ROOT_SYLLABIFICATION_V1.policy, inventories), 1);
    expect(phones[0].comparison).toBeNull();
    expect(tables.rime.permitted["final:1"].counts).toEqual({ "english-legacy:69-3a": 1 });
    expect(tables.compatibility).toEqual({});
  });

  it("preserves source indices and masks unknowns without joining their neighbors", () => {
    const phones = mapCmuTokens(["AH0", "P", "?", "AH1", "T"]);
    expect(phones[2]).toMatchObject({ index: 2, raw: "?", kind: null });
    expect(nativePairs(phones)).toEqual([["#", "AH0"], ["AH0", "P"], ["AH1", "T"], ["T", "#"]]);
    expect(inferSyllables(phones, CMU_ROOT_SYLLABIFICATION_V1.policy, inventories))
      .toMatchObject({ status: "unavailable", reason: "unknown-token" });
  });

  it("counts prototype names as literal raw and withheld cells", () => {
    const unavailable = mapReferencePronunciation(["T", "constructor", "AH0", "__proto__"], cmuLegacyEnglishAdapter,
      { kind: "infer", policy: CMU_ROOT_SYLLABIFICATION_V1.policy, inventories });
    const unavailableCounts = createConstituentTables();
    countConstituents(unavailableCounts, unavailable.phones, unavailable.syllabification, 1);
    expect(unavailableCounts.nativePhones.counts["constructor"]).toBe(1);
    expect(unavailableCounts.nativePhones.counts["__proto__"]).toBe(1);

    const supplied = mapReferencePronunciation(["__proto__", "AH0"], cmuLegacyEnglishAdapter,
      { kind: "supplied", syllables: [{ onset: [0], nucleus: [1], coda: [] }] });
    const suppliedCounts = createConstituentTables();
    countConstituents(suppliedCounts, supplied.phones, supplied.syllabification, 2);
    const onset = suppliedCounts.onset.withheld["initial:0"];
    expect(Object.entries(onset.counts)).toEqual([["__proto__", 2]]);
    expect(suppliedCounts.reconstructedNativePhones).toEqual(suppliedCounts.nativePhones);
  });

  it("counts a supported token from a variety whose source notation uses a prototype name", () => {
    const opaqueAdapter = {
      ...cmuLegacyEnglishAdapter,
      mapReference: (tokens: readonly string[]) => mapCmuTokens(tokens.map(token => token === "constructor" ? "T" : token))
        .map((phone, index) => ({ ...phone, raw: tokens[index] })),
    };
    const mapped = mapReferencePronunciation(["constructor", "AH0"], opaqueAdapter,
      { kind: "supplied", syllables: [{ onset: [0], nucleus: [1], coda: [] }] });
    const tables = createConstituentTables();
    countConstituents(tables, mapped.phones, mapped.syllabification, 2);
    expect(tables.completeCase.phones.counts["constructor"]).toBe(2);
    expect(tables.nativeAdjacentPairs.counts["constructor AH0"]).toBe(2);
  });

  it("rejects a variety adapter that silently drops a native token", () => {
    const droppingAdapter = {
      ...cmuLegacyEnglishAdapter,
      mapReference: (tokens: readonly string[]) => mapCmuTokens(tokens).filter(phone => phone.kind !== null),
    };
    expect(() => mapReferencePronunciation(["AH0", "?", "IY1"], droppingAdapter,
      { kind: "infer", policy: CMU_ROOT_SYLLABIFICATION_V1.policy, inventories })).toThrow("original index");
  });

  it("keeps the raw ER evidence while allowing an independent onset event", () => {
    const { phones, syllabification } = mapReferencePronunciation(["D", "ER2", "T"], cmuLegacyEnglishAdapter,
      { kind: "infer", policy: CMU_ROOT_SYLLABIFICATION_V1.policy, inventories });
    const tables = createConstituentTables();
    countConstituents(tables, phones, syllabification, 4);
    expect(tables.onset.permitted["initial:2"].counts).toEqual({ "english-legacy:64": 4 });
    expect(tables.rime.withheld["final:2"].counts).toEqual({ "ER2 T": 4 });
    expect(tables.rime.permitted).toEqual({});
    expect(tables.nativeAdjacentPairs.counts).toEqual({ "D ER2": 4, "ER2 T": 4 });
    expect(tables.reconstructedNativeBoundedPairs).toEqual(tables.nativeBoundedPairs);
    expect(tables.completeCase.rows.total).toBe(0);
    expect(fittingEvent(phones, [2])).toEqual({ identities: ["english-legacy:74"], conditioning: [] });
    expect(fittingEvent(phones, [2], [1])).toBeNull();
    expect(fittingEvent(phones, [2], [], [1])).toEqual({ identities: ["english-legacy:74"], conditioning: [] });
  });

  it("retains an explicitly supplied multi-phone nucleus and rejects omitted source tokens", () => {
    const slots = [{ onset: [0], nucleus: [1, 2], coda: [3] }];
    const mapped = mapReferencePronunciation(["D", "IH1", "AH0", "T"], cmuLegacyEnglishAdapter,
      { kind: "supplied", syllables: slots });
    expect(mapped.syllabification).toEqual({ status: "supplied", syllables: slots });
    const tables = createConstituentTables();
    countConstituents(tables, mapped.phones, mapped.syllabification, 1);
    expect(tables.rime.permitted["final:1+0"].total).toBe(1);
    expect(tables.reconstructedNativeBoundedPairs).toEqual(tables.nativeBoundedPairs);
    expect(() => mapReferencePronunciation(["D", "IH1"], cmuLegacyEnglishAdapter,
      { kind: "supplied", syllables: [{ onset: [], nucleus: [1], coda: [] }] })).toThrow("in order");
  });

  it("rejects comparison without explicit stress and fails closed on source pins", () => {
    const phones = mapLegacyRoot({ syllables: [vowel("əʊ")] });
    expect(() => compatibilityConstituents({}, phones, { status: "supplied",
      syllables: [{ onset: [], nucleus: [0], coda: [] }] }, 1)).toThrow("explicit stress");
    expect(() => checkTextPin("unverified", X5_POPULATION.cmu, "CMU source")).toThrow("Unexpected CMU source");
    expect(() => phaseOneRows(JSON.stringify({ digest: X5_POPULATION.phaseOne, artifact: {} }))).toThrow("Phase 1 ledger digest");
  });
});

describe("root boundary policies", () => {
  it("counts each policy's boundary change against 304 when 304 is listed second", () => {
    const totals = histogram();
    countBoundaryChanges(totals, [
      { policy: "config-legal", outcome: "match" },
      { policy: "304", outcome: "disagree" },
      { policy: "audited-min3", outcome: "unavailable" },
    ]);
    expect(totals).toEqual({ total: 2, counts: {
      "config-legal/boundary-change:disagree>match": 1,
      "audited-min3/boundary-change:disagree>unavailable": 1,
    } });
  });

  it("chooses the longest supported onset and retains every candidate split", () => {
    const phones = mapCmuTokens(["AH0", "S", "T", "R", "IH1"]);
    const baseline = inferSyllables(phones, "304", inventories);
    const preferred = inferSyllables(phones, CMU_ROOT_SYLLABIFICATION_V1.policy, inventories);
    expect(baseline).toMatchObject({ status: "inferred", boundaries: [{ chosenCodaSize: 0 }] });
    expect(preferred).toMatchObject({ status: "inferred", syllables: [
      { onset: [], nucleus: [0], coda: [1, 2] }, { onset: [3], nucleus: [4], coda: [] },
    ], boundaries: [{
      cluster: [1, 2, 3], splits: [
        { codaSize: 0, onsetSize: 3, licensed: false }, { codaSize: 1, onsetSize: 2, licensed: false },
        { codaSize: 2, onsetSize: 1, licensed: true }, { codaSize: 3, onsetSize: 0, licensed: true },
      ],
    }] });
  });

  it("applies configured cluster and junction constraints without editing source phones", () => {
    const licensed = (tokens: string[]) => inferSyllables(mapCmuTokens(tokens), "config-legal", inventories)
      .boundaries[0].splits.filter(split => split.licensed).map(split => split.codaSize);
    expect(licensed(["AH0", "N", "T", "IH1"])).toEqual([1, 2]);
    expect(licensed(["AH0", "K", "K", "IH1"])).toEqual([]);
    // Neither an ordinary /sts/ coda nor /st.s/ with a repeated coda sound in the onset can be selected.
    expect(licensed(["AH0", "S", "T", "S", "IH1"])).toEqual([]);
    expect(licensed(["AH0", "T", "R", "IY1"])).toContain(0);
    expect(licensed(["AH0", "T", "R", "ER0"])).toEqual([]);
    expect(licensed(["ER0", "R", "IH1"])).toEqual([]);
    expect(licensed(["ER0", "NG", "IH0"])).toEqual([]);
    expect(licensed(["ER0", "T", "IH0"])).toContain(0);
  });

  it("checks the generator's actual vowel ID while preserving uncertainty for fitting", () => {
    const rhoticCoda = (sound: string) => mapLegacyRoot({ syllables: [{ ...vowel(sound), coda: [{ sound: "ŋ" }] }, vowel("ə")] });
    expect(inferSyllables(rhoticCoda("ɚ"), "config-legal", inventories)).toMatchObject({
      status: "unavailable", reason: "no-licensed-split", boundaries: [{ chosenCodaSize: null,
        splits: [{ codaSize: 0, licensed: false }, { codaSize: 1, licensed: false }] }],
    });
    const observed = rhoticCoda("ɜ");
    expect(fittingEvent(observed, [0])).toBeNull();
    expect(inferSyllables(observed, "config-legal", inventories)).toMatchObject({
      status: "inferred", boundaries: [{ chosenCodaSize: 1 }],
    });
  });

  it("replays the archived flena boundary disagreement with the gold split held back", () => {
    // #555 regeneration at c48d16c1, seed 201, draw 1.
    const root = { syllables: [
      { onset: [{ sound: "f" }, { sound: "l" }], nucleus: [{ sound: "i:" }], coda: [{ sound: "n" }], stress: "ˈ" },
      vowel("ə"),
    ] };
    const phones = mapLegacyRoot(root);
    const flenaInventories = onsetInventories(["", "N"], [
      ["N", "AH1"], ["N", "AH0"], ["N", "IH1"],
    ].map(mapCmuTokens), license);
    expect(inferSyllables(phones, "304", flenaInventories)).toMatchObject({
      status: "inferred", boundaries: [{ leftNucleus: 2, rightNucleus: 4, chosenCodaSize: 0 }],
    });
    expect(inferSyllables(phones, CMU_ROOT_SYLLABIFICATION_V1.policy, flenaInventories)).toMatchObject({
      status: "inferred", boundaries: [{ chosenCodaSize: 0 }],
    });
    expect(suppliedSyllables(root)).toMatchObject({ status: "supplied", syllables: [
      { onset: [0, 1], nucleus: [2], coda: [3] }, { onset: [], nucleus: [4], coda: [] },
    ] });
  });

  it("retains hiatus and places medial NG in the coda when it has no audited onset support", () => {
    const phones = mapCmuTokens(["IY1", "AH0", "NG", "IY2"]);
    expect(inferSyllables(phones, CMU_ROOT_SYLLABIFICATION_V1.policy, inventories)).toMatchObject({
      status: "inferred", boundaries: [
        { cluster: [], chosenCodaSize: 0 }, { cluster: [2], chosenCodaSize: 1 },
      ],
    });
    expect(inferSyllables(phones, "config-legal", inventories)).toMatchObject({
      status: "inferred", boundaries: [
        { cluster: [], chosenCodaSize: 0 }, { cluster: [2], chosenCodaSize: 1 },
      ],
    });
  });

  it("is deterministic on real, traced public-API roots across a fixed draw stream", () => {
    const first = compareGenerated(2380207674, 12, inventories, false);
    expect(compareGenerated(2380207674, 12, inventories, false)).toEqual(first);
    expect(first.totals.counts["304/root:match"]).toBeGreaterThan(0);
    expect(first.totals.counts["304/boundary:disagree"]).toBeGreaterThan(0);
    expect(first.totals.counts["config-legal/boundary-change:disagree>match"]).toBeGreaterThan(0);
  });

  it("keeps every supplied boundary in the agreement denominator when a policy abstains", () => {
    const report = compareGenerated(2380207674, 12, { ...inventories, configLicense: () => false }, false);
    const counts = report.totals.counts;
    const boundaries = counts["304/boundary:match"] + counts["304/boundary:disagree"];
    expect(boundaries).toBeGreaterThan(0);
    expect(counts["config-legal/boundary:unavailable"]).toBe(boundaries);
    expect(report.matchedCoverage.total).toBe(0);
  });
});
