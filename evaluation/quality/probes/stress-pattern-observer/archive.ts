import assert from "node:assert/strict";
import { lstat, readFile } from "node:fs/promises";
import { join } from "node:path";
import { readArchive as readBaseArchive, verifiedDraws as baseDraws, sha } from "../syllable-quantity/archive.js";
import type { VerifiedArchive as BaseArchive } from "../syllable-quantity/archive.js";
import type { Manifest } from "../../model.js";

export interface VerifiedArchive extends BaseArchive { manifestSha256: string }
async function regularPath(directory: string, file: string): Promise<void> {
  assert.ok(file.length > 0 && !file.startsWith("/") && file.split("/").every(part => part !== "" && part !== "." && part !== ".."), "Invalid artifact path");
  let path = directory;
  assert.ok((await lstat(path)).isDirectory(), "Archive root must be a nonsymlink directory");
  const pieces = file.split("/");
  for (const [index, part] of pieces.entries()) {
    path = join(path, part);
    const entry = await lstat(path);
    assert.ok(!entry.isSymbolicLink(), `Symlink archive path: ${file}`);
    assert.ok(index === pieces.length - 1 ? entry.isFile() : entry.isDirectory(), `Nonregular archive path: ${file}`);
  }
}
export async function readArchive(directory: string): Promise<VerifiedArchive> {
  await regularPath(directory, "manifest.json");
  const manifestBytes = await readFile(join(directory, "manifest.json"));
  const envelope = JSON.parse(manifestBytes.toString()) as { manifest: Manifest };
  for (const artifact of envelope.manifest.artifacts) await regularPath(directory, artifact.file);
  const archive = await readBaseArchive(directory);
  assert.deepEqual(archive.manifest, envelope.manifest, "Manifest changed while opening archive");
  assert.equal(sha(await readFile(join(directory, "manifest.json"))), sha(manifestBytes));
  await regularPath(directory, "manifest.json");
  return { ...archive, manifestSha256: sha(manifestBytes) };
}
export async function* verifiedDraws(archive: VerifiedArchive, stream: VerifiedArchive["schedule"][number]) {
  await regularPath(archive.directory, stream.file);
  yield* baseDraws(archive, stream);
  await regularPath(archive.directory, stream.file);
}
/** Reverify every initial artifact and exact shard set, never accept a freshly rehashed replacement run. */
export async function verifyUnchanged(archive: VerifiedArchive): Promise<void> {
  const current = await readArchive(archive.directory);
  assert.equal(current.manifestSha256, archive.manifestSha256, "Archive manifest identity changed during analysis");
  assert.deepEqual(current.manifest, archive.manifest);
  assert.deepEqual(current.summary, archive.summary);
  assert.deepEqual(current.sources, archive.sources);
  assert.deepEqual(current.schedule, archive.schedule);
}
