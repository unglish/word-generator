const { generateWord } = await import(process.argv[2] + "/src/index.ts");
for (const seed of [4000197, 4001409, 4001560, 4008080, 4010228, 4011935, 4018194, 4001223, 4009418, 4014744, 4004802, 4026129]) {
  const word = generateWord({ seed, trace: true });
  const base = word.trace?.baseSpelling?.surface ?? word.trace?.orthography?.surface;
  const realization = word.trace?.morphology?.realization;
  console.log(seed, base, realization?.suffix?.resolved.written, word.written.clean, word.pronunciation);
}
