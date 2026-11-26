import { describe, expect, it } from "vitest";
import {
  createGenerator, createSeededRng, englishConfig, generateWord, generateWords,
  type LanguageConfig,
} from "../index.js";
import type { Word } from "../types.js";
import { expectSameWordsAndDraws } from "../test-support/expect-same-draws.js";
import { stageCount, withoutStage, withStageDraws } from "../test-support/stage-stream-probe.js";
import {
  ATTEMPT_STAGES, BETWEEN_STAGES, createWordStreams, deriveStreamSeed, inStage, STAGE_STREAM_SCHEME, WORD_STAGES,
  type Stage,
} from "./stage-streams.js";

function countingRng(seed: number) {
  const stream = createSeededRng(seed);
  const counter = { draws: 0, rand: () => { counter.draws++; return stream(); } };
  return counter;
}

function untraced(word: Word): Omit<Word, "trace"> {
  const copy = { ...word };
  delete copy.trace;
  return copy;
}

/** English with every unstressed-root alternation set to `probability`, or with none. */
function alternationConfig(probability: number | undefined): LanguageConfig {
  const policy = englishConfig.unstressedRootNuclei!;
  if (probability === undefined) return { ...englishConfig, unstressedRootNuclei: undefined };
  const at = (rules: typeof policy.initial) => rules.map(rule => ({ ...rule, probability }));
  return {
    ...englishConfig,
    unstressedRootNuclei: { ...policy, initial: at(policy.initial), final: at(policy.final) },
  };
}

/** The key each scheme's vectors use. */
const VECTOR_KEY = { hi: 0x01234567, lo: 0x89abcdef };

/**
 * Known-answer seeds under each scheme, as [stage, index, seed]. A scheme's
 * vectors never change: a change to the derivation is a new scheme, with new
 * vectors under it. A new stage adds its vector under the current scheme.
 */
const VECTORS: Record<typeof STAGE_STREAM_SCHEME, Array<[Stage, number, number]>> = {
  "stage-streams/1": [
    ["set_constraints", 0, 0xdcfa87f7],
    ["plan_morphology", 0, 0x389f5e60],
    ["plan_shape", 1, 0xe4552a42],
    ["select_segments", 1, 0x0282e1a7],
    ["assign_stress", 1, 0xd3e93052],
    ["post_stress_repair", 1, 0x8f420d90],
    ["preview_morphology", 1, 0x8cff5056],
    ["spell", 1, 0x93129b51],
    ["finalize_root_spelling", 1, 0xc5bf49b7],
    ["render_pronunciation", 1, 0x52076d70],
    ["spell", 3, 0x3e2add64],
  ],
};

/** A caller stream that gives a traced word's key back, `hi` then `lo`. */
function replayKey(key: string): () => number {
  const draws = [key.slice(0, 8), key.slice(8)].map(half => parseInt(half, 16) / 2 ** 32);
  return () => draws.shift()!;
}

