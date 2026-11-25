import { describe, expect, it } from "vitest";
import {
  createGenerator, createSeededRng, englishConfig, generateWord, generateWords,
  type LanguageConfig, type Word,
} from "../index.js";
import { createWordStreams, STAGE_STREAM_SCHEME } from "./stage-streams.js";

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

describe("per-stage random streams (#556)", () => {
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
    // A stage that runs twice in one attempt resumes its stream.
    const attempt = again.attempt(2);
    expect(attempt("spell")).toBe(attempt("spell"));
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
    // rules it does not draw. At 100 it fires exactly where it draws.
    const drawsWithoutFiring = createGenerator(alternationConfig(0));
    const noDraws = createGenerator(alternationConfig(undefined));
    const alwaysFires = createGenerator(alternationConfig(100));
    let extraDraws = 0;
    for (let seed = 0; seed < 400; seed++) {
      const options = { seed, mode: "lexicon" as const };
      // Attempt 0 runs under every config, so a firing there is a draw at 0 too.
      const { trace } = alwaysFires.generateWord({ ...options, trace: true });
      if (trace!.selection!.selectedAttempt === 0 &&
          trace!.repairs.some(repair => repair.rule === "alternateUnstressedRootNucleus")) extraDraws++;
      expect(untraced(drawsWithoutFiring.generateWord(options)), `seed ${seed}`)
        .toEqual(untraced(noDraws.generateWord(options)));
    }
    // With one shared stream these extra draws would have moved every later
    // spelling and pronunciation draw of the word.
    expect(extraDraws).toBeGreaterThan(40);
  });
});
