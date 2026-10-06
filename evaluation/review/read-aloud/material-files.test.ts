import { mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { loadCodingFiles, loadLocalFiles, loadReadingMaterials } from "./material-files.js";

describe("original read-aloud material file bindings", () => {
  it("loads only exact original bytes inside the manifest directory", async () => {
    const directory = await mkdtemp(join(tmpdir(), "q23-materials-"));
    try {
      const wav = Buffer.from([0, 1, 2]), first = Buffer.from("first\n"), second = Buffer.from("second\n"), decision = Buffer.from("decision\n");
      for (const [name, bytes] of [["reading.wav", wav], ["first.json", first], ["second.json", second], ["decision.json", decision]] as const) await writeFile(join(directory, name), bytes);
      const manifest = join(directory, "materials.json");
      await writeFile(manifest, JSON.stringify([{ reading_id: "opaque-reading", wav: "reading.wav", coding: { coders: ["first.json", "second.json"], decision: "decision.json" } }]));
      const materials = await loadReadingMaterials(manifest);
      expect(materials).toEqual([{ reading_id: "opaque-reading", wav, coding: { coders: [first, second], decision } }]);
    } finally { await rm(directory, { recursive: true }); }
  });
  it("rejects syntactic parent/absolute paths and physical symlink escapes", async () => {
    const directory = await mkdtemp(join(tmpdir(), "q23-local-")), outside = await mkdtemp(join(tmpdir(), "q23-outside-"));
    try {
      await writeFile(join(directory, "manifest.json"), "{}"); await writeFile(join(outside, "original.wav"), "outside");
      await symlink(join(outside, "original.wav"), join(directory, "escaped.wav"));
      const local = await loadLocalFiles(join(directory, "manifest.json"));
      await expect(local.read(join(outside, "original.wav"))).rejects.toThrow("relative");
      await expect(local.read("../original.wav")).rejects.toThrow("escapes");
      await expect(local.read("escaped.wav")).rejects.toThrow("symlink escapes");
    } finally { await rm(directory, { recursive: true }); await rm(outside, { recursive: true }); }
  });
  it("requires precisely two original coder file paths at runtime", async () => {
    const directory = await mkdtemp(join(tmpdir(), "q23-coding-files-"));
    try {
      await writeFile(join(directory, "manifest.json"), "{}"); await writeFile(join(directory, "reading.wav"), "bytes");
      const local = await loadLocalFiles(join(directory, "manifest.json"));
      for (const coders of [[], ["one.json"], ["one.json", "two.json", "three.json"]]) {
        await expect(loadCodingFiles({ wav: "reading.wav", coders: coders as [string, string], decision: "decision.json" }, local.read)).rejects.toThrow("Exactly two");
      }
      expect(await readFile(join(directory, "reading.wav"), "utf8")).toBe("bytes");
    } finally { await rm(directory, { recursive: true }); }
  });
  it("rejects invalid UTF-8 manifests before interpreting file references", async () => {
    const directory = await mkdtemp(join(tmpdir(), "q23-utf8-"));
    try {
      await writeFile(join(directory, "manifest.json"), Buffer.from([0x7b, 0xc0, 0xaf, 0x7d]));
      await expect(loadLocalFiles(join(directory, "manifest.json"))).rejects.toThrow();
    } finally { await rm(directory, { recursive: true }); }
  });
});
