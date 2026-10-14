import { describe, expect, it } from "vitest";
import { generateWord } from "../../../../src/index.js";
import { draws, emptyObservation, filesDigest, observe, profiles, scheduleSha256, validateReport } from "./shared.js";
import type { ParityReport } from "./shared.js";

const example = () => generateWord({ seed: 404, trace: true, morphology: false });

function fixtureReport(): ParityReport {
  const word = example();
  delete word.trace!.stressWeight;
  const digest = "a".repeat(64);
  const sourceFiles = { "src/index.ts": digest };
  const evaluatorFiles = { "shared.ts": digest };
  return {
    schemaVersion: 1, probe: "syllable-weight-parity-v1", mode: "original", node: "fixture", createdAt: "fixture", checkout: "fixture", gitHead: digest,
    sourceFiles, sourceDigest: filesDigest(sourceFiles), evaluatorFiles, evaluatorSha256: filesDigest(evaluatorFiles), scheduleSha256, generatedWords: 40000,
    streams: profiles.flatMap(profile => profile.seeds.map(seed => ({
      profile: profile.id, seed, draws, options: profile.options,
      variants: [false, true].map(tracing => ({ tracing, wordHash: digest, rngBoundaryHash: digest, rngCalls: 1000, nextRng: 0.5, legacyTraceHash: tracing ? digest : null })),
    }))),
    observations: profiles.flatMap(profile => profile.seeds.map(seed => ({ profile: profile.id, seed, result: { ...emptyObservation(), words: draws, unavailable: draws, witnesses: [{ draw: 0, word }] } }))),
  };
}

describe("syllable-weight parity observer", () => {
  it("checks candidate evidence against the root stage and preserves historical unavailability", () => {
    const word = example();
    const candidate = emptyObservation();
    observe(word, 0, "candidate", candidate);
    expect(candidate.unavailable).toBe(0);
    expect(candidate.observedSyllables).toBe(word.trace!.stressWeight!.syllables.length);
    expect(candidate.quantity["unknown:unspecified"]).toBeGreaterThan(0);
    delete word.trace!.stressWeight;
    const historical = emptyObservation();
    observe(word, 0, "original", historical);
    expect(historical.unavailable).toBe(1);
    expect(historical.observedSyllables).toBe(0);
    expect(historical.quantity).toEqual({});
    expect(() => observe(word, 0, "candidate", emptyObservation())).toThrow(/missing weight evidence/);
  });

  it("rejects invented quantity and coordinates that do not match the recorded root", () => {
    const word = example();
    word.trace!.stressWeight!.syllables[0].nucleusMoras = 1;
    expect(() => observe(word, 0, "candidate", emptyObservation())).toThrow(/mora count/);
    word.trace!.stressWeight!.syllables[0].nucleusMoras = null;
    word.trace!.stressWeight!.syllables[0].syllableIndex = 1;
    expect(() => observe(word, 0, "candidate", emptyObservation())).toThrow();
  });

  it("rejects duplicate stages and impossible secondary selections", () => {
    const word = example();
    word.trace!.stages.push(word.trace!.stages.find(stage => stage.name === "applyStress")!);
    expect(() => observe(word, 0, "candidate", emptyObservation())).toThrow(/duplicate applyStress/);
    word.trace!.stages.pop();
    word.trace!.stressWeight!.secondary.selectedIndex = 100;
    expect(() => observe(word, 0, "candidate", emptyObservation())).toThrow();
  });

  it("accepts a complete schedule while rejecting duplicate, truncated and mismatched stream records", () => {
    const report = fixtureReport();
    expect(() => validateReport(report)).not.toThrow();
    const duplicate = structuredClone(report);
    duplicate.streams[1] = duplicate.streams[0];
    expect(() => validateReport(duplicate)).toThrow();
    const truncated = structuredClone(report);
    truncated.streams.pop();
    expect(() => validateReport(truncated)).toThrow();
    const observation = structuredClone(report);
    observation.observations[0].seed++;
    expect(() => validateReport(observation)).toThrow();
  });

  it("rejects altered source digests and trace/no-trace RNG divergence", () => {
    const source = fixtureReport();
    source.sourceFiles["src/index.ts"] = "b".repeat(64);
    expect(() => validateReport(source)).toThrow();
    const rng = fixtureReport();
    rng.streams[0].variants[1].rngCalls++;
    expect(() => validateReport(rng)).toThrow(/Trace\/no-trace/);
  });

  it("rejects historical assertions of known observations or out-of-schedule witnesses", () => {
    const known = fixtureReport();
    known.observations[0].result.observedSyllables = 1;
    expect(() => validateReport(known)).toThrow();
    const witness = fixtureReport();
    witness.observations[0].result.witnesses[0].draw = draws;
    expect(() => validateReport(witness)).toThrow();
  });
});
