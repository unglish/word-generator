import { createHash } from "node:crypto";

export const SCORER_VERSION = "positional-uci-v1";
export interface ReferenceDescriptor {
  schemaVersion: 1;
  id: string;
  sampling: string;
  projection: string;
  fold: {
    algorithm: "sha256-first-u64be-mod";
    encoding: "json-string-array-v1" | "space-separated-ascii-uppercase-v1";
    count: number;
  };
  provenance: Readonly<Record<string, string>>;
}

export type Symbols = readonly string[];
export interface GramScore {
  raw: number;
  percentile: number | null;
}
export interface Score {
  length: number;
  fold: number;
  peers: number;
  unigram: GramScore;
  bigram: GramScore;
}
export interface Contribution {
  position: number;
  symbols: Symbols;
  count: number;
  reaching: number;
  probability: number;
}

function encode(symbols: Symbols, encoding: ReferenceDescriptor["fold"]["encoding"]): string {
  if (!symbols.length || symbols.some(symbol => typeof symbol !== "string")) {
    throw new Error("A phone sequence must contain at least one string symbol.");
  }
  if (encoding === "json-string-array-v1") return JSON.stringify(symbols);
  if (encoding !== "space-separated-ascii-uppercase-v1") throw new Error("Unknown UCI fold encoding.");
  if (symbols.some(symbol => !/^[A-Z]+$/.test(symbol))) {
    throw new Error("Space-delimited fold encoding requires uppercase ASCII symbols.");
  }
  return symbols.join(" ");
}

export function foldFor(symbols: Symbols, { count, algorithm, encoding }: ReferenceDescriptor["fold"]): number {
  if (algorithm !== "sha256-first-u64be-mod" || !Number.isSafeInteger(count) || count < 2) {
    throw new Error("Invalid UCI fold definition.");
  }
  return Number(createHash("sha256").update(encode(symbols, encoding)).digest().readBigUInt64BE() % BigInt(count));
}

interface Counts {
  reaching: number;
  grams: Map<string, number>;
}
type Positions = Counts[];
type GramSize = 1 | 2;

function gramKey(symbols: Symbols, position: number, size: GramSize): string {
  return size === 1 ? symbols[position] : JSON.stringify([symbols[position], symbols[position + 1]]);
}

function add(positions: Positions, symbols: Symbols, size: GramSize): void {
  for (let position = 0; position <= symbols.length - size; position++) {
    const bucket = positions[position] ??= { reaching: 0, grams: new Map() };
    const key = gramKey(symbols, position, size);
    bucket.reaching++;
    bucket.grams.set(key, (bucket.grams.get(key) ?? 0) + 1);
  }
}

function rawScore(all: Positions, held: Positions, symbols: Symbols, size: GramSize, contributions?: Contribution[]): number {
  let raw = 1;
  for (let position = 0; position <= symbols.length - size; position++) {
    const key = gramKey(symbols, position, size);
    const reaching = (all[position]?.reaching ?? 0) - (held[position]?.reaching ?? 0);
    const count = (all[position]?.grams.get(key) ?? 0) - (held[position]?.grams.get(key) ?? 0);
    const probability = reaching === 0 ? 0 : count / reaching;
    raw += probability;
    contributions?.push({ position, symbols: symbols.slice(position, position + size), count, reaching, probability });
  }
  return raw;
}

function bound(sorted: readonly number[], score: number, inclusive: boolean): number {
  let low = 0;
  let high = sorted.length;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (sorted[mid] < score || (inclusive && sorted[mid] === score)) low = mid + 1;
    else high = mid;
  }
  return low;
}

function percentile(sorted: number[], raw: number): number | null {
  if (!sorted.length) return null;
  const lower = bound(sorted, raw, false);
  const equal = bound(sorted, raw, true) - lower;
  return 100 * (lower + equal / 2) / sorted.length;
}

interface Totals { unigram: Positions; bigram: Positions }
interface Peers { unigram: number[]; bigram: number[] }
const totals = (): Totals => ({ unigram: [], bigram: [] });
const peers = (): Peers => ({ unigram: [], bigram: [] });

export interface UciScorer {
  score(symbols: Symbols): Score;
  explain(symbols: Symbols): { unigram: Contribution[]; bigram: Contribution[] };
  /** Descriptive positional counts from the entire reference, shared by both arms of a comparison. */
  referenceBigrams(symbols: Symbols): Contribution[];
}

/** Each input row casts one vote. Identical symbol sequences share a fold. */
export function fitUci(descriptor: ReferenceDescriptor, rows: readonly Symbols[]): UciScorer {
  if (descriptor.schemaVersion !== 1 || rows.length === 0) throw new Error("UCI needs a versioned, nonempty reference.");
  const foldSpec = { ...descriptor.fold };
  const folds = rows.map(symbols => foldFor(symbols, foldSpec));
  const all = totals();
  const held = new Map<number, Totals>();
  for (const [index, symbols] of rows.entries()) {
    const fold = folds[index];
    const counts = held.get(fold) ?? totals();
    held.set(fold, counts);
    add(all.unigram, symbols, 1);
    add(all.bigram, symbols, 2);
    add(counts.unigram, symbols, 1);
    add(counts.bigram, symbols, 2);
  }

  const byFold = new Map<number, Map<number, Peers>>();
  function raw(symbols: Symbols, fold: number, details?: { unigram: Contribution[]; bigram: Contribution[] }) {
    const excluded = held.get(fold) ?? totals();
    return {
      unigram: rawScore(all.unigram, excluded.unigram, symbols, 1, details?.unigram),
      bigram: rawScore(all.bigram, excluded.bigram, symbols, 2, details?.bigram),
    };
  }

  for (const [index, symbols] of rows.entries()) {
    const fold = folds[index];
    const byLength = byFold.get(fold) ?? new Map<number, Peers>();
    byFold.set(fold, byLength);
    const group = byLength.get(symbols.length) ?? peers();
    byLength.set(symbols.length, group);
    const scores = raw(symbols, fold);
    group.unigram.push(scores.unigram);
    group.bigram.push(scores.bigram);
  }
  for (const groups of byFold.values()) {
    for (const group of groups.values()) {
      group.unigram.sort((a, b) => a - b);
      group.bigram.sort((a, b) => a - b);
    }
  }

  return {
    score(symbols) {
      const fold = foldFor(symbols, foldSpec);
      const result = raw(symbols, fold);
      const group = byFold.get(fold)?.get(symbols.length) ?? peers();
      return {
        length: symbols.length, fold, peers: group.unigram.length,
        unigram: { raw: result.unigram, percentile: percentile(group.unigram, result.unigram) },
        bigram: { raw: result.bigram, percentile: percentile(group.bigram, result.bigram) },
      };
    },
    explain(symbols) {
      const details: { unigram: Contribution[]; bigram: Contribution[] } = { unigram: [], bigram: [] };
      raw(symbols, foldFor(symbols, foldSpec), details);
      return details;
    },
    referenceBigrams(symbols) {
      encode(symbols, foldSpec.encoding);
      const contributions: Contribution[] = [];
      rawScore(all.bigram, [], symbols, 2, contributions);
      return contributions;
    },
  };
}
