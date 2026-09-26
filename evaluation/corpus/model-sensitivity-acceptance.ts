/** Formal CLI matrix. Authorize only after source review; this performs two full fixed-input studies. */
import { spawn } from "node:child_process";
import { createWriteStream, realpathSync } from "node:fs";
import { lstat, mkdir, readFile, readdir, symlink, link, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { freshPath, hashFile, verifyFreeze } from "./model-sensitivity-integrity.js";
import { same } from "./model-sensitivity.js";

export async function runMatrix(freeze: string, freezeSha256: string, destination: string): Promise<void> {
  const frozen = await verifyFreeze(freeze, freezeSha256);
  const out = await freshPath(frozen.root, destination, [freeze, ...Object.values(frozen.inputs)]);
  await mkdir(out);
  const require = createRequire(import.meta.url), loader = require.resolve("tsx");
  const cli = join(frozen.root, "evaluation/corpus/model-sensitivity-cli.ts");
  const records: { name: string; args: string[]; cwd: string; expectedExit: number; actualExit: number | null; log: string; sha256: string }[] = [];
  const run = async (name: string, args: string[], cwd: string, expectedExit: number): Promise<void> => {
    const log = join(out, `${name}.log`), stream = createWriteStream(log, { flags: "wx" });
    const child = spawn(process.execPath, ["--import", loader, cli, ...args], { cwd, stdio: ["ignore", "pipe", "pipe"] });
    child.stdout.pipe(stream, { end: false }); child.stderr.pipe(stream, { end: false });
    const actualExit = await new Promise<number | null>((done, reject) => { child.on("error", reject); child.on("close", done); });
    await new Promise<void>((done, reject) => { stream.on("error", reject); stream.end(done); });
    records.push({ name, args, cwd, expectedExit, actualExit, log: `${name}.log`, sha256: (await hashFile(log)).sha256 });
    await writeFile(join(out, `${name}.json`), JSON.stringify(records[records.length - 1]) + "\n", { flag: "wx" });
    same(actualExit, expectedExit, `CLI case ${name}`);
  };
  const score = (output: string): string[] => ["score", "--freeze", freeze, "--freeze-sha256", freezeSha256, "--out", output];
  try {
    await run("no-args", [], frozen.root, 1);
    await run("help-other-cwd", ["--help"], out, 0);
    await run("missing-flags", ["score", "--freeze", freeze], frozen.root, 1);
    await run("unknown-flag", [...score(join(out, "unpublished-unknown")), "--source", frozen.inputs.source], frozen.root, 1);
    await run("repeated-flag", [...score(join(out, "unpublished-repeated")), "--out", join(out, "also-unpublished")], frozen.root, 1);
    const wrongSource = join(out, "wrong-source.dict"); await writeFile(wrongSource, "fixture AA0\n", { flag: "wx" });
    await run("wrong-source", ["freeze", "--source", wrongSource, "--archive", frozen.inputs.archive, "--identity", frozen.inputs.identity,
      "--identity-report", frozen.inputs.identityReport, "--out", join(out, "unpublished-freeze.json")], frozen.root, 1);
    await run("wrong-external-authority", ["score", "--freeze", freeze, "--freeze-sha256", "0".repeat(64), "--out", join(out, "unpublished-authority")], frozen.root, 1);
    const existing = join(out, "existing"), hard = join(out, "hardlink"), dangling = join(out, "dangling"), alias = join(out, "archive-alias");
    await writeFile(existing, "retained fixture\n", { flag: "wx" }); await link(existing, hard);
    await symlink(join(out, "missing-target"), dangling); await symlink(frozen.inputs.archive, alias);
    for (const [name, target] of [["existing", existing], ["hardlink", hard], ["dangling", dangling], ["archive-alias", join(alias, "never-publish")],
      ["source-directory", join(frozen.root, "never-publish-model-study")], ["frozen-evidence", join(frozen.root, "evaluation/experiments/cmu-shared-parser/never-publish")]]) {
      await run(`reject-${name}`, score(target), frozen.root, 1);
    }
    await run("full-root-cwd", score(join(out, "root-run")), frozen.root, 0);
    await run("full-other-cwd", score(join(out, "other-run")), out, 0);
    const files = (await readdir(join(out, "root-run"))).sort();
    same((await readdir(join(out, "other-run"))).sort(), files, "complete deterministic artifact sets");
    const hashes: Record<string, string> = {};
    for (const file of files) {
      const a = await hashFile(join(out, "root-run", file)), b = await hashFile(join(out, "other-run", file)); same(a, b, `deterministic bytes ${file}`); hashes[file] = a.sha256;
    }
    for (const name of ["unpublished-unknown", "unpublished-authority", "unpublished-repeated", "also-unpublished", "unpublished-freeze.json"]) {
      const entry = await lstat(join(out, name)).catch(error => { if (error.code === "ENOENT") return null; throw error; });
      same(entry, null, "failed command publication absence");
    }
    same(await readFile(existing, "utf8"), "retained fixture\n", "unchanged failed-overwrite bytes");
    await verifyFreeze(freeze, freezeSha256);
    await writeFile(join(out, "acceptance.json"), JSON.stringify({ version: "cmu-model-sensitivity-cli-acceptance-v1", passed: true, freezeSha256, records, hashes }) + "\n", { flag: "wx" });
  } catch (error) {
    await writeFile(join(out, "failure.json"), JSON.stringify({ passed: false, records, message: error instanceof Error ? error.message : String(error) }) + "\n", { flag: "wx" }); throw error;
  }
}
if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [freeze, digest, out, ...extra] = process.argv.slice(2);
    if (!freeze || !/^[a-f0-9]{64}$/.test(digest ?? "") || !out || extra.length) throw new Error("Usage: node --import tsx evaluation/corpus/model-sensitivity-acceptance.ts REVIEWED_FREEZE EXTERNAL_SHA FRESH_MATRIX_DIRECTORY");
    await runMatrix(resolve(freeze), digest, resolve(out));
  } catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
}
