/**
 * Checks that each generation stage draws from its own stream (#556).
 *
 * The stage stream probe shifts one stage's draws (`(r + 0.5) % 1`). Shifting a
 * stage must change some words, which shows the stage reads its own stream;
 * shifting it must leave what it cannot affect alone, which shows no other
 * stage reads it.
 */
import { describe, expect, it } from "vitest";
import { createGenerator, englishConfig, generateWord } from "../index.js";
import type { Word, WordGenerationOptions } from "../types.js";
import {
  attemptStageCount, stageCount, withShiftedStage, withStageDraws, withStageRuns, type StageDraws,
} from "../test-support/stage-stream-probe.js";
import { FINISHING_STAGES, followsRunOrder, stagesBefore, wordKind, type WordKind } from "../test-support/stage-run-order.js";
import { ATTEMPT_STAGES, WORD_STAGES, type Stage } from "./stage-streams.js";

const SEEDS = Array.from({ length: 300 }, (_, i) => 556_000 + i);

function untraced(word: Word): Omit<Word, "trace"> {
  const copy = { ...word };
  delete copy.trace;
  return copy;
}

function generate(options: WordGenerationOptions, stage?: Stage, attempts?: (attempt: number) => boolean): Word {
  const run = () => generateWord({ ...options, mode: "lexicon", trace: true });
  return stage ? withShiftedStage(stage, run, attempts) : run();
}

const selected = (word: Word) => word.trace!.selection!.selectedAttempt;
const gapSpelled = (word: Word) => word.trace!.repairs.some(repair => repair.rule.startsWith("gapSpelling:"));

