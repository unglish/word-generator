import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { cp, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";
import { captureRun } from "../../capture.js";
import { digest } from "../../serialization.js";
import type { Manifest } from "../../model.js";
import { sha } from "../syllable-quantity/archive.js";
import { readArchive, verifiedDraws, verifyUnchanged } from "./archive.js";

const root = resolve(import.meta.dirname, "../../../..");
let directory: string;
let original: string;
beforeAll(async () => {
  directory = await mkdtemp(join(tmpdir(), "stress-observer-integrity-"));
  original = join(directory, "original");
  await captureRun({ root, out: original, id: "small-integrity-fixture", cohort: "development", protocol: { schemaVersion: 1, id: "stress-integrity-test", wordsPerReplicate: 3, reviewDrawsPerReplicate: 1, profiles: [{ id: "fixture", options: { mode: "lexicon", morphology: true }, seeds: { development: [42, 44], validation: [43, 45] } }] } });
});
afterAll(async () => { await rm(directory, { recursive: true, force: true }); });
async function readEvery(path: string) {
  const archive = await readArchive(path);
  const records = [];
  for (const stream of archive.schedule) for await (const draw of verifiedDraws(archive, stream)) records.push(draw);
  return records;
}
async function rehash(path: string, file: string, bytes: Buffer) {
  await writeFile(join(path, file), bytes);
  const manifest = JSON.parse(await readFile(join(path, "manifest.json"), "utf8")).manifest as Manifest;
  const artifact = manifest.artifacts.find(artifact => artifact.file === file)!;
  Object.assign(artifact, { bytes: bytes.length, sha256: sha(bytes) });
  await writeFile(join(path, "manifest.json"), JSON.stringify({ manifest, digest: digest(manifest) }));
}
describe("verified observer archive inputs", () => {
  it("consumes the complete valid schedule", async () => { expect(await readEvery(original)).toHaveLength(6); });
  it.each(["manifest.json", "sources.json.gz", "words/fixture-42.jsonl.gz"])("rejects a symlink replacing %s with identical bytes", async file => {
    const path = join(directory, `symlink-${file.replaceAll("/", "-")}`);
    await cp(original, path, { recursive: true });
    await rm(join(path, file));
    await symlink(join(original, file), join(path, file));
    await expect(readEvery(path)).rejects.toThrow(/Symlink/);
  });
  it("rejects a fully rehashed source/manifest replacement after the initial pin", async () => {
    const path = join(directory, "changed-after-pin");
    await cp(original, path, { recursive: true });
    const initial = await readArchive(path);
    const source = structuredClone(initial.sources);
    source.generator[0].content += "\n// rehashed replacement\n";
    await rehash(path, "sources.json.gz", gzipSync(JSON.stringify(source)));
    const manifest = JSON.parse(await readFile(join(path, "manifest.json"), "utf8")).manifest as Manifest;
    manifest.generator.sourceDigest = digest(source.generator);
    await writeFile(join(path, "manifest.json"), JSON.stringify({ manifest, digest: digest(manifest) }));
    await expect(readEvery(path)).resolves.toHaveLength(6);
    await expect(verifyUnchanged(initial)).rejects.toThrow(/identity changed/);
  });
  it.each(["dropped", "extra", "duplicate", "reordered", "malformed", "corrupt", "extra-shard", "missing-shard", "source-digest", "summary-schedule"])("rejects %s input even when edited artifacts are rehashed", async mutation => {
    const path = join(directory, mutation); await cp(original, path, { recursive: true });
    const file = "words/fixture-42.jsonl.gz";
    const bytes = await readFile(join(path, file));
    const lines = gunzipSync(bytes).toString().trim().split("\n");
    if (mutation === "dropped") lines.pop();
    if (mutation === "extra") lines.push(lines.at(-1)!);
    if (mutation === "duplicate") lines[1] = lines[0];
    if (mutation === "reordered") [lines[0], lines[1]] = [lines[1], lines[0]];
    if (mutation === "malformed") lines[1] = "{";
    if (["dropped", "extra", "duplicate", "reordered", "malformed"].includes(mutation)) await rehash(path, file, gzipSync(lines.join("\n") + "\n"));
    if (mutation === "corrupt") await writeFile(join(path, file), "corrupt");
    if (mutation === "extra-shard") await writeFile(join(path, "words/extra.jsonl.gz"), bytes);
    if (mutation === "missing-shard") await rm(join(path, file));
    if (mutation === "source-digest") {
      const source = JSON.parse(gunzipSync(await readFile(join(path, "sources.json.gz"))).toString());
      source.generator[0].content += "\n// forged\n";
      await rehash(path, "sources.json.gz", gzipSync(JSON.stringify(source)));
    }
    if (mutation === "summary-schedule") {
      const summary = JSON.parse(await readFile(join(path, "summary.json"), "utf8"));
      summary.profiles[0].replicates[0].seed++;
      await rehash(path, "summary.json", Buffer.from(JSON.stringify(summary)));
    }
    await expect(readEvery(path)).rejects.toThrow();
  });
});
