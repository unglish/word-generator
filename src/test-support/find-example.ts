/**
 * Test-only helpers for locating example words by property.
 *
 * Behavior tests must not pin a particular seed or draw index to a particular
 * word: any change to RNG consumption moves every later word. Instead, scan a
 * small, deterministic range of seeds through the public API and take the
 * first word that has the property under test. Exact output is recorded once,
 * in the golden fixture (`npm run golden:update`).
 *
 * Not part of the published build (excluded in tsconfig.json).
 */
import { generateWord } from "../index.js";
import type { Word, WordGenerationOptions } from "../types.js";

/** Anything with the public `generateWord` signature, e.g. `createGenerator(config)`. */
export interface WordSource {
  generateWord(options?: WordGenerationOptions): Word;
}

export interface SeedSearch {
  /** Describes the property in the failure message, e.g. "a b before terminal y". */
  property: string;
  /** Number of consecutive seeds to scan. Keep it a few times the expected gap. */
  limit: number;
  /** First seed scanned. Defaults to 0. */
  firstSeed?: number;
}

export interface ExampleSearch extends SeedSearch {
  /** Generator to sample from. Defaults to the default English generator. */
  generator?: WordSource;
  /** Options applied to every candidate. `seed` and `trace: true` are supplied. */
  options?: Omit<WordGenerationOptions, "seed" | "rand" | "trace">;
}

export interface Example {
  seed: number;
  /** The traced word that satisfied the predicate. */
  word: Word;
  /** Options that regenerate `word`; override `trace` to compare untraced output. */
  options: WordGenerationOptions & { seed: number; trace: true };
}

/**
 * Returns the first non-undefined result of `probe` over consecutive seeds.
 * Throws when none is found: the property became unreachable (or rarer than the
 * bound allows), which is a real signal rather than a seed to re-pick.
 */
export function searchSeeds<T>(search: SeedSearch, probe: (seed: number) => T | undefined): T {
  const firstSeed = search.firstSeed ?? 0;
  for (let seed = firstSeed; seed < firstSeed + search.limit; seed++) {
    const found = probe(seed);
    if (found !== undefined) return found;
  }
  throw new Error(
    `No example of ${search.property} within ${search.limit} words (seeds ${firstSeed}..${firstSeed + search.limit - 1}). `
    + "The behavior may have become unreachable or much rarer; investigate before raising the bound.",
  );
}

/** Finds the first traced word, by seed, that satisfies `predicate`. */
export function findExample(predicate: (word: Word) => boolean, search: ExampleSearch): Example {
  const generator = search.generator ?? { generateWord };
  return searchSeeds(search, seed => {
    const options = { ...search.options, seed, trace: true as const };
    const word = generator.generateWord(options);
    return predicate(word) ? { seed, word, options } : undefined;
  });
}
