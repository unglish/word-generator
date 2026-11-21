const { generateWords } = await import(process.argv[2]);
generateWords(3000, { seed: 1 });
const t0 = performance.now(); generateWords(20000, { seed: 7 }); const ms = performance.now() - t0;
console.log((20000 / ms * 1000).toFixed(0));
