import { describe, expect, it } from "vitest";
import { observeWordIdentity, type ObservedWordInput } from "./identity.js";
import { createIdentityStressScorer, observeSurfaceStressEvidence, type IdentityStressReference } from "./identity-stress-score.js";

function reference(): IdentityStressReference {
  return { identity: { artifactDigest: "1".repeat(64), rawSourceSha256: "2".repeat(64), selectedEntryDigest: "3".repeat(64) }, entries: 4, phoneEvents: 8,
    native: { vocabulary: ["#", "AE0", "AE1", "T"], counts: { "#": { AE0: 2, AE1: 2 }, AE0: { T: 2 }, AE1: { T: 2 }, T: { "#": 4 } }, rowTotals: { "#": 4, AE0: 2, AE1: 2, T: 4 }, total: 12 },
    base: { vocabulary: ["#", "AE", "T"], counts: { "#": { AE: 4 }, AE: { T: 4 }, T: { "#": 4 } }, rowTotals: { "#": 4, AE: 4, T: 4 }, total: 12 } };
}
function word(stress?: string, sound = "æ"): ObservedWordInput {
  return { syllables: [{ onset: [], nucleus: [{ sound }], coda: [{ sound: "t" }], ...(stress === undefined ? {} : { stress }) }] };
}
const observe = (input: ObservedWordInput) => observeWordIdentity(input, { sourceProfile: "english-legacy-v1", layer: "surface" });
function trace(input: ObservedWordInput, mark = "unmarked", version = 1) {
  return { stressPattern: { version, snapshots: [{ domain: "surface-after-realization", coordinates: "word", eventCount: 0,
    syllables: input.syllables.map(syllable => ({ onset: syllable.onset, nucleus: syllable.nucleus, coda: syllable.coda, mark })) }] } };
}

