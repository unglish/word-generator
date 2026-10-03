import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";
import { installedDependencies } from "./dependency-closure.mjs";

const tools = dirname(fileURLToPath(import.meta.url));
const bindingPath = join(tools, "../capture-tools/execution-registration.json");
const binding = JSON.parse(await readFile(bindingPath, "utf8"));
const root = binding.candidateRoot;
const out = "/private/tmp/q20-independent-fixture-capture-v1";
await mkdir(out);
async function pin(path) {
  const hash = createHash("sha256"); let bytes = 0;
  for await (const chunk of createReadStream(path)) { hash.update(chunk); bytes += chunk.length; }
  return { bytes, sha256: hash.digest("hex") };
}
const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
async function snapshot() {
  assert.equal(git("rev-parse", "HEAD"), binding.candidateCommit);
  assert.equal(git("status", "--porcelain", "--untracked-files=no"), "");
  for (const key of ["NODE_OPTIONS", "NODE_PATH", "ESBUILD_BINARY_PATH", "TSX_TSCONFIG_PATH"]) assert(!process.env[key], key);
  const files = {};
  for (const name of git("ls-files", "-z").split("\0").filter(Boolean)) files[name] = await pin(join(root, name));
  return { commit: binding.candidateCommit, files, dependencies: await installedDependencies(root),
    binding: await pin(bindingPath), producer: await pin(fileURLToPath(import.meta.url)),
    node: { version: process.version, ...await pin(process.execPath) },
    environment: Object.fromEntries(["PATH", "LANG", "LC_ALL", "TZ", "CI"].map(key => [key, process.env[key] ?? null])) };
}
const save = (name, value) => writeFile(join(out, name), JSON.stringify(value, null, 2) + "\n", { flag: "wx" });
try {
  const before = await snapshot(); await save("before.json", before);
  const api = await import(pathToFileURL(join(root, "src/index.ts")).href);
  const { canonical } = await import(pathToFileURL(join(root, "evaluation/quality/serialization.ts")).href);
  assert.deepEqual(await pin(join(root, binding.protocol.path)), binding.protocol.pin);
  const protocol = JSON.parse(await readFile(join(root, binding.protocol.path), "utf8"));
  assert.deepEqual(await pin(join(root, binding.activePolicy.path)), binding.activePolicy.pin);
  const active = JSON.parse(await readFile(join(root, binding.activePolicy.path), "utf8")).configuration;
  const rows = [], streams = [];
  for (const policy of ["default", "active"]) {
    const config = structuredClone(api.englishConfig);
    config.lexicalStyle = structuredClone(api.englishStyleExperiment);
    if (policy === "active") { config.splitVowels = active.splitVowels; config.followingLetters = active.followingLetters; }
    await save(`${policy}-config.json`, canonical(config));
    const generator = api.createGenerator(config);
    for (const profile of protocol.profiles) for (const seed of profile.seeds.development) {
      const raw = api.createSeededRng(seed); let draws = 0;
      const rand = () => { draws++; return raw(); };
      for (let drawIndex = 0; drawIndex < 10; drawIndex++) rows.push({ policy, profile: profile.id, seed, drawIndex,
        word: generator.generateWord({ ...profile.options, rand, trace: true }) });
      streams.push({ policy, profile: profile.id, seed, words: 10, rngDraws: draws, nextRng: raw() });
    }
  }
  assert.equal(rows.length, 400); assert.equal(streams.length, 40);
  await writeFile(join(out, "words.jsonl.gz"), gzipSync(rows.map(row => JSON.stringify(row)).join("\n") + "\n"), { flag: "wx" });
  const after = await snapshot(); assert.deepEqual(after, before);
  await save("complete.json", { passed: true, preflight: true, words: 400, streams, before, after,
    artifacts: Object.fromEntries(await Promise.all(["words.jsonl.gz", "default-config.json", "active-config.json"].map(async name => [name, await pin(join(out, name))]))),
    scope: "Fixed first ten words at each of all forty registered policy/profile/seed coordinates, through public API. Independent-operator development only; no replacement for full 400000-word capture/audit or linguistic-quality evidence." });
  console.log(JSON.stringify({ passed: true, preflight: true, words: 400, streams: 40 }));
} catch (error) {
  await save("failure.json", { error: String(error), stack: error.stack }); throw error;
}
