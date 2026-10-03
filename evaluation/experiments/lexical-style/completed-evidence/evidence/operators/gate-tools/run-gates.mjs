import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, realpath, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { installedDependencies } from "./dependency-closure.mjs";

const roots = { control: "/Users/ryanbetts/.codex/worktrees/linguistic-q11b-control/word-generator",
  candidate: "/Users/ryanbetts/.codex/worktrees/linguistic-q20-style/word-generator" };
const commits = { control: "1159465fe6c10f55a97e8c5851e8a75c604450e7", candidate: "4f4c95d555a00f1d8cb44892a72e57748f377948" };
const tools = dirname(fileURLToPath(import.meta.url));
const out = "/private/tmp/q20-gates-v1";
const node = process.execPath;
const npm = "/Users/ryanbetts/.nvm/versions/node/v24.11.1/bin/npm";
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
async function pin(path) { const bytes = await readFile(path); return { bytes: bytes.length, sha256: sha(bytes) }; }
const git = (root, ...args) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
async function seal() {
  for (const key of ["QUALITY_GATE_SAMPLE_SIZE", "QUALITY_MODE_SAMPLE_SIZE", "QUALITY_HEARTBEAT_EVERY", "CI", "NODE_OPTIONS", "NODE_PATH", "ESBUILD_BINARY_PATH", "TSX_TSCONFIG_PATH"]) {
    assert(!process.env[key], `Unregistered override ${key}`);
  }
  const sources = {};
  for (const [arm, root] of Object.entries(roots)) {
    assert.equal(git(root, "rev-parse", "HEAD"), commits[arm]);
    assert.equal(git(root, "status", "--porcelain", "--untracked-files=no"), "");
    const tracked = {};
    for (const name of git(root, "ls-files", "-z").split("\0").filter(Boolean)) tracked[name] = await pin(join(root, name));
    sources[arm] = { commit: commits[arm], tracked, dependencies: await installedDependencies(root, ["tsx", "vitest", "typescript"]) };
  }
  const toolPins = {};
  for (const entry of await readdir(tools, { withFileTypes: true })) if (entry.isFile()) toolPins[entry.name] = await pin(join(tools, entry.name));
  return { sources, tools: toolPins, toolDependencies: await installedDependencies(tools, ["vitest"]),
    node: { path: await realpath(node), ...await pin(node) }, npm: await pin(npm),
    environment: Object.fromEntries(Object.entries(process.env).map(([key, value]) => [key, sha(value)])) };
}
async function distPins(root) {
  const files = {};
  async function visit(path, relative = "") {
    for (const entry of await readdir(path, { withFileTypes: true })) {
      const name = relative ? relative + "/" + entry.name : entry.name;
      if (entry.isDirectory()) await visit(join(path, entry.name), name);
      else files[name] = await pin(join(path, entry.name));
    }
  }
  try { await visit(join(root, "dist")); return files; }
  catch (error) { if (error.code === "ENOENT") return null; throw error; }
}
async function reportState(path) {
  try { return { ...await pin(path), modified: (await stat(path)).mtimeMs }; }
  catch (error) { if (error.code === "ENOENT") return null; throw error; }
}
await mkdir(out);
const save = (name, value) => writeFile(join(out, name), JSON.stringify(value, null, 2) + "\n", { flag: "wx" });
const results = [], compiled = { control: false, candidate: false };
try {
  const registration = JSON.parse(await readFile(join(tools, "binding-registration.json"), "utf8"));
  assert.deepEqual(await pin(registration.measurementPath), registration.measurement);
  assert.equal(registration.commands, 74);
  for (const root of Object.values(roots)) for (const [file, expected] of Object.entries(registration.gateSourcePins)) assert.deepEqual(await pin(join(root, file)), expected);
  const initial = await seal(); await save("initial.json", initial);
  async function run(name, arm, command, args, env = {}, needsDist = false) {
    const root = roots[arm];
    const before = await seal(); assert.deepEqual(before, initial);
    const compiledBefore = needsDist ? await distPins(root) : null;
    const reports = [...(name.includes("quality") ? ["quality-report.json"] : []),
      ...(name.includes("trigrams") ? ["memory/trigram-2m-analysis.json", "memory/trigram-2m-analysis.md"] : [])];
    const reportsBefore = {};
    for (const file of reports) reportsBefore[file] = await reportState(join(root, file));
    await save(name + "-before.json", { before, command: [command, ...args], cwd: root, environmentOverrides: env,
      compiledBefore, compiledSourceEligible: needsDist ? compiled[arm] : null, reportsBefore });
    const child = spawn(command, args, { cwd: root,
      env: { ...process.env, PATH: "/Users/ryanbetts/.nvm/versions/node/v24.11.1/bin:" + process.env.PATH, ...env }, stdio: ["ignore", "pipe", "pipe"] });
    let log = ""; child.stdout.on("data", bytes => { log += bytes; }); child.stderr.on("data", bytes => { log += bytes; });
    const outcome = await new Promise(resolve => {
      child.on("error", error => resolve({ code: null, signal: null, startError: String(error) }));
      child.on("close", (code, signal) => resolve({ code, signal }));
    });
    await writeFile(join(out, name + ".log"), log, { flag: "wx" });
    const after = await seal(); assert.deepEqual(after, before);
    if (needsDist) assert.deepEqual(await distPins(root), compiledBefore);
    const record = { name, arm, command: [command, ...args], cwd: root, environmentOverrides: env,
      compiledSourceEligible: needsDist ? compiled[arm] : null, ...outcome, log: await pin(join(out, name + ".log")) };
    for (const file of reports) {
      try {
        const destination = name + "-" + file.replaceAll("/", "-");
        await writeFile(join(out, destination), await readFile(join(root, file)), { flag: "wx" });
        record[destination] = { ...await pin(join(out, destination)),
          state: JSON.stringify(await reportState(join(root, file))) === JSON.stringify(reportsBefore[file])
            ? "unchanged-existing-report" : "created-or-modified-report" };
      } catch (error) { if (error.code !== "ENOENT") throw error; }
    }
    results.push(record);
    await save(name + "-after.json", { after, record, compiledAfter: needsDist ? await distPins(root) : null });
    await writeFile(join(out, "progress.json"), JSON.stringify(results, null, 2) + "\n");
    console.log(`${name}: exit ${outcome.code}`); return record;
  }
  for (const arm of ["control", "candidate"]) {
    await run(`original-${arm}-unit`, arm, npm, ["test"]);
    compiled[arm] = (await run(`compile-${arm}-diagnostics`, arm, node, [join(roots[arm], "node_modules/typescript/bin/tsc")])).code === 0;
    await run(`original-${arm}-quality`, arm, npm, ["run", "test:quality"]);
    await run(`original-${arm}-trigrams`, arm, npm, ["run", "analyze:trigrams"], {}, true);
    await run(`original-${arm}-trace`, arm, npm, ["run", "audit:trace"], {}, true);
  }
  for (const policy of ["default", "active"]) for (const arm of ["control", "candidate"]) {
    await run(`configured-${policy}-${arm}-quality`, arm, node, [join(roots[arm], "node_modules/vitest/vitest.mjs"), "run", "--config", join(tools, "quality.config.ts")], { Q20_GATE_ARM: arm, Q20_SPELLING_POLICY: policy });
  }
  for (let pair = 1; pair <= 6; pair++) for (const arm of ["control", "candidate"]) {
    await run(`native-pair-${pair}-${arm}`, arm, npm, ["run", "test:perf"]);
  }
  for (let pair = 1; pair <= 6; pair++) for (const policy of ["default", "active"]) for (const mode of ["lexicon", "text"]) for (const arm of ["control", "candidate"]) {
    const config = mode === "text" ? "text-perf.config.ts" : "perf.config.ts";
    await run(`configured-pair-${pair}-${policy}-${mode}-${arm}`, arm, node,
      [join(roots[arm], "node_modules/vitest/vitest.mjs"), "run", "--config", join(tools, config), "--reporter=verbose"], { Q20_GATE_ARM: arm, Q20_SPELLING_POLICY: policy });
  }
  assert.equal(results.length, 74);
  assert.equal(results.filter(record => record.name.startsWith("native-pair-")).length, 12);
  assert.equal(results.filter(record => record.name.startsWith("configured-pair-")).length, 48);
  await save("complete.json", { passed: true, results, compiled, after: await seal(),
    scope: "All registered commands executed sequentially with source/tool/dependency/compiler/report provenance. Every gate failure is retained. Execution completion is not a passing-quality, performance or promotion claim." });
} catch (error) {
  await save("failure.json", { error: String(error), stack: error.stack, results }); throw error;
}
