const api = await import(`${process.argv[2]}/src/index.ts`);
const gen = api.createGenerator(api.englishConfig);
for (const mode of ["lexicon", "text"] as const) for (let i = 0; i < 100000; i++) gen.generateWord({ seed: 5_000_000 + i, mode });
const out = (globalThis as any).__cov.out;
console.log(JSON.stringify(out));
