import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { installedDependencies } from "./dependency-closure.mjs";

const tools = dirname(fileURLToPath(import.meta.url));
const out = "/private/tmp/q20-gate-bindings-preflight-v1";
const roots = { control: "/Users/ryanbetts/.codex/worktrees/linguistic-q11b-control/word-generator",
  candidate: "/Users/ryanbetts/.codex/worktrees/linguistic-q20-style/word-generator" };
const commits = { control: "1159465fe6c10f55a97e8c5851e8a75c604450e7", candidate: "4f4c95d555a00f1d8cb44892a72e57748f377948" };
const loader = "/Users/ryanbetts/Code/unglish/word-generator/node_modules/tsx/dist/loader.mjs";
async function pin(path) { const bytes = await readFile(path); return { bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") }; }
async function snapshot() {
  const sources = {};
  for (const [arm, root] of Object.entries(roots)) {
    const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
    assert.equal(git("rev-parse", "HEAD"), commits[arm]);
    assert.equal(git("status", "--porcelain", "--untracked-files=no"), "");
    const files = {};
    for (const file of git("ls-files", "-z").split("\0").filter(Boolean)) files[file] = await pin(join(root, file));
    sources[arm] = { commit: commits[arm], files, dependencies: await installedDependencies(root) };
  }
  const files = {};
  for (const entry of await readdir(tools, { withFileTypes: true })) if (entry.isFile()) files[entry.name] = await pin(join(tools, entry.name));
  return { sources, tools: files, node: { version: process.version, ...await pin(process.execPath) }, loader: await pin(loader) };
}
await mkdir(out);
const save = (name, value) => writeFile(join(out, name), JSON.stringify(value, null, 2) + "\n", { flag: "wx" });
try {
  const before = await snapshot(); await save("before.json", before);
  const results = [];
  for (const policy of ["default", "active"]) for (const arm of ["control", "candidate"]) {
    const command = ["--import", loader, join(tools, "preflight.mjs")];
    const child = spawnSync(process.execPath, command, { env: { ...process.env, Q20_GATE_ARM: arm, Q20_SPELLING_POLICY: policy }, encoding: "utf8" });
    await writeFile(join(out, policy + "-" + arm + ".log"), (child.stdout ?? "") + (child.stderr ?? ""), { flag: "wx" });
    assert.equal(child.status, 0, `${arm} binding preflight failed`);
    const report = JSON.parse(child.stdout.trim());
    assert.equal(report.passed, true); assert.equal(report.arm, arm); assert.equal(report.policy, policy);
    assert.equal(report.completePublicWordComparisons, 400); assert.equal(report.nextRngProbes, 2);
    results.push({ ...report, command: [process.execPath, ...command], environmentOverrides: { Q20_GATE_ARM: arm, Q20_SPELLING_POLICY: policy }, log: await pin(join(out, policy + "-" + arm + ".log")) });
  }
  const after = await snapshot(); assert.deepEqual(after, before);
  await save("complete.json", { passed: true, results, before, after,
    scope: "Both policy/arm configured bindings agree with exact public APIs on 400 complete words and two next-state probes per arm, with untouched gate bodies and source/tool/loader seals. No gate or performance outcome." });
  console.log(JSON.stringify({ passed: true, comparisons: 1600, nextRngProbes: 8 }));
} catch (error) { await save("failure.json", { error: String(error), stack: error.stack }); throw error; }
