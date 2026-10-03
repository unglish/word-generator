import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";

const root = "/Users/ryanbetts/.codex/worktrees/linguistic-q11b-treatment/word-generator";
const out = "/private/tmp/q11b-custom-fixture-diagnostics-v2";
mkdirSync(out);
const pin = bytes => ({ bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") });
const sources = {};

// Extract the original fixture setup verbatim; omit the Vitest test bodies.
async function fixtureModule(relative, exportName, transform = source => source) {
  const bytes = readFileSync(`${root}/${relative}`);
  sources[relative] = pin(bytes);
  const directory = `${root}/${relative.slice(0, relative.lastIndexOf("/"))}`;
  let source = bytes.toString().split('describe("')[0];
  source = source.replace(/^import .* from "vitest";\n/m, "");
  source = source.replace(/from "(\.[^"]+)"/g, (_, path) => `from "${directory}/${path}"`);
  source = transform(source) + `\nexport { ${exportName} };\n`;
  const path = `${out}/${exportName}.ts`;
  writeFileSync(path, source, { flag: "wx" });
  return import(pathToFileURL(path).href);
}

const { fixedRoot } = await fixtureModule("src/core/morphology/realization.test.ts", "fixedRoot");
const { lexicalGenerator } = await fixtureModule("src/core/lexical.test.ts", "lexicalGenerator",
  source => source.replace("return createGenerator({", "return ({"));
const { createGenerator, englishConfig } = await import(pathToFileURL(`${root}/src/index.ts`).href);
const suffix = englishConfig.morphology.suffixes.find(value => value.written === "ity");
const fixtures = [
  { name: "restricted-coda", config: fixedRoot({ suffix, coda: "k" }).config,
    options: fixedRoot({ suffix, coda: "k" }).generation, segment: "coda", destination: "s" },
  { name: "restricted-nucleus", config: lexicalGenerator({ suffix: "ity", vowels: ["aɪ"] }),
    options: { seed: 51, syllableCount: 3, morphology: true }, segment: "nucleus", destination: "ɪ" },
];
const results = [];
for (const fixture of fixtures) {
  for (const variant of ["original-enabled", "legacy-disabled", "destination-in-position-pool"]) {
    const config = structuredClone(fixture.config);
    if (variant === "legacy-disabled") config.morphology.morphophonemicPolicy.preserveClusterLegality = false;
    if (variant === "destination-in-position-pool") {
      config.phonemeMaps[fixture.segment].set(fixture.destination,
        [config.phonemes.find(phone => phone.sound === fixture.destination)]);
    }
    const word = createGenerator(config).generateWord({ ...fixture.options, trace: true });
    const evaluations = word.trace.morphologyPreparation.prepared.evaluations;
    if (variant === "original-enabled") {
      assert(evaluations.some(value => value.soundProposed === fixture.destination && value.outcome === "rejected"
        && value.guard.rejections.some(rejection => rejection.reason === "inventory")));
    } else if (variant === "legacy-disabled") {
      assert(word.trace.morphology.alternations.some(value => value.soundAfter === fixture.destination));
    }
    const name = `${fixture.name}-${variant}.json`;
    const bytes = Buffer.from(JSON.stringify({ fixture: fixture.name, variant, options: fixture.options, word }, null, 2) + "\n");
    writeFileSync(`${out}/${name}`, bytes, { flag: "wx" });
    results.push({ name, ...pin(bytes), written: word.written, pronunciation: word.pronunciation, evaluations });
  }
}
writeFileSync(`${out}/complete.json`, JSON.stringify({ passed: true, sources, results,
  scope: "Six exact public-API fixture diagnostics. Altered destination pools are diagnostic only, not registered treatment measurements; original failures remain." }, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify({ passed: true, fixtures: fixtures.length, variants: results.length }));
