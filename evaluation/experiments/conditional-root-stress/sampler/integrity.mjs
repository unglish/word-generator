import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { lstat, readFile, readdir, realpath, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = fileURLToPath(new URL("../../../../", import.meta.url));
export const BASE = "evaluation/experiments/conditional-root-stress";
export const PROTOCOL_SHA = "5fec61ae76fa0c81e317637f2dac065e43ced844ca46836236db47b8045929f4";
export const sha = bytes => createHash("sha256").update(bytes).digest("hex");

async function filesBelow(path) {
  const result = [];
  for (const entry of await readdir(path, { withFileTypes: true })) {
    if (entry.name === "__pycache__" && entry.isDirectory()) continue;
    const full = join(path, entry.name);
    if (entry.isDirectory()) result.push(...await filesBelow(full));
    else {
      assert(entry.isFile(), `Source closure rejects symlinks: ${full}`);
      result.push(full);
    }
  }
  return result;
}

export async function snapshotSources() {
  const runtime = (await filesBelow(join(ROOT, "src"))).filter(path => path.endsWith(".ts"));
  const proof = (await Promise.all(["protocol", "law-evidence", "sampler"].map(name => filesBelow(join(ROOT, BASE, name))))).flat();
  const paths = [...runtime, ...proof, ...["package.json", "package-lock.json", "tsconfig.json"].map(name => join(ROOT, name))].sort();
  return Object.fromEntries(await Promise.all(paths.map(async path => [relative(ROOT, path), sha(await readFile(path))])));
}

export async function engineIdentity() {
  return { node: process.version, versions: process.versions, platform: process.platform, architecture: process.arch,
    executableSha256: sha(await readFile(process.execPath)) };
}

export async function loadFreeze(path, expectedSha) {
  const bytes = await readFile(path);
  assert.equal(sha(bytes), expectedSha, "Externally pinned source-freeze bytes");
  const freeze = JSON.parse(bytes);
  assert.deepEqual(Object.keys(freeze).sort(), ["protocolSha256", "sources", "version"]);
  assert.equal(freeze.version, "q09-sampler-source-freeze-v1");
  assert.equal(freeze.protocolSha256, PROTOCOL_SHA);
  assert.deepEqual(await snapshotSources(), freeze.sources, "Exact source names and bytes before execution");
  const protocolBytes = await readFile(join(ROOT, BASE, "sampler/protocol.json"));
  assert.equal(sha(protocolBytes), PROTOCOL_SHA);
  return { freeze, freezeBytes: bytes, protocol: JSON.parse(protocolBytes) };
}

export async function assertStillFrozen(freeze, path, bytes) {
  assert.deepEqual(await snapshotSources(), freeze.sources, "Sources changed during execution");
  assert.deepEqual(await readFile(path), bytes, "Freeze identity changed during execution");
}

export async function freshOutput(path) {
  const target = join(await realpath(dirname(resolve(path))), resolve(path).split(sep).at(-1));
  const root = await realpath(ROOT);
  assert(target !== root && !target.startsWith(root + sep), "Write outcomes outside the frozen source checkout");
  try {
    await lstat(target);
    throw new Error("Output already exists");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  return target;
}

export async function writeExclusive(path, bytes) {
  await writeFile(await freshOutput(path), bytes, { flag: "wx" });
}

export function parseArgs(args, required) {
  const result = {};
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i]?.replace(/^--/, "");
    assert(args[i]?.startsWith("--") && required.includes(key) && !(key in result) && args[i + 1] && !args[i + 1].startsWith("--"), "Unknown, duplicate or incomplete arguments");
    result[key] = args[i + 1];
  }
  assert.deepEqual(Object.keys(result).sort(), [...required].sort(), "All explicit arguments are required");
  return result;
}
