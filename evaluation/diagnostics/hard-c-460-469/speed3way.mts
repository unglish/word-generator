// CPU time of generateWords(20000, { seed: 7 }) for one build per process.
const S = "<scratch>";
const roots: Record<string, string> = { main: `${S}/wtr2`, base: `${S}/wae2`, pr: `${S}/w469` };
const label = process.argv[2];
const G: any = await import(`${roots[label]}/src/index.ts`);
G.generateWords(5000, { seed: 3 });
const t0 = process.cpuUsage();
G.generateWords(20000, { seed: 7 });
const u = process.cpuUsage(t0);
console.log(label, ((u.user + u.system) / 1000).toFixed(0));
