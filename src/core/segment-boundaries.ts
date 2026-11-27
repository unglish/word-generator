import type { LanguageConfig } from "../config/language.js";
import type { Phoneme, Syllable } from "../types.js";
import getWeightedOption, { coinFlip } from "../utils/getWeightedOption.js";
import type { RNG } from "../utils/random.js";
import { classifySspViolation, hasRisingCodaTowardBoundary, validateJunction } from "./junction.js";
import type { StructuralRecorder } from "./segment-selection.js";

/** Apply the configured drops, then trim the left coda until the junction is legal. */
export function adjustBoundary(
  policy: { config: LanguageConfig; sonorityLevels: ReadonlyMap<Phoneme, number> },
  prevSyllable: Syllable,
  currentSyllable: Syllable,
  rand: RNG,
  rightSyllableIndex: number,
  trace?: StructuralRecorder,
): void {
  const leftSyllableIndex = rightSyllableIndex - 1;
  const lastCodaPhoneme = prevSyllable.coda.at(-1);
  const firstOnsetPhoneme = currentSyllable.onset[0];

  if (!lastCodaPhoneme || !firstOnsetPhoneme)
    return;

  const lastCodaSonority = policy.sonorityLevels.get(lastCodaPhoneme) ?? 0;
  const firstOnsetSonority = policy.sonorityLevels.get(firstOnsetPhoneme) ?? 0;
  const { equalSonorityDrop, risingCodaDrop } =
    policy.config.generationWeights.boundaryPolicy;
  if (
    firstOnsetSonority === lastCodaSonority &&
    coinFlip(rand, equalSonorityDrop)
  ) {
    trace?.recordStructural({
      event: "boundaryDrop",
      dropped: lastCodaPhoneme.sound,
      beforeOnset: firstOnsetPhoneme.sound,
      equalSonority: lastCodaSonority,
      probability: equalSonorityDrop,
      leftSyllableIndex,
      rightSyllableIndex,
    });
    prevSyllable.coda.pop();
  }

  if (
    prevSyllable.coda.length > 0 &&
    currentSyllable.onset.length > 0 &&
    hasRisingCodaTowardBoundary(prevSyllable.coda, policy.config) &&
    coinFlip(rand, risingCodaDrop)
  ) {
    const preDropCoda = prevSyllable.coda.map((p) => p.sound);
    const dropped = prevSyllable.coda.pop()!;
    trace?.recordStructural({
      event: "risingCodaBoundaryDrop",
      dropped: dropped.sound,
      preDropCoda,
      remainingCoda: prevSyllable.coda.map((p) => p.sound),
      onset: currentSyllable.onset.map((p) => p.sound),
      probability: risingCodaDrop,
      leftSyllableIndex,
      rightSyllableIndex,
    });
  }

  const maxDrops = prevSyllable.coda.length;
  for (let d = 0; d < maxDrops; d++) {
    if (prevSyllable.coda.length === 0) break;
    if (validateJunction(prevSyllable.coda, currentSyllable.onset, policy.config))
      break;
    const violation = classifySspViolation(
      prevSyllable.coda,
      currentSyllable.onset,
      policy.config,
    );
    const preDropCoda = prevSyllable.coda.map((p) => p.sound);
    const dropped = prevSyllable.coda.pop()!;
    if (violation) {
      trace?.recordStructural({
        event: "sspBoundaryDrop",
        dropped: dropped.sound,
        preDropCoda,
        remainingCoda: prevSyllable.coda.map((p) => p.sound),
        onset: currentSyllable.onset.map((p) => p.sound),
        violation,
        leftSyllableIndex,
        rightSyllableIndex,
      });
      continue;
    }
    trace?.recordStructural({
      event: "junctionBoundaryDrop",
      dropped: dropped.sound,
      preDropCoda,
      remainingCoda: prevSyllable.coda.map((p) => p.sound),
      onset: currentSyllable.onset.map((p) => p.sound),
      leftSyllableIndex,
      rightSyllableIndex,
    });
  }
}

/** After segment selection, bridge each remaining open vowel-to-vowel boundary. */
export function repairVowelHiatus(
  bridgeOptions: [Phoneme, number][],
  syllables: Syllable[],
  rand: RNG,
  trace?: StructuralRecorder,
): void {
  if (bridgeOptions.length === 0) return;

  for (let i = 1; i < syllables.length; i++) {
    const prev = syllables[i - 1];
    const curr = syllables[i];

    if (prev.coda.length === 0 && curr.onset.length === 0) {
      const bridge = getWeightedOption(bridgeOptions, rand);
      curr.onset.unshift(bridge);
      trace?.recordStructural({
        event: "vowelHiatusFallback",
        inserted: bridge.sound,
        leftSyllableIndex: i - 1,
        rightSyllableIndex: i,
      });
    }
  }
}
