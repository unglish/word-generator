import { readFile, realpath } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import type { ReadingIdentity } from "./model.js";
import type { AlternativeEvidence, ReadingMaterial } from "./report.js";

export interface ReadingInputFile {
  identity: ReadingIdentity;
  input: { status: "recorded"; wav: string } | { status: "skipped" | "recording-failed"; reason: string };
}
interface CodingFiles { coders: [string, string]; decision: string }
export interface CodingInputFiles extends CodingFiles { wav: string }
interface MaterialFiles { reading_id: string; wav: string; coding?: CodingFiles }

export async function loadLocalFiles(manifest: string): Promise<{
  input: unknown; read: (file: string) => Promise<Buffer>;
}> {
  const directory = await realpath(dirname(resolve(manifest)));
  const input = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(await readFile(resolve(manifest)))) as unknown;
  async function read(file: string): Promise<Buffer> {
    if (typeof file !== "string" || !file || isAbsolute(file)) throw new Error("Material paths must be relative to their manifest directory.");
    const syntactic = resolve(directory, file), syntacticPart = relative(directory, syntactic);
    if (syntacticPart === ".." || syntacticPart.startsWith("../") || isAbsolute(syntacticPart)) throw new Error("Material path escapes its manifest directory.");
    const actual = await realpath(syntactic), actualPart = relative(directory, actual);
    if (actualPart === ".." || actualPart.startsWith("../") || isAbsolute(actualPart)) throw new Error("Material symlink escapes its manifest directory.");
    return readFile(actual);
  }
  return { input, read };
}

export async function loadCodingFiles(files: CodingInputFiles, read: (file: string) => Promise<Buffer>): Promise<{
  wav: Buffer; coders: [Buffer, Buffer]; decision: Buffer;
}> {
  return { wav: await read(files.wav), ...await loadTranscriptionFiles(files, read) };
}

async function loadTranscriptionFiles(files: CodingFiles, read: (file: string) => Promise<Buffer>): Promise<{
  coders: [Buffer, Buffer]; decision: Buffer;
}> {
  if (!Array.isArray(files.coders) || files.coders.length !== 2) throw new Error("Exactly two original coder paths are required.");
  return { coders: [await read(files.coders[0]), await read(files.coders[1])], decision: await read(files.decision) };
}

export async function loadReadingMaterials(manifest: string): Promise<ReadingMaterial[]> {
  const { input, read } = await loadLocalFiles(manifest);
  if (!Array.isArray(input)) throw new Error("Reading material inventory must be an array.");
  const materials: ReadingMaterial[] = [];
  for (const file of input as MaterialFiles[]) {
    const wav = await read(file.wav);
    let coding: ReadingMaterial["coding"];
    if (file.coding) {
      coding = await loadTranscriptionFiles(file.coding, read);
    }
    materials.push({ reading_id: file.reading_id, wav, ...(coding ? { coding } : {}) });
  }
  return materials;
}

export async function loadAlternativeEvidence(manifest: string): Promise<AlternativeEvidence[]> {
  const { input, read } = await loadLocalFiles(manifest);
  if (!Array.isArray(input)) throw new Error("Alternative evidence inventory must be an array.");
  const files: AlternativeEvidence[] = [];
  for (const file of input as { sha256: string; file: string }[]) files.push({ sha256: file.sha256, bytes: await read(file.file) });
  return files;
}
