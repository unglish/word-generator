const root = process.argv[2];
const { createSeededRng, drawStreamKey, deriveStreamSeed, hashLabel } = await import(`${root}/src/utils/random.ts`);
const rand = createSeededRng(1);
const stages = ["set_constraints", "spell", "select_segments"].map(hashLabel);
const maps = stages.map(() => new Map<number, number>());
const perStage = stages.map(() => 0); let all = 0;
for (let i = 0; i < 1_000_000; i++) {
  const key = drawStreamKey(rand);
  const seeds = stages.map((h, s) => deriveStreamSeed(key, h, s === 0 ? 0 : 1));
  const hits = seeds.map((seed, s) => { const j = maps[s].get(seed); maps[s].set(seed, i); return j; });
  hits.forEach((j, s) => { if (j !== undefined) perStage[s]++; });
  if (hits[0] !== undefined && hits.every(j => j === hits[0])) all++;
}
console.log({ perStage, wholeWordCollisions: all });
