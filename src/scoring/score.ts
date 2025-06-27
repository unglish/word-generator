import { Word } from '../types.js';
import { phonemes } from '../elements/phonemes.js';
import { biphoneModel } from './biphoneModel.js';

const PHONEME_SYMBOLS = phonemes
  .map(p => p.sound)
  .sort((a, b) => b.length - a.length);

/**
 * Split an IPA pronunciation string into individual phoneme symbols.
 * Stress marks and punctuation are stripped before tokenization.
 */
function parsePronunciation(pronunciation: string): string[] {
  let remaining = pronunciation.replace(/[ˈˌ\.]/g, '');
  const result: string[] = [];

  while (remaining.length > 0) {
    let matched = false;
    for (const symbol of PHONEME_SYMBOLS) {
      if (remaining.startsWith(symbol)) {
        result.push(symbol);
        remaining = remaining.slice(symbol.length);
        matched = true;
        break;
      }
    }
    if (!matched) {
      result.push(remaining[0]);
      remaining = remaining.slice(1);
    }
  }

  return result;
}

const UNKNOWN_LOG_PROB = Math.log(1e-8);

export interface BiphoneModel {
  [pair: string]: number;
}

/**
 * Score a word or pronunciation string using a biphone log-probability model.
 * The score is the average log probability of each adjacent phone pair.
 * Unknown pairs receive a fixed penalty.
 */
export function scoreWord(
  word: Word | { pronunciation: string } | string,
  model: BiphoneModel = biphoneModel,
): number {
  const pronunciation =
    typeof word === 'string' ? word : word.pronunciation;
  const phones = parsePronunciation(pronunciation);
  if (phones.length < 2) return Number.NEGATIVE_INFINITY;

  let sum = 0;
  for (let i = 0; i < phones.length - 1; i++) {
    const key = `${phones[i]} ${phones[i + 1]}`;
    const logProb = model[key];
    sum += logProb === undefined ? UNKNOWN_LOG_PROB : logProb;
  }

  return sum / (phones.length - 1);
}
