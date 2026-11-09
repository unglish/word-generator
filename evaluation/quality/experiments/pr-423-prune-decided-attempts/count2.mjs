globalThis.__c={attempts:0,pdMiss:0,prunable:0,pdHit:0,pdHitRejected:0};
const { generateWords } = await import("/private/tmp/claude-501/-Users-ryanbetts--t3-worktrees-word-generator-t3-cc1ba2f2/004d9660-2fab-4571-b417-2f40760b0f98/scratchpad/dist/index.js");
for (const mode of ["lexicon","text"]) for (const morphology of [false,true]) generateWords(5000,{seed:3,mode,morphology});
const c=globalThis.__c; const w=20000; for (const k in c) console.log(k.padEnd(14), (c[k]/w).toFixed(3), "per word", (c[k]/c.attempts*100).toFixed(1)+"% of attempts");
