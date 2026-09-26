import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { lstat, readFile, readdir, realpath, writeFile } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { gunzipSync } from "node:zlib";
import { jsonDigest } from "./identity.js";
import { validateOriginalManifest, type OriginalManifest } from "./archive.js";
import { validateTransitionOutputPath } from "./transition-builder.js";
import { same, type IdentityModule } from "./model-sensitivity.js";

export const BASE = "evaluation/experiments/cmu-model-sensitivity";
export const PROTOCOL_SHA = "1932ff66670bc0315636c648d06240f3ad517a857943d169f30f460e01ea1411";
export const IDENTITY_SHA = "f3f9077fed9237deaadf5212e908abbd5669a8675609482d51453d1bde7d372c";
export const RAW_SHA = "81917843c7f44ce2b094ac63873c2c7a4cf802040792c455ba3ca406891c3d22";
export const MANIFEST_SHA = "1e31ad59251eb5fbe8863bae988539062845f081e2597589669343f50e5452e7";
export const IDENTITY_REPORT_SHA = "0e8367a1193d8700129e4b8f82548bbfaab270523433e344a722a653a30ec292";
export const REFERENCES = {
  transitions: { path: "evaluation/experiments/cmu-transition-builder/artifact.json.gz", compressed: "a1bad741aff421b5f87d014ba9bc0e39c15b696dbe9add3d97bb42ba82b29e59", raw: "1b5360bf7a6d378fe09892199820a607580a5d2bf980fd4088608b0eafb8dcb2", digest: "45da904ae1eb33db2f1bb85c8eb1721cfde6251213a6fd6487e2b6186a95d067" },
  scores: { path: "evaluation/experiments/cmu-score-reference/reference.json.gz", compressed: "82ff2305a36d2807a2a8423a9b43842cd04a6d890aed1a190cd72db068d5be78", raw: "ab9702442d1d3ca78610b3f9d90b91e431964b911f7c7e9b556e457dfc2a799f", digest: "efeb3a9a94d37b477c31633281044adbd6a3074b19c147954ee119f9e4fceeb4" },
  joint: { path: "evaluation/experiments/cmu-matched-reference/reference.json.gz", compressed: "d7b32d1c6f49edf8211f96db14139086172288f138328d37b41ae144b685a118", digest: "f8f5bdd9a083772f76cbb7b9db78ddebb67bcea5fa04afbccfb20f6b0a628862" },
} as const;
export const NEW_PATHS = [
  "evaluation/corpus/model-sensitivity.ts", "evaluation/corpus/model-sensitivity-integrity.ts", "evaluation/corpus/model-sensitivity-acceptance.ts", "evaluation/corpus/model-sensitivity-runner.ts", "evaluation/corpus/model-sensitivity-cli.ts",
  "evaluation/corpus/verify-model-sensitivity.py", "evaluation/corpus/verify-model-sensitivity-test.py",
  "evaluation/review/cmu-model-sensitivity.test.ts", `${BASE}/design.md`, `${BASE}/protocol.json`, `${BASE}/parent-files.json`, `${BASE}/fixtures-plan.md`, `${BASE}/README.md`,
] as const;
export const sha = (bytes: Buffer | string): string => createHash("sha256").update(bytes).digest("hex");
export interface FilePin { bytes: number; sha256: string }
export interface Inputs { source: string; archive: string; identity: string; identityReport: string }
export interface Freeze {
  version: "cmu-model-sensitivity-source-freeze-v1"; root: string; inputs: Inputs;
  protocolSha256: string; sources: Record<string, FilePin>; inputFiles: Record<string, FilePin>;
  engine: Awaited<ReturnType<typeof engineIdentity>>;
}
/** Check every ancestor, not just the leaf. Callers supply canonical absolute input paths. */
export async function regular(path: string, directory = false): Promise<void> {
  let cursor = resolve(path), leaf = true;
  for (;;) {
    const stat = await lstat(cursor);
    if (stat.isSymbolicLink() || (leaf && !directory ? !stat.isFile() : !stat.isDirectory())) throw new Error(`Nonregular or aliased input: ${cursor}`);
    const parent = dirname(cursor); if (parent === cursor) break;
    leaf = false; cursor = parent;
  }
}
export async function hashFile(path: string): Promise<FilePin> {
  await regular(path);
  let bytes = 0; const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) { bytes += chunk.length; hash.update(chunk); }
  return { bytes, sha256: hash.digest("hex") };
}
export async function pinnedBytes(path: string, expected: string): Promise<Buffer> {
  await regular(path); const bytes = await readFile(path); same(sha(bytes), expected, `pinned bytes ${path}`); return bytes;
}
export async function readReference<T extends { digest: string; artifact: unknown }>(root: string, key: keyof typeof REFERENCES): Promise<T> {
  const pin = REFERENCES[key], compressed = await pinnedBytes(resolve(root, pin.path), pin.compressed), raw = gunzipSync(compressed);
  if ("raw" in pin) same(sha(raw), pin.raw, `${key} raw bytes`);
  const result = JSON.parse(raw.toString("utf8")) as T;
  same(result.digest, pin.digest, `${key} published digest`); same(jsonDigest(result.artifact), pin.digest, `${key} canonical digest`);
  return result;
}
/** tsx can expose an external .ts input through either ESM or CommonJS interop. The exact source remains pinned. */
export async function loadIdentity(path: string): Promise<IdentityModule> {
  await pinnedBytes(path, IDENTITY_SHA);
  const namespace = await import(pathToFileURL(path).href) as Partial<IdentityModule> & { default?: IdentityModule };
  const identity = namespace.PHONEME_IDENTITY_CONTRACT ? namespace : namespace.default;
  if (!identity || typeof identity.observeWordIdentity !== "function" || typeof identity.projectLegacyArpabet !== "function") {
    throw new Error("The pinned external identity module did not expose its declared API.");
  }
  same([identity.PHONEME_IDENTITY_CONTRACT?.version, identity.PHONEME_IDENTITY_CONTRACT?.inventory],
    ["phoneme-identity-v1", "english-legacy-v1"], "external observer contract");
  return identity as IdentityModule;
}
export async function engineIdentity() {
  const executable = await realpath(process.execPath), require = createRequire(import.meta.url);
  const tsx = await realpath(require.resolve("tsx/package.json"));
  const metadata = JSON.parse(await readFile(tsx, "utf8")) as { version: string };
  return { node: process.version, versions: process.versions, platform: process.platform, arch: process.arch,
    executableSha256: (await hashFile(executable)).sha256, tsxVersion: metadata.version, tsxPackageSha256: (await hashFile(tsx)).sha256 };
}
async function sourcePins(root: string): Promise<Record<string, FilePin>> {
  const protocol = JSON.parse((await pinnedBytes(resolve(root, BASE, "protocol.json"), PROTOCOL_SHA)).toString("utf8")) as { designSha256: string; parentFilesSha256: string };
  await pinnedBytes(resolve(root, BASE, "design.md"), protocol.designSha256);
  const parent = JSON.parse((await pinnedBytes(resolve(root, BASE, "parent-files.json"), protocol.parentFilesSha256)).toString("utf8")) as Record<string, string>;
  const paths = [...Object.keys(parent), ...NEW_PATHS].sort(), result: Record<string, FilePin> = {};
  for (const path of paths) {
    const pin = await hashFile(resolve(root, path));
    if (parent[path]) same(pin.sha256, parent[path], `unchanged #333 ${path}`);
    result[path] = pin;
  }
  for (const directory of ["evaluation/corpus", "evaluation/review", BASE]) {
    for (const entry of await readdir(resolve(root, directory), { withFileTypes: true })) {
      const path = `${directory}/${entry.name}`;
      if (directory !== BASE && !entry.name.includes("model-sensitivity")) continue;
      if (directory === BASE && entry.name === "outcomes" && entry.isDirectory()) continue;
      if (!paths.includes(path) || !entry.isFile()) throw new Error(`Unregistered study source: ${path}`);
    }
  }
  return result;
}
export async function validateArchiveLayout(directory: string, manifest: Pick<OriginalManifest, "artifacts">): Promise<void> {
  await regular(directory, true);
  const expected = ["manifest.json", ...manifest.artifacts.map(item => item.file)].sort();
  const actual: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === "words" && entry.isDirectory()) {
      await regular(join(directory, "words"), true);
      for (const child of await readdir(join(directory, "words"), { withFileTypes: true })) {
        if (!child.isFile()) throw new Error("Nonregular archive shard."); actual.push(`words/${child.name}`);
      }
    } else { if (!entry.isFile()) throw new Error("Nonregular archive metadata."); actual.push(entry.name); }
  }
  same(actual.sort(), expected, "complete archive artifact set");
}
export async function archivePins(directory: string): Promise<{ pins: Record<string, FilePin>; manifest: OriginalManifest }> {
  await regular(directory, true);
  const bytes = await pinnedBytes(join(directory, "manifest.json"), MANIFEST_SHA);
  const manifest = validateOriginalManifest(JSON.parse(bytes.toString("utf8")));
  await validateArchiveLayout(directory, manifest);
  const pins: Record<string, FilePin> = { "manifest.json": { bytes: bytes.length, sha256: sha(bytes) } };
  for (const item of manifest.artifacts) {
    const pin = await hashFile(join(directory, item.file)); same(pin, { bytes: item.bytes, sha256: item.sha256 }, `archive ${item.file}`); pins[item.file] = pin;
  }
  return { pins, manifest };
}
export async function snapshot(root: string, inputs: Inputs): Promise<Freeze> {
  root = resolve(root); await regular(root, true);
  const sources = await sourcePins(root), archive = await archivePins(inputs.archive), inputFiles: Record<string, FilePin> = {};
  for (const [path, pin] of Object.entries(archive.pins)) inputFiles[join(inputs.archive, path)] = pin;
  for (const [path, hash] of [[inputs.source, RAW_SHA], [inputs.identity, IDENTITY_SHA], [inputs.identityReport, IDENTITY_REPORT_SHA]]) {
    const pin = await hashFile(path); same(pin.sha256, hash, "external input"); inputFiles[path] = pin;
  }
  same(inputFiles[inputs.identity].bytes, 10335, "external observer size");
  return { version: "cmu-model-sensitivity-source-freeze-v1", root, inputs, protocolSha256: PROTOCOL_SHA, sources, inputFiles, engine: await engineIdentity() };
}
export async function verifyFreeze(path: string, hash: string): Promise<Freeze> {
  const bytes = await pinnedBytes(path, hash), frozen = JSON.parse(bytes.toString("utf8")) as Freeze;
  same(await snapshot(frozen.root, frozen.inputs), frozen, "externally reviewed full source/input/engine freeze"); return frozen;
}
export async function freshPath(root: string, out: string, protectedPaths: readonly string[]): Promise<string> {
  const path = await validateTransitionOutputPath(root, out);
  const roots = [await realpath(root), ...await Promise.all(protectedPaths.map(item => realpath(item)))];
  if (roots.some(input => path === input || path.startsWith(input + sep))) throw new Error("Output must be outside every source or archive input.");
  return path;
}
export async function writeFreeze(root: string, inputs: Inputs, out: string): Promise<void> {
  const path = await freshPath(root, out, Object.values(inputs));
  const frozen = await snapshot(root, inputs);
  await writeFile(path, JSON.stringify(frozen, null, 2) + "\n", { flag: "wx" });
}
