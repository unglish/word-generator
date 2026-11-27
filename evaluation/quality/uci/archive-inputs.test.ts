import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { expect, it, vi } from "vitest";
import { git, gitBytes } from "../git.js";
import { ROOT, sha256 } from "./reference.js";

it("preserves the pinned reference and root-census bytes on a CRLF checkout", async () => {
  const directory = await mkdtemp(join(tmpdir(), "unglish-uci-eol-"));
  const inputs = [
    "data/cmu/ordinary/spellings.txt", "evaluation/quality/uci/data/reference.json",
    "data/cmu/phoneme-normalization.json", "evaluation/corpus/root-coda-exclusions.json",
  ];
  try {
    git(directory, "init", "-q");
    git(directory, "config", "core.autocrlf", "true");
    await cp(join(ROOT, ".gitattributes"), join(directory, ".gitattributes"));
    for (const path of inputs) {
      await mkdir(join(directory, dirname(path)), { recursive: true });
      await cp(join(ROOT, path), join(directory, path));
    }
    await writeFile(join(directory, "control.txt"), "one\ntwo\n");
    git(directory, "add", "--", ".gitattributes", "control.txt", ...inputs);
    git(directory, "checkout-index", "--all", "--prefix=checkout/");
    expect(await readFile(join(directory, "checkout/control.txt"), "utf8")).toBe("one\r\ntwo\r\n");
    for (const path of inputs) {
      const bytes = await readFile(join(directory, "checkout", path));
      expect(sha256(bytes), path).toBe(sha256(await readFile(join(ROOT, path))));
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

it("reads compressed Git blobs byte for byte when a calling hook exports another repository and index", async () => {
  const directory = await mkdtemp(join(tmpdir(), "unglish-uci-blob-"));
  try {
    git(directory, "init", "-q");
    const caller = join(directory, "caller.git");
    git(directory, "init", "--bare", "-q", caller);
    const bytes = await readFile(join(ROOT, "evaluation/quality/uci/data/ordinary-surface-phones.txt.gz"));
    await writeFile(join(directory, "phones.gz"), bytes);
    git(directory, "add", "--", "phones.gz");
    vi.stubEnv("GIT_DIR", caller);
    vi.stubEnv("GIT_INDEX_FILE", join(caller, "index"));
    expect(sha256(gitBytes(directory, "show", ":phones.gz"))).toBe(sha256(bytes));
  } finally {
    vi.unstubAllEnvs();
    await rm(directory, { recursive: true, force: true });
  }
});
