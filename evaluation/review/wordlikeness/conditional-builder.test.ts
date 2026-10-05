import { mkdtemp, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { validateTransitionOutputPath } from "../../corpus/transition-builder.js";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { constructConditionalExperiment, readConditionalRegistration } from "../../corpus/conditional-builder.js";
import { parseConditionalArguments } from "../../corpus/conditional-cli.js";

const registrationPath = fileURLToPath(new URL("../../experiments/conditional-onset-rime/measurement-preimplementation.json", import.meta.url));
describe("registered conditional experiment entry points", () => {
  it("authenticates the exact registration before accepting source bytes", async () => {
    const bytes = await readFile(registrationPath);
    expect(readConditionalRegistration(bytes).split.seed).toBe("q17-2026-10-02");
    expect(() => readConditionalRegistration(Buffer.concat([bytes, Buffer.from(" ")]))).toThrow("registration changed");
    expect(() => constructConditionalExperiment(Buffer.from("probe P R OW1 B\n"), bytes)).toThrow("pinned UTF-8 dictionary");
    expect(() => constructConditionalExperiment(Buffer.from([0xff]), bytes)).toThrow("pinned UTF-8 dictionary");
  });
  it("refuses existing files and symlinks into protected source directories", async () => {
    const temporary = await mkdtemp(join(tmpdir(), "q17-output-test-"));
    const root = fileURLToPath(new URL("../../../", import.meta.url));
    try {
      const existing = join(temporary, "existing.json");
      await writeFile(existing, "preserved");
      await expect(validateTransitionOutputPath(root, existing)).rejects.toThrow("already exists");
      await symlink(resolve(root, "evaluation/corpus"), join(temporary, "alias"));
      await expect(validateTransitionOutputPath(root, join(temporary, "alias/result.json"))).rejects.toThrow("protected");
      await expect(validateTransitionOutputPath(root, join(temporary, "fresh.json"), existing))
        .resolves.toBe(join(await realpath(temporary), "fresh.json"));
      await expect(validateTransitionOutputPath(root, existing, existing)).rejects.toThrow("protected");
      expect(await readFile(existing, "utf8")).toBe("preserved");
    } finally { await rm(temporary, { recursive: true, force: true }); }
  });
  it("resolves explicit paths and allows help without reading corpus data", () => {
    expect(parseConditionalArguments(["--out", "result.json", "--source", "cmu.dict"], "/tmp/probe"))
      .toEqual({ help: false, source: "/tmp/probe/cmu.dict", out: "/tmp/probe/result.json" });
    expect(parseConditionalArguments(["--help"], "/tmp")).toEqual({ help: true });
  });
  it.each([
    [], ["--source", "input"], ["--source", "input", "--out"],
    ["--source", "input", "--out", ""], ["--source", "input", "--source", "other"],
    ["--source", "input", "--out", "output", "--alpha", "8"],
    ["--help", "--source", "input"], ["--source", "--out", "output"],
  ])("rejects incomplete, ambiguous or unregistered arguments: %j", (...args: string[]) => {
    expect(() => parseConditionalArguments(args, "/tmp")).toThrow();
  });
});
