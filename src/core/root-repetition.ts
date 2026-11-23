import type { ClusterContext, Syllable } from "../types.js";

/** Reweight the matching coda start and keep the protected starts' original probability. */
export function weightMatchingCoda<T>(
  options: [T, number][],
  firstSound: (option: T) => string,
  { sound, multiplier }: NonNullable<ClusterContext["repetitionPenalty"]>,
  preserved: ReadonlySet<string> | undefined,
): [T, number][] {
  let matchingWeight = 0;
  let movableWeight = 0;
  for (const [option, weight] of options) {
    const first = firstSound(option);
    if (first === sound) {
      matchingWeight += weight;
      movableWeight += weight;
    } else if (!preserved?.has(first)) {
      movableWeight += weight;
    }
  }
  if (matchingWeight === 0 || matchingWeight === movableWeight) return options;

  // Reduce protected weights in step with the movable pool's total weight,
  // so reducing the match cannot transfer probability to a protected start.
  const protectedScale = 1 - matchingWeight * (1 - multiplier) / movableWeight;
  return options.map(([option, weight]) => {
    const first = firstSound(option);
    if (first === sound) return [option, weight * multiplier];
    if (preserved?.has(first)) return [option, weight * protectedScale];
    return [option, weight];
  });
}

export function completesRootNucleusTriple(
  syllables: readonly Syllable[],
  syllableIndex: number,
  target: string,
  root: { start: number; end: number },
): boolean {
  if (syllableIndex < root.start || syllableIndex >= root.end) return false;
  const matches = (index: number) =>
    index >= root.start && index < root.end && syllables[index].nucleus[0]?.sound === target;
  const previous = matches(syllableIndex - 1);
  const next = matches(syllableIndex + 1);
  return (previous && matches(syllableIndex - 2))
    || (previous && next)
    || (next && matches(syllableIndex + 2));
}
