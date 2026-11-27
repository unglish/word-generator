import { foldFor, matchedPercentile, type ReferenceDescriptor, type Symbols } from "./scorer.js";

/**
 * Guide metrics reported next to UCI as context, never as gates. They read the same opaque
 * reference rows as UCI, so no inventory-specific symbol appears here.
 */
export const GUIDE_VERSION = "guide-metrics-v1";
export const TRIGRAM_SMOOTHING = 0.1;
/** A pair is rare when at most this many reference rows contain it anywhere. */
export const RARE_PAIR_MAX_ROWS = 4;

export interface TrigramScore {
  /** Mean natural-log probability per predicted symbol, including the word end. */
  raw: number;
  percentile: number | null;
  fold: number;
  peers: number;
}

export interface PhoneTrigramScorer {
  score(symbols: Symbols): TrigramScore;
  vocabulary: number;
}

type Counts = Map<string, number>;
interface Model { events: Counts; contexts: Counts }

// `null` marks a word edge, so no string symbol can collide with it.
function* events(symbols: Symbols): Generator<{ event: string; context: string }> {
  const padded: Array<string | null> = [null, null, ...symbols, null];
  for (let i = 2; i < padded.length; i++) {
    yield { event: JSON.stringify(padded.slice(i - 2, i + 1)), context: JSON.stringify(padded.slice(i - 2, i)) };
  }
}

function bump(counts: Counts, key: string): void {
  counts.set(key, (counts.get(key) ?? 0) + 1);
}

/**
 * A second-order phone model with additive smoothing, held out by the same folds as UCI. It
 * conditions each symbol on the two before it, ignores absolute position and counts every
 * token, so it disagrees with UCI where position or longer context matters.
 */
export function fitPhoneTrigram(descriptor: ReferenceDescriptor, rows: readonly Symbols[]): PhoneTrigramScorer {
  if (rows.length === 0) throw new Error("The trigram model needs a nonempty reference.");
  const foldSpec = { ...descriptor.fold };
  const folds = rows.map(symbols => foldFor(symbols, foldSpec));
  const all: Model = { events: new Map(), contexts: new Map() };
  const held = new Map<number, Model>();
  const symbols = new Set<string>();
  for (const [index, row] of rows.entries()) {
    const model = held.get(folds[index]) ?? { events: new Map(), contexts: new Map() };
    held.set(folds[index], model);
    for (const symbol of row) symbols.add(symbol);
    for (const { event, context } of events(row)) {
      bump(all.events, event); bump(all.contexts, context);
      bump(model.events, event); bump(model.contexts, context);
    }
  }
  // Every reference symbol plus the word end can follow a context.
  const vocabulary = symbols.size + 1;
  function raw(row: Symbols, fold: number): number {
    const excluded = held.get(fold);
    let total = 0, count = 0;
    for (const { event, context } of events(row)) {
      const e = (all.events.get(event) ?? 0) - (excluded?.events.get(event) ?? 0);
      const c = (all.contexts.get(context) ?? 0) - (excluded?.contexts.get(context) ?? 0);
      total += Math.log((e + TRIGRAM_SMOOTHING) / (c + TRIGRAM_SMOOTHING * vocabulary));
      count++;
    }
    return total / count;
  }
  const peers = new Map<string, number[]>();
  const peerKey = (fold: number, length: number) => `${fold}/${length}`;
  for (const [index, row] of rows.entries()) {
    const key = peerKey(folds[index], row.length);
    const group = peers.get(key) ?? [];
    peers.set(key, group);
    group.push(raw(row, folds[index]));
  }
  for (const group of peers.values()) group.sort((a, b) => a - b);
  return {
    vocabulary,
    score(row) {
      const fold = foldFor(row, foldSpec);
      const value = raw(row, fold);
      const group = peers.get(peerKey(fold, row.length)) ?? [];
      return { raw: value, percentile: matchedPercentile(group, value), fold, peers: group.length };
    },
  };
}

export interface RarePair { symbols: [string, string]; referenceRows: number }

export interface ReferenceMembership {
  /** Adjacent pairs, anywhere in the word, found in at most `RARE_PAIR_MAX_ROWS` reference rows. */
  rarePairs(symbols: Symbols): RarePair[];
  /** Whether any reference row has exactly these symbols. */
  isReferencePronunciation(symbols: Symbols): boolean;
  isReferenceSpelling(spelling: string): boolean;
  /** Share of reference rows with a rare pair once that row's own vote is removed. */
  referenceRarePairRate: { numerator: number; denominator: number; rate: number };
}

function pairKeys(symbols: Symbols): string[] {
  const keys: string[] = [];
  for (let i = 1; i < symbols.length; i++) keys.push(JSON.stringify([symbols[i - 1], symbols[i]]));
  return keys;
}

/** Each reference row is one spelling's vote; `spellings[i]` spells `rows[i]`. */
export function fitMembership(rows: readonly Symbols[], spellings: readonly string[]): ReferenceMembership {
  if (rows.length !== spellings.length) throw new Error("Every reference row needs its spelling.");
  const pairRows = new Map<string, number>();
  for (const row of rows) for (const key of new Set(pairKeys(row))) bump(pairRows, key);
  const pronunciations = new Set(rows.map(row => JSON.stringify(row)));
  const spelled = new Set(spellings);
  const rare = (key: string, own: number) => (pairRows.get(key) ?? 0) - own <= RARE_PAIR_MAX_ROWS;
  const numerator = rows.filter(row => pairKeys(row).some(key => rare(key, 1))).length;
  return {
    rarePairs(symbols) {
      return pairKeys(symbols).flatMap((key, i) => rare(key, 0)
        ? [{ symbols: [symbols[i], symbols[i + 1]] as [string, string], referenceRows: pairRows.get(key) ?? 0 }]
        : []);
    },
    isReferencePronunciation: symbols => pronunciations.has(JSON.stringify(symbols)),
    isReferenceSpelling: spelling => spelled.has(spelling.toLowerCase()),
    referenceRarePairRate: { numerator, denominator: rows.length, rate: numerator / rows.length },
  };
}

/** Share of draws in one batch that repeat an earlier draw's form. */
export function duplicateRate(forms: readonly string[]) {
  const distinct = new Set(forms).size;
  return { draws: forms.length, distinct, rate: forms.length ? 1 - distinct / forms.length : null };
}
