// usage: tsx bench.mts <root> ; prints median words/s over 7 reps of 10k (after warm-up)
const api = await import(`${process.argv[2]}/src/index.ts`);
const gen = api.createGenerator(api.englishConfig);
for (let i = 0; i < 3000; i++) gen.generateWord({ seed: 900000 + i });
const rates: number[] = [];
for (let r = 0; r < 7; r++) {
  const t = performance.now();
  for (let i = 0; i < 10000; i++) gen.generateWord({ seed: r * 10000 + i });
  rates.push(10000 / ((performance.now() - t) / 1000));
}
rates.sort((a, b) => a - b);
console.log(Math.round(rates[3]), rates.map(Math.round).join(","));
