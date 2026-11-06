const api = await import(`${process.argv[2]}/src/index.ts`);
const gen = api.createGenerator(api.englishConfig);
const t = performance.now();
for (let i = 0; i < 20000; i++) gen.generateWord({ seed: i });
const ms = performance.now() - t;
console.log({ totalMs: Math.round(ms), ...(globalThis as any).__cov, ms: Math.round((globalThis as any).__cov.ms) });