describe("separate identity/stress probability diagnostics", () => {
  it("matches hand-computed normalized probabilities with both boundary transitions", () => {
    const scored = createIdentityStressScorer(reference()).score(observe(word("ˈ")));
    expect(scored.matched).toBe(true);
    expect(scored.native.tokens).toEqual(["AE1", "T"]);
    expect(scored.coarse.bitsPerTransition).toBeCloseTo(-Math.log2(9 / 11), 14);
    expect(scored.native.bitsPerTransition).toBeCloseTo(-(Math.log2(5 / 12) + Math.log2(5 / 8) + Math.log2(3 / 4)) / 3, 14);
    expect(scored.coarse.transitions).toBe(3);
  });
  it("keeps absent stress unavailable while preserving the full coarse diagnostic", () => {
    const scored = createIdentityStressScorer(reference()).score(observe(word()));
    expect(scored.coarse.status).toBe("scored");
    expect(scored.native.bitsPerTransition).toBeNull();
    expect(scored.native.tokens).toEqual([null, "T"]);
    expect(scored.matched).toBe(false);
  });
  it("retains known tokens in a partially unavailable projection", () => {
    const input = { syllables: [...word("ˈ").syllables, ...word().syllables] };
    expect(createIdentityStressScorer(reference()).score(observe(input)).native.tokens).toEqual(["AE1", "T", null, "T"]);
  });
  it("accepts an explicit unmarked surface snapshot in each supported trace version", () => {
    const input = word(); const observed = observe(input);
    for (const version of [1, 2]) {
      const evidence = observeSurfaceStressEvidence(observed, trace(input, "unmarked", version));
      const scored = createIdentityStressScorer(reference()).score(observed, evidence);
      expect(scored.native.tokens).toEqual(["AE0", "T"]); expect(scored.matched).toBe(true);
    }
  });
  it("does not infer missing, unsupported, duplicate, or incomplete surface evidence", () => {
    const input = word(), observed = observe(input);
    const duplicate = trace(input); duplicate.stressPattern.snapshots.push(duplicate.stressPattern.snapshots[0]);
    const incomplete = trace(input); incomplete.stressPattern.snapshots[0].syllables[0].nucleus = [];
    for (const invalid of [undefined, trace(input, "unmarked", 3), duplicate, incomplete]) {
      const evidence = observeSurfaceStressEvidence(observed, invalid);
      expect(evidence.unavailable.length).toBeGreaterThan(0);
      expect(createIdentityStressScorer(reference()).score(observed, evidence).native.status).toBe("unavailable");
    }
  });
  it("rejects a conflicting mark or phone and detects evidence reused after word mutation", () => {
    const input = word("ˈ"), observed = observe(input);
    expect(observeSurfaceStressEvidence(observed, trace(input)).unavailable).toContain("surface-stress-mismatch");
    const mismatched = trace(word("ˈ", "ɛ"), "primary");
    expect(observeSurfaceStressEvidence(observed, mismatched).unavailable).toContain("surface-phone-mismatch");
    const evidence = observeSurfaceStressEvidence(observed, trace(input, "primary"));
    observed.segments[1].rawSound = "d";
    expect(createIdentityStressScorer(reference()).score(observed, evidence).native.status).toBe("unavailable");
  });
  it("does not accept unsupported evidence versions or markers that contradict the word", () => {
    const observed = observe(word("ˈ")), scorer = createIdentityStressScorer(reference());
    const original = scorer.score(observed).evidence;
    const badVersion = { ...original, version: "future-v3" } as unknown as typeof original;
    expect(scorer.score(observed, badVersion).native.status).toBe("unavailable");
    expect(scorer.score(observed, { ...original, marks: ["secondary"] }).native.status).toBe("unavailable");
    const unmarked = observe(word()), absent = scorer.score(unmarked).evidence;
    expect(scorer.score(unmarked, { ...absent, marks: ["unstressed"], unavailable: [] }).native.status).toBe("unavailable");
  });
  it("rejects corrupted slot geometry without dropping segments from the coarse view", () => {
    const observed = observe(word("ˈ")); observed.segments[0].coordinates.index = 1;
    const scored = createIdentityStressScorer(reference()).score(observed);
    expect(scored.native.tokens).toEqual([null, null]);
    expect(scored.coarse.tokens).toEqual(["AE", "T"]);
  });
  it("does not resolve the ambiguous legacy vowel or delete an unknown segment", () => {
    const scored = createIdentityStressScorer(reference()).score(observe(word("ˈ", "ɜ")));
    expect(scored.native.tokens).toEqual([null, "T"]); expect(scored.losses[0].losses.unresolvedIdentity).toBe(true);
    const unknown = observe(word("ˈ", "foreign"));
    expect(createIdentityStressScorer(reference()).score(unknown).coarse.tokens).toEqual([null, "T"]);
  });
  it("reports a valid but unobserved reference token without scoring a partial word", () => {
    const scored = createIdentityStressScorer(reference()).score(observe(word("ˈ", "ɪ")));
    expect(scored.native.tokens).toEqual(["IH1", "T"]);
    expect(scored.native.unavailable).toContain("reference:0"); expect(scored.native.bitsPerTransition).toBeNull();
  });
  it("rejects conserving counterfeit base counts that disagree with the entire native projection", () => {
    const bad = reference(); bad.base.counts = { "#": { AE: 2, T: 2 }, AE: { "#": 2, T: 2 }, T: { "#": 2, AE: 2 } };
    expect(() => createIdentityStressScorer(bad)).toThrow("native/base");
  });
  it("rejects malformed identities, counts, conservation, alphabets, and empty words", () => {
    const badCount = reference(); badCount.native.counts.AE1.T = 1.5;
    const badTotal = reference(); badTotal.native.rowTotals.AE1 = 3;
    const badIdentity = reference(); badIdentity.identity.artifactDigest = "not-a-digest";
    const badAlphabet = reference(); badAlphabet.native.vocabulary.push("UNKNOWN");
    for (const bad of [badCount, badTotal, badIdentity, badAlphabet]) expect(() => createIdentityStressScorer(bad)).toThrow();
    expect(createIdentityStressScorer(reference()).score(observe({ syllables: [] })).native.bitsPerTransition).toBeNull();
  });
  it("detaches compiled tables and every returned projection/evidence/identity", () => {
    const input = reference(), observed = observe(word("ˈ")), scorer = createIdentityStressScorer(input);
    const expected = scorer.score(observed); input.native.counts.AE1.T = 1000; input.identity.artifactDigest = "0".repeat(64);
    const changed = scorer.score(observed); changed.model.artifactDigest = "4".repeat(64); changed.native.tokens[0] = null; changed.evidence.marks[0] = "unavailable";
    expect(scorer.score(observed)).toEqual(expected);
  });
});
