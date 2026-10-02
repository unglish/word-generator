/** Frozen, shared repair corpus. Regenerate explicitly; never rewrite human studies. */
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createGenerator, englishConfig, createSeededRng } from "../../src/index.js";
import { repairClusters } from "../../src/core/repair.js";
import { expandClusterConstraintBans } from "../../src/config/language.js";
import { TraceCollector } from "../../src/core/trace.js";
import type { Phoneme, Syllable } from "../../src/types.js";

const inventory = [...new Set(englishConfig.phonemes.map(p => p.sound))];
const ids = new Map(inventory.map((s, i) => [s, i]));
const toIds = (sounds: string[]) => sounds.map(s => {
  const id = ids.get(s);
  if (id === undefined) throw new Error(`Unknown fixture sound: ${s}`);
  return id;
});
const sourceFiles = ["src/core/generate.ts", "src/core/repair.ts", "src/utils/random.ts", "src/config/english.ts", "src/config/weights.ts", "src/elements/phonemes.ts"];
const sourceHashes = Object.fromEntries(sourceFiles.map(path => [path, createHash("sha256").update(readFileSync(path)).digest("hex")]));
const cases: unknown[] = [];
function add(name: string, syllables: Syllable[], banned: [string, string][], policy: "drop-coda" | "drop-onset") {
  const before = structuredClone(syllables);
  const trace = new TraceCollector();
  repairClusters(syllables, new Set(banned.map(p => p.join("|"))), policy, trace);
  const encoded = (data: Syllable[]) => data.map(s => ({ onset: toIds(s.onset.map(p => p.sound)), nucleus: toIds(s.nucleus.map(p => p.sound)), coda: toIds(s.coda.map(p => p.sound)) }));
  const input = encoded(before), expected = encoded(syllables);
  const cuts = input.flatMap((s, i) => i + 1 < input.length && s.coda.length && input[i + 1].onset.length
    ? [i, expected[i].coda.length, input[i + 1].onset.length - expected[i + 1].onset.length] : []);
  const packet = [1, input.length, ...input.flatMap(s => [s.onset.length, s.nucleus.length, s.coda.length, ...s.onset, ...s.nucleus, ...s.coda])];
  cases.push({ name, policy, banned: banned.map(p => toIds(p)), input, packet, cuts, expected, repairs: trace.repairs });
}
const ph = (sound: string) => ({ sound, stress: 0 } as Phoneme);
const syl = (onset: string[], coda: string[]) => ({ onset: onset.map(ph), nucleus: [ph("æ")], coda: coda.map(ph) });
const rand = createSeededRng(342);
for (const policy of ["drop-coda", "drop-onset"] as const) {
  add(`${policy}-empty-word`, [], [], policy);
  add(`${policy}-unchanged`, [syl([], ["p"]), syl(["t"], [])], [], policy);
  add(`${policy}-cascade`, [syl([], ["ŋ", "ŋ"]), syl(["t", "t"], ["p"]), syl(["b"], [])], [["ŋ", "t"], ["p", "b"]], policy);
  add(`${policy}-empty-sides`, [syl([], []), syl(["t"], ["p"]), syl([], [])], [["p", "t"]], policy);
  for (let i = 0; i < 160; i++) {
    const alphabet = ["p", "t", "ŋ"];
    const cluster = () => Array.from({ length: Math.floor(rand() * 7) }, () => alphabet[Math.floor(rand() * alphabet.length)]);
    const banned = alphabet.flatMap(a => alphabet.filter(() => rand() > 0.5).map(b => [a, b] as [string, string]));
    add(`${policy}-focused-${i}`, Array.from({ length: Math.floor(rand() * 6) }, () => syl(cluster(), cluster())), banned, policy);
  }
  const config = { ...englishConfig, clusterConstraint: { ...englishConfig.clusterConstraint!, repair: policy } };
  const generator = createGenerator(config);
  for (const mode of ["text", "lexicon"] as const) {
    // Public generation with trace supplies actual pre-repair words.
    for (const word of generator.generateWords(40, { seed: 342, mode, trace: true, morphology: false })) {
      const stage = word.trace!.stages.find(s => s.name === "repairClusters")!;
      const syllables = stage.before.map(s => ({ onset: s.onset.map(ph), nucleus: s.nucleus.map(ph), coda: s.coda.map(ph) }));
      add(`${policy}-${mode}-${cases.length}`, syllables, expandClusterConstraintBans(config), policy);
    }
  }
}
const header = { schema: 1, provenance: { sourceHashes, seed: 342, source: "repairClusters + createGenerator.generateWords(trace:true)", config: "englishConfig", backend: "typescript" }, inventory };
// One case per line keeps the frozen generated corpus reviewable.
const encoded = JSON.stringify(header, null, 2).slice(0, -2)
  + ",\n  \"cases\": [\n" + cases.map(value => "    " + JSON.stringify(value)).join(",\n") + "\n  ]\n}\n";
writeFileSync("evaluation/repair-pilot/fixtures.json", encoded);
console.log(`Frozen ${cases.length} repair cases`);