describe("per-stage random streams (#556)", () => {
  it("derives the documented seeds for a fixed key", () => {
    // A failure here means every word changes. A change to the derivation needs
    // a new STAGE_STREAM_SCHEME, with its vectors and docs/stage-random-streams.md.
    const key = VECTOR_KEY;
    const vectors = VECTORS[STAGE_STREAM_SCHEME];
    for (const [stage, index, seed] of vectors) expect(deriveStreamSeed(key, stage, index), `${stage} at ${index}`).toBe(seed);
    // Every stage has a vector, so a new or renamed stage fails here too.
    expect(new Set(vectors.map(([stage]) => stage))).toEqual(new Set([...WORD_STAGES, ...ATTEMPT_STAGES]));
    // The caller's two draws become the key, hi then lo, and attempt n reads
    // index n + 1 of a Mulberry32 stream seeded as above.
    const caller = [0x01234567 / 2 ** 32, 0x89abcdef / 2 ** 32];
    const streams = createWordStreams(() => caller.shift()!);
    expect(streams.key).toEqual(key);
    expect(streams.word("set_constraints")()).toBe(0.8011963446624577);
    expect(streams.attempt(0)("spell")()).toBe(0.28082819120027125);
    expect(streams.attempt(2)("render_pronunciation")()).toBe(0.9092820787336677);
  });

  it.each([false, true])("takes exactly two draws per word from the caller's stream (trace %s)", trace => {
    for (const morphology of [false, true]) {
      const counter = countingRng(556);
      generateWords(50, { rand: counter.rand, morphology, trace });
      expect(counter.draws).toBe(100);
    }
  });

  it.each([1, 2, -0.5, NaN])("rejects a caller stream that returns %s", value => {
    expect(() => generateWord({ rand: () => value })).toThrow(RangeError);
  });

  it("gives the same words for a seed and for a caller stream built from it", () => {
    for (const seed of [1, 556, 20261125]) {
      const seeded = generateWord({ seed, trace: true });
      expect(generateWord({ seed, trace: true })).toEqual(seeded);
      expect(generateWord({ rand: createSeededRng(seed), trace: true })).toEqual(seeded);
    }
  });

  it("keeps generateWords deterministic and equal to word-by-word generation over one stream", () => {
    const batch = generateWords(40, { seed: 556, trace: true });
    expect(generateWords(40, { seed: 556, trace: true })).toEqual(batch);
    const rand = createSeededRng(556);
    expect(Array.from({ length: 40 }, () => generateWord({ rand, trace: true }))).toEqual(batch);
    expect(new Set(batch.map(word => word.trace?.random?.key)).size).toBe(40);
  });

  it("regenerates a traced word from its key through the public API", () => {
    const generator = createGenerator(englishConfig);
    for (const options of [{ mode: "lexicon" as const }, { mode: "text" as const, morphology: false }]) {
      for (const word of generateWords(30, { ...options, seed: 556, trace: true })) {
        expect(generator.generateWord({ ...options, rand: replayKey(word.trace!.random!.key), trace: true })).toEqual(word);
      }
    }
  });

  it("refuses to nest stages and leaves the context between stages", () => {
    const streams = createWordStreams(createSeededRng(556));
    const context = { rand: BETWEEN_STAGES, streams: streams.attempt(0) };
    expect(() => inStage(context, "spell", () => inStage(context, "render_pronunciation", () => 0))).toThrow(/do not nest/);
    expect(context.rand).toBe(BETWEEN_STAGES);
    expect(inStage(context, "spell", () => context.rand())).toBe(createWordStreams(createSeededRng(556)).attempt(0)("spell")());
    expect(context.rand).toBe(BETWEEN_STAGES);
  });

  it("records the scheme and the word's key", () => {
    const word = generateWord({ seed: 556, trace: true });
    const key = createWordStreams(createSeededRng(556)).key;
    expect(word.trace?.random).toEqual({
      scheme: STAGE_STREAM_SCHEME,
      key: key.hi.toString(16).padStart(8, "0") + key.lo.toString(16).padStart(8, "0"),
    });
  });

  it("derives independent streams by stage and attempt", () => {
    const streams = createWordStreams(createSeededRng(556));
    const again = createWordStreams(createSeededRng(556));
    const first = (rand: () => number) => Array.from({ length: 4 }, rand);
    const spell = first(streams.attempt(0)("spell"));
    // Draws from one stage leave another stage's stream where it was.
    first(again.attempt(0)("select_segments"));
    expect(first(again.attempt(0)("spell"))).toEqual(spell);
    expect(first(streams.attempt(1)("spell"))).not.toEqual(spell);
    expect(first(streams.attempt(0)("render_pronunciation"))).not.toEqual(spell);
    expect(first(streams.word("set_constraints"))).not.toEqual(spell);
    expect(first(streams.word("plan_morphology"))).not.toEqual(first(again.word("set_constraints")));
    // A stage that runs twice resumes its stream, even through a second attempt(n).
    const fresh = createWordStreams(createSeededRng(556));
    expect([again.attempt(2)("spell")(), again.attempt(2)("spell")()]).toEqual(first(fresh.attempt(2)("spell")).slice(0, 2));
    expect([again.word("plan_morphology")(), again.word("plan_morphology")()])
      .toEqual(first(fresh.word("plan_morphology")).slice(0, 2));
  });

  it.each(["text", "lexicon"] as const)("gives the same words and stage draws with tracing on or off (%s)", mode => {
    for (const morphology of [false, true]) {
      for (let seed = 0; seed < 200; seed++) {
        const options = { seed, mode, morphology };
        expectSameWordsAndDraws(() => generateWord({ ...options, trace: true }), () => generateWord(options), `seed ${seed}`);
      }
    }
  });

  it("gives a word whose affix plan is bare the same root as with morphology off", () => {
    // The affix plan draws from its own stream, so it cannot move the root
    // length and edge draws. With one shared stream, affix draws sat between them.
    let bare = 0;
    for (let seed = 0; seed < 300; seed++) {
      const options = { seed, mode: "lexicon" as const };
      const affixed = generateWord({ ...options, morphology: true, trace: true });
      if ((affixed.trace!.morphology?.template ?? "bare") !== "bare") continue;
      bare++;
      expect(untraced(affixed), `seed ${seed}`).toEqual(generateWord({ ...options, morphology: false }));
    }
    expect(bare).toBeGreaterThan(100);
  });

  it("leaves every other stage's draws unchanged when one stage draws more", () => {
    // Alternation draws only for an eligible syllable, before comparing the
    // roll with the rule's probability. At 0 it draws without firing; with no
    // rules it does not draw.
    const drawsWithoutFiring = createGenerator(alternationConfig(0));
    const noDraws = createGenerator(alternationConfig(undefined));
    let drewMore = 0;
    for (let seed = 0; seed < 400; seed++) {
      const options = { seed, mode: "lexicon" as const };
      const drawn = withStageDraws(() => drawsWithoutFiring.generateWord(options));
      const notDrawn = withStageDraws(() => noDraws.generateWord(options));
      expect(drawn.value, `seed ${seed}`).toEqual(notDrawn.value);
      expect(withoutStage(drawn.draws, "post_stress_repair"), `seed ${seed}`)
        .toEqual(withoutStage(notDrawn.draws, "post_stress_repair"));
      if (stageCount(drawn.draws, "post_stress_repair") > stageCount(notDrawn.draws, "post_stress_repair")) drewMore++;
    }
    // About 140 seeds in 400 draw more (106 to 153 over 20 windows). With one
    // shared stream these draws would have moved every later draw of the word.
    expect(drewMore).toBeGreaterThan(60);
  });
});
