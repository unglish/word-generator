import { Word } from '../types.js';
import { phonemes } from '../elements/phonemes.js';
import { biphoneModel } from './biphoneModel.js';

const PHONEME_SYMBOLS = phonemes.map(p => p.sound).sort((a, b) => b.length - a.length);

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

export function scoreWord(word: Word): number {
  const phones = parsePronunciation(word.pronunciation);
  if (phones.length < 2) return Number.NEGATIVE_INFINITY;

  let sum = 0;
  for (let i = 0; i < phones.length - 1; i++) {
    const key = `${phones[i]} ${phones[i + 1]}`;
    const logProb = biphoneModel[key];
    sum += logProb === undefined ? UNKNOWN_LOG_PROB : logProb;
  }

  return sum / (phones.length - 1);
}
