import { readFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import type { AssetMaterial } from "./audio.js";
import type { AudioVerification } from "./model.js";

interface MaterialFile {
  target_digest: string;
  wav: string;
  production_record: string;
  verification: { record: AudioVerification; transcription_file: string }[];
}
async function load<T>(file: string): Promise<T> { return JSON.parse(await readFile(resolve(file), "utf8")); }
export async function loadMaterialFiles(manifest: string): Promise<AssetMaterial[]> {
  const directory = dirname(resolve(manifest)), files = await load<MaterialFile[]>(manifest);
  function localPath(file: string): string {
    if (typeof file !== "string" || !file || isAbsolute(file)) throw new Error("Material paths must be relative to their manifest directory.");
    const target = resolve(directory, file), part = relative(directory, target);
    if (part === ".." || part.startsWith("../") || isAbsolute(part)) throw new Error("Material path escapes its manifest directory.");
    return target;
  }
  const materials: AssetMaterial[] = [];
  for (const file of files) {
    const verification: AssetMaterial["verification"] = [];
    for (const entry of file.verification) verification.push({ record: entry.record, transcription_file: await readFile(localPath(entry.transcription_file)) });
    materials.push({ target_digest: file.target_digest, wav: await readFile(localPath(file.wav)), production_record: await readFile(localPath(file.production_record)), verification });
  }
  return materials;
}