describe("stage stream wiring (#556)", () => {
  // Every stage, with the morphology setting under which it draws. A bare and
  // an affixed word render their pronunciation at different points, so that
  // stage is checked under both.
  const affixStages: ReadonlySet<Stage> = new Set(["plan_morphology", "preview_morphology"]);
  const stages: ReadonlyArray<[Stage, boolean]> = [
    ...[...WORD_STAGES, ...ATTEMPT_STAGES].map((stage): [Stage, boolean] => [stage, affixStages.has(stage)]),
    ["render_pronunciation", true],
  ];

  // preview_morphology draws only for hiatus bridges and rare re-picks, so the
  // search runs past the shared sample.
  it.each(stages)("%s reads its own stream (morphology %s)", (stage, morphology) => {
    const changes = (seed: number) =>
      JSON.stringify(untraced(generate({ seed, morphology }, stage))) !==
      JSON.stringify(untraced(generate({ seed, morphology })));
    const witness = Array.from({ length: 5_000 }, (_, i) => 556_000 + i).find(changes);
    expect(witness, `a word that shifting ${stage} changes`).toBeDefined();
  });

  // A bare word's gap spellings match its realized syllables, so pronunciation
  // draws can change which applies; the spelling is compared without them.
  it.each([false, true])("spelling and pronunciation streams leave each other and the root alone (morphology %s)", morphology => {
    let compared = 0;
    for (const seed of SEEDS) {
      const base = generate({ seed, morphology });
      const spelled = generate({ seed, morphology }, "spell");
      const finalized = generate({ seed, morphology }, "finalize_root_spelling");
      const rendered = generate({ seed, morphology }, "render_pronunciation");
      for (const word of [spelled, finalized, rendered]) {
        if (selected(word) !== selected(base)) continue;
        compared++;
        expect(word.lexical, `seed ${seed}`).toEqual(base.lexical);
      }
      if (selected(spelled) === selected(base)) expect(spelled.pronunciation, `seed ${seed}`).toBe(base.pronunciation);
      expect(finalized.pronunciation, `seed ${seed}`).toBe(base.pronunciation);
      if (selected(rendered) === selected(base) && !gapSpelled(base) && !gapSpelled(rendered))
        expect(rendered.written, `seed ${seed}`).toEqual(base.written);
    }
    expect(compared).toBeGreaterThan(SEEDS.length);
  });

  it.each([false, true])("runs every attempt's stages in the recorded order (morphology %s)", morphology => {
    for (const seed of SEEDS) {
      const { value, runs } = withStageRuns(() => generate({ seed, morphology }));
      for (const [attempt, stages] of runs.entries()) {
        expect(followsRunOrder(wordKind(value), stages), `seed ${seed}, attempt ${attempt}: ${stages.join(" > ")}`).toBe(true);
      }
    }
  });

  // The golden fixture records first-attempt draws per stage on this property:
  // a change to one stage leaves the draws of every stage that runs before it.
  // preview_morphology is left out: its first attempt draws in about one word in
  // 1,000, too rarely for this search. Its own-stream test above still covers it.
  const shiftable = ATTEMPT_STAGES.slice(1).filter(stage => stage !== "preview_morphology");
  it.each(shiftable)("shifting %s leaves the first attempt's earlier stages' draws alone", stage => {
    const counts = (kind: WordKind, draws: StageDraws) => [
      ...WORD_STAGES.map(before => stageCount(draws, before)),
      ...stagesBefore(kind, stage).map(before => attemptStageCount(draws, before, 0)),
    ];
    // Only words whose first attempt draws from the shifted stage can show a moved draw.
    let drew = 0;
    for (let seed = 556_000; seed < 566_000 && drew < 40; seed++) {
      const base = withStageDraws(() => generate({ seed, morphology: true }));
      if (!attemptStageCount(base.draws, stage, 0)) continue;
      const shifted = withStageDraws(() => generate({ seed, morphology: true }, stage));
      const kind = wordKind(base.value);
      drew++;
      expect(counts(kind, shifted.draws), `seed ${seed}`).toEqual(counts(kind, base.draws));
    }
    expect(drew, `words whose first attempt draws from ${stage}`).toBe(40);
  });

  it("draws a bare word's gap spelling choice from its spell stream", () => {
    // A weighted pair of overrides for a common monosyllable, so the choice draws.
    const generator = createGenerator({
      ...englishConfig,
      gapSpellings: ["braw", "brau"].map(replacement => ({
        name: replacement, phonemes: ["b", "r", "ɔ"], replacement, weight: 50, targetLayer: "grapheme" as const,
      })),
    });
    const options = { mode: "text", morphology: false, syllableCount: 1, trace: true } as const;
    let gapWords = 0, flipped = 0;
    for (let seed = 0; seed < 20_000 && gapWords < 12; seed++) {
      const run = () => generator.generateWord({ ...options, seed });
      const base = run();
      if (!gapSpelled(base)) continue;
      gapWords++;
      expect(withShiftedStage("render_pronunciation", run).written, `seed ${seed}`).toEqual(base.written);
      const spelled = withShiftedStage("spell", run);
      if (selected(spelled) === selected(base) && spelled.written.clean !== base.written.clean) flipped++;
    }
    expect(gapWords).toBe(12);
    expect(flipped).toBeGreaterThan(0);
  });

  // A finishing stage runs once, for the selected attempt, after every attempt
  // has run. Only words whose selected attempt is a later one, and whose
  // finishing stage draws, can tell its streams apart from attempt 0's or the
  // last attempt's. Medial doubling draws for about one such word in 120.
  it.each([
    { stage: "finalize_root_spelling", morphology: false, words: 15, changed: 5, notLast: 0 },
    { stage: "finalize_root_spelling", morphology: true, words: 15, changed: 5, notLast: 0 },
    { stage: "render_pronunciation", morphology: true, words: 150, changed: 50, notLast: 3 },
  ] as const)("$stage uses the selected attempt's stream (morphology $morphology)", ({
    stage, morphology, words, changed, notLast,
  }) => {
    const counts = { words: 0, changed: 0, notLast: 0 };
    for (let seed = 556_000; seed < 566_000 && counts.words < words; seed++) {
      const { value: base, draws } = withStageDraws(() => generate({ seed, morphology }));
      const chosen = selected(base);
      if (chosen === 0 || !FINISHING_STAGES[wordKind(base)].has(stage) || !attemptStageCount(draws, stage, chosen)) continue;
      counts.words++;
      expect(untraced(generate({ seed, morphology }, stage, attempt => attempt !== chosen)), `seed ${seed}`)
        .toEqual(untraced(base));
      const shifted = generate({ seed, morphology }, stage, attempt => attempt === chosen);
      if (JSON.stringify(untraced(shifted)) !== JSON.stringify(untraced(base))) counts.changed++;
      // A fallback can select an attempt before the last one run.
      if (chosen !== base.trace!.selection!.attemptsExecuted - 1) counts.notLast++;
    }
    expect(counts.words, `words whose selected later attempt draws from ${stage}`).toBe(words);
    expect(counts.changed, "words that shifting the selected attempt's stream changes").toBeGreaterThanOrEqual(changed);
    expect(counts.notLast, "words whose selected attempt is not the last one run").toBeGreaterThanOrEqual(notLast);
  });
});
