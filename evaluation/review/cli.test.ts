import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("../../", import.meta.url));

describe.each(["review", "wordlikeness"] as const)("%s CLI JSON input", cli => {
  let directory: string;
  let output: string;
  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), "unglish-cli-json-"));
    output = cli === "review" ? join(directory, "report") :
      resolve(root, "review-exports/wordlikeness", basename(directory).toLowerCase());
  });
  afterEach(async () => {
    await rm(output, { recursive: true, force: true });
    await rm(directory, { recursive: true, force: true });
  });

  function run(input: string) {
    const script = cli === "review" ? "evaluation/review/cli.ts" : "evaluation/review/wordlikeness/cli.ts";
    const args = cli === "review" ? ["report", "--input", input, "--out", output] :
      ["evaluate", "--input", input, "--scores", "evaluation/review/wordlikeness/artifacts/frozen-scores-v1.json", "--run", basename(output)];
    return spawnSync(process.execPath, ["--import", "tsx", script, ...args], { cwd: root, encoding: "utf8", timeout: 10000 });
  }

  it("rejects malformed exports without printing private comment text or creating output", async () => {
    const input = join(directory, "export.json");
    // A realistic missing opening quote around an entirely synthetic comment.
    await writeFile(input, "{\"responses\":[{\"comment\":PVTNOTE synthetic reviewer sentence\"}]}");
    const result = run(input);
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
    for (const snippet of ["PVTNOTE", "comment", "reviewer sentence", "{\"responses\""]) {
      expect(result.stdout + result.stderr).not.toContain(snippet);
    }
    expect(result.stderr).toBe("Input file is not valid JSON. Check its syntax and try again.\n");
    expect(existsSync(output)).toBe(false);
    expect(await readdir(directory)).toEqual(["export.json"]);
  });

  it("preserves useful file-read errors", () => {
    const result = run(join(directory, "not-found.json"));
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("ENOENT");
    expect(result.stderr).toContain("not-found.json");
    expect(existsSync(output)).toBe(false);
  });

  it("preserves safe validation errors for valid JSON", async () => {
    const input = join(directory, "export.json");
    await writeFile(input, JSON.stringify({ schema_version: 0, study: { id: "test-invalid-schema" } }));
    const result = run(input);
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe("Unsupported export schema.\n");
    expect(existsSync(output)).toBe(false);
  });
});
