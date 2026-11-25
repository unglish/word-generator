const root = process.argv[2];
const { generateWord } = await import(`${root}/src/index.ts`);
const rows = [];
for (let seed = 1; seed <= 20; seed++) {
  const w = generateWord({ seed });
  rows.push({ seed, written: w.written.clean, ipa: w.pronunciation });
}
console.log(JSON.stringify(rows));
