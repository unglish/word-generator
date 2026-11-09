const [baseUrl, candUrl] = process.argv.slice(2);
const base = await import(baseUrl), cand = await import(candUrl);
const mean = (g, seed, opts) => { let s = 0, n = 0; for (const w of g.generateWords(5000, { seed, ...opts })) { s += w.written.clean.length; n++; } return s / n; };
for (const opts of [{ mode: "lexicon", morphology: true }, { mode: "lexicon", morphology: false }, { mode: "text", morphology: false }]) {
  const b = [], c = [];
  for (let seed = 100; seed < 140; seed++) { b.push(mean(base, seed, opts)); c.push(mean(cand, seed, opts)); }
  const avg = a => a.reduce((x, y) => x + y) / a.length;
  const sd = a => Math.sqrt(a.reduce((x, y) => x + (y - avg(a)) ** 2, 0) / (a.length - 1));
  const diff = avg(c) - avg(b), se = Math.sqrt(sd(b) ** 2 / b.length + sd(c) ** 2 / c.length);
  const lower = c.filter((v, i) => v < b[i]).length;
  console.log(JSON.stringify(opts), "main", avg(b).toFixed(4), "branch", avg(c).toFixed(4), "diff", diff.toFixed(4), "z", (diff / se).toFixed(2), `branch lower in ${lower}/40`);
}
