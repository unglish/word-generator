import { describe, expect, it } from "vitest";
import { createSeededRng, englishConfig, generateWord } from "../index.js";
import { ipaToArpabet } from "../phonotactic/ipa-to-arpabet.js";
import {
  LEGACY_ENGLISH_IDENTITIES, observeCmuToken, observeWordIdentity,
  projectIdentityStress, projectLegacyArpabet,
} from "./identity.js";
import type { ObservedWordInput } from "./identity.js";

const options = { sourceProfile: "english-legacy-v1", layer: "surface" } as const;
function word(nucleus: string[], stress?: string): ObservedWordInput {
  return { syllables: [{ onset: [{ sound: "p" }], nucleus: nucleus.map(sound => ({ sound })), coda: [{ sound: "t" }], stress }] };
}

describe("phoneme identity contract", () => {
  it("accounts for all 41 inventory entries without merging their source IDs", () => {
    expect(LEGACY_ENGLISH_IDENTITIES.map(item => item.sound)).toEqual(englishConfig.phonemes.map(phone => phone.sound));
    expect(new Set(LEGACY_ENGLISH_IDENTITIES.map(item => item.id)).size).toBe(41);
    for (const phone of englishConfig.phonemes) {
      const observation = observeWordIdentity(word([phone.sound], "ˈ"), options).segments[1];
      expect(observation.identity.status).toBe(phone.sound === "ɜ" ? "ambiguous" : "resolved");
    }
  });

  it("preserves each central vowel while exposing the two legacy merges", () => {
    const observed = observeWordIdentity(word(["ə", "ʌ", "ɜ", "ɚ"], "ˈ"), options);
    expect(new Set(observed.segments.slice(1, -1).map(segment => segment.identity.id)).size).toBe(4);
    expect(projectLegacyArpabet(observed).items.map(item => item.token)).toEqual(["P", "AH", "AH", "ER", "ER", "T"]);
    expect(projectIdentityStress(observed).identityComplete).toBe(false);
    expect(observed.segments[3].identity.status).toBe("ambiguous");
  });

  it.each([undefined, "ˈ", "ˌ", "invalid"])("records stress %s without inferring stress zero", stress => {
    const observed = observeWordIdentity(word(["ʌ"], stress), options);
    const expected = stress === undefined ? "unmarked" : stress === "ˈ" ? "primary" : stress === "ˌ" ? "secondary" : "invalid";
    expect(observed.syllables[0].stress).toEqual({ mark: expected, raw: stress ?? null });
    expect(projectIdentityStress(observed).stressComplete).toBe(stress === "ˈ" || stress === "ˌ");
  });

  it("does not silently remove unsupported segments or create adjacency", () => {
    const observed = observeWordIdentity(word(["ʔ", "__proto__", "constructor"]), options);
    const coarse = projectLegacyArpabet(observed);
    expect(coarse.complete).toBe(false);
    expect(coarse.items.map(item => item.token)).toEqual(["P", null, null, null, "T"]);
    expect(coarse.items.map(item => item.sourceIndex)).toEqual([0, 1, 2, 3, 4]);
    expect(projectIdentityStress(observed).items).toHaveLength(5);
  });

  it("requires a declared source profile before interpreting a custom inventory", () => {
    const observed = observeWordIdentity(word(["əʊ"]), { ...options, sourceProfile: "unclassified" });
    expect(observed.segments.every(segment => segment.identity.status === "unknown")).toBe(true);
    expect(projectLegacyArpabet(observed).items.every(item => item.losses.unresolvedIdentity)).toBe(true);
  });

  it("handles notation aliases explicitly without silently migrating dialect realizations", () => {
    const observed = observeWordIdentity(word(["iː", "ɡ", "oʊ", "ɹ"]), options);
    expect(observed.segments.slice(1, -1).map(segment => segment.notationAlias)).toEqual([true, true, false, false]);
    expect(observed.segments[1].rawSound).toBe("iː");
    expect(observed.segments[1].identity.id).toBe(LEGACY_ENGLISH_IDENTITIES[0].id);
    expect(projectLegacyArpabet(observed).items[1].token).toBeNull();
    expect(observed.segments[3].identity.status).toBe("unknown");
  });

  it("matches the existing coarse helper wherever that helper defines a mapping", () => {
    const sounds = [...englishConfig.phonemes.map(phone => phone.sound), "e", "o", "pʰ", "ʰp", "pʰʰ", "aɪə", "ɝ", ""];
    for (const sound of sounds) {
      const observed = observeWordIdentity(word([sound]), options);
      expect(projectLegacyArpabet(observed).items[1].token).toBe(ipaToArpabet(sound));
    }
    expect(observeWordIdentity(word(["ʰp"]), options).segments[1].identity.status).toBe("unknown");
  });

  it("records modifiers and flags without treating them as recovered lexical identity", () => {
    const input = { syllables: [{ onset: [{ sound: "pʰ", aspirated: true }], nucleus: [{ sound: "ə", reduced: true, tense: false }], coda: [] }] };
    const observed = observeWordIdentity(input, options);
    expect(observed.segments[0]).toMatchObject({ baseSound: "p", symbolAspiration: true });
    expect(projectLegacyArpabet(observed).items[0].losses.aspiration).toBe(true);
    expect(observed.segments[1].recorded).toEqual({ aspiration: { status: "unknown" }, reduction: { status: "recorded", value: true }, legacyTense: { status: "recorded", value: false } });
    expect(observed.segments[1].underlyingIdentity.status).toBe("unknown");
  });

  it("keeps multiple nucleus segments and syllable coordinates", () => {
    const observed = observeWordIdentity({ syllables: [word(["eɪ", "ɪ"], "ˈ").syllables[0], word(["u"], "ˌ").syllables[0]] }, options);
    expect(projectIdentityStress(observed)).toMatchObject({ identityComplete: true, stressComplete: true, structureSupported: true });
    expect(observed.segments[2].coordinates).toEqual({ syllable: 0, slot: "nucleus", index: 1 });
    expect(observed.segments[5].coordinates).toEqual({ syllable: 1, slot: "nucleus", index: 0 });
    expect(projectIdentityStress(observeWordIdentity(word([]), options)).structureSupported).toBe(false);
    expect(projectIdentityStress(observeWordIdentity(word(["p"]), options)).structureSupported).toBe(false);
  });

  it("preserves source objects and RNG over 2,000 public API draws", () => {
    const first = createSeededRng(161616);
    const second = createSeededRng(161616);
    let firstCalls = 0;
    let secondCalls = 0;
    const a = () => { firstCalls++; return first(); };
    const b = () => { secondCalls++; return second(); };
    for (let i = 0; i < 2000; i++) {
      const observedWord = generateWord({ rand: a, trace: true, morphology: true });
      const before = JSON.stringify(observedWord);
      const observation = observeWordIdentity(observedWord, options);
      expect(observeWordIdentity(observedWord, options)).toEqual(observation);
      projectLegacyArpabet(observation); projectIdentityStress(observation);
      observation.segments[0].stress.raw = "mutated";
      expect(JSON.stringify(observedWord)).toBe(before);
      const unobservedWord = generateWord({ rand: b, morphology: true });
      expect({ ...observedWord, trace: undefined }).toEqual(unobservedWord);
    }
    expect(firstCalls).toBe(secondCalls);
    expect(first()).toBe(second());
  });
});

describe("CMU source tokens", () => {
  it("keeps AH/ER and all three source stress digits distinct", () => {
    for (const base of ["AH", "ER"]) {
      for (const [digit, stress] of ["unstressed", "primary", "secondary"].entries()) {
        expect(observeCmuToken(`${base}${digit}`)).toEqual({ status: "parsed", raw: `${base}${digit}`, base, kind: "vowel", stress });
      }
    }
    expect(observeCmuToken("R")).toEqual({ status: "parsed", raw: "R", base: "R", kind: "consonant", stress: "not-applicable" });
  });

  it.each(["AH", "AH12", "R1", "AX0", "ER3", "ah0", "AH0 ", "", "1AH", "constructor"])("retains unsupported token %s", raw => {
    expect(observeCmuToken(raw)).toEqual({ status: "unsupported", raw });
  });

  it("parses every declared CMU category and never merges primary and secondary", () => {
    for (const identity of LEGACY_ENGLISH_IDENTITIES) {
      const tokens = identity.kind === "vowel" ? [0, 1, 2].map(stress => `${identity.legacyArpabet}${stress}`) : [identity.legacyArpabet];
      for (const token of tokens) expect(observeCmuToken(token).status).toBe("parsed");
    }
  });
});
