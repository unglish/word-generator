// Paired per-word diff: same independent seed on base and head.
// usage: tsx paired.mts <baseRoot> <headRoot> [words]
const [baseRoot, headRoot] = process.argv.slice(2);
const N = Number(process.argv[4] ?? 20000);
const base = await import(`${baseRoot}/src/index.ts`);
const head = await import(`${headRoot}/src/index.ts`);
const profiles: Record<string, object> = {
  "monosyllables-bare": { mode: "lexicon", morphology: false, syllableCount: 1 },
  "lexicon-bare": { mode: "lexicon", morphology: false },
  "text-default": { mode: "text" },
};
const bump = (t: Record<string, number>, k: string, n = 1) => { t[k] = (t[k] ?? 0) + n; };
const out: any = {};
for (const [id, opts] of Object.entries(profiles)) {
  let changed = 0, samePhones = 0, longer = 0, shorter = 0, lenDelta = 0;
  const byOutcome: Record<string, number> = {};
  const gained: Record<string, number> = {}, lost: Record<string, number> = {};
  const examples: Record<string, string[]> = {};
  for (let i = 0; i < N; i++) {
    const seed = 7_000_000 + i;
    const a = base.generateWord({ ...opts, seed, trace: true });
    const b = head.generateWord({ ...opts, seed, trace: true });
    const sa = a.written.clean, sb = b.written.clean;
    if (sa === sb) continue;
    changed++;
    const pa = a.pronunciation ?? a.syllables.map((s: any) => [...s.onset, ...s.nucleus, ...s.coda].map((p: any) => p.sound).join(" ")).join(" . ");
    const pb = b.pronunciation ?? b.syllables.map((s: any) => [...s.onset, ...s.nucleus, ...s.coda].map((p: any) => p.sound).join(" ")).join(" . ");
    if (pa === pb) samePhones++;
    lenDelta += sb.length - sa.length;
    if (sb.length > sa.length) longer++; else if (sb.length < sa.length) shorter++;
    const budgets = b.trace?.spellingBudgets ?? [];
    const statuses = [...new Set(budgets.filter((x: any) => x.status !== "satisfied").map((x: any) => `${x.scope}:${x.status}${x.reason ? `(${x.reason})` : ""}`))].sort();
    const key = pa !== pb ? "phones-differ" : statuses.join("+") || "no-budget-outcome";
    bump(byOutcome, key);
    (examples[key] ??= []).length < 8 && examples[key].push(`${seed} /${pb}/ ${sa} -> ${sb}`);
    const tri = (s: string) => { const m: Record<string, number> = {}; for (let j = 0; j + 2 < s.length; j++) bump(m, s.slice(j, j + 3)); return m; };
    const ta = tri(sa.toLowerCase()), tb = tri(sb.toLowerCase());
    for (const k of new Set([...Object.keys(ta), ...Object.keys(tb)])) {
      const d = (tb[k] ?? 0) - (ta[k] ?? 0);
      if (d > 0) bump(gained, k, d); else if (d < 0) bump(lost, k, -d);
    }
  }
  const top = (t: Record<string, number>) => Object.entries(t).sort((x, y) => y[1] - x[1]).slice(0, 20);
  out[id] = { words: N, changed, samePhones, longer, shorter, meanLenDelta: lenDelta / Math.max(changed, 1), byOutcome, gained: top(gained), lost: top(lost), examples };
  console.error(id, changed);
}
console.log(JSON.stringify(out, null, 1));
