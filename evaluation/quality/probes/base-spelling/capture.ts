import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import type {
  BaseSpellingTrace,
  SpellingCell,
  WordTrace,
} from "../../../../src/index.js";
import type { Word, WordGenerationOptions } from "../../../../src/types.js";

type API = typeof import("../../../../src/index.js");
const profiles = [
  {
    id: "lexicon-default",
    options: { mode: "lexicon", morphology: true },
    seeds: [69212153, 101601885, 3921817393, 3948943232, 2089697863],
  },
  {
    id: "lexicon-bare",
    options: { mode: "lexicon", morphology: false },
    seeds: [2380207674, 772709128, 1304238451, 1696751198, 1498885173],
  },
  {
    id: "monosyllables-bare",
    options: { mode: "lexicon", morphology: false, syllableCount: 1 },
    seeds: [462530651, 62358955, 3297327738, 2001884366, 2353354178],
  },
  {
    id: "text-default",
    options: { mode: "text", morphology: true },
    seeds: [4167471042, 2666001996, 3562318933, 1999736106, 1665836705],
  },
] satisfies Array<{
  id: string;
  options: WordGenerationOptions;
  seeds: number[];
}>;
const draws = 1000;
const sha = (value: string | Buffer): string =>
  createHash("sha256").update(value).digest("hex");

function sourceSnapshot(root: string): Record<string, string> {
  const result: Record<string, string> = {};
  function walk(directory: string): void {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort(
      (a, b) => a.name.localeCompare(b.name),
    )) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (
        /\.(?:ts|js|mjs|json)$/.test(entry.name) &&
        !/\.(?:test|bench)\./.test(entry.name)
      )
        result[relative(root, path)] = sha(readFileSync(path));
    }
  }
  walk(join(root, "src"));
  for (const path of ["package.json", "package-lock.json", "tsconfig.json"]) {
    result[path] = sha(readFileSync(join(root, path)));
  }
  return result;
}

/** Replay selected cells followed by edits; later choices append at the end. */
function verifyLedger(trace: WordTrace): BaseSpellingTrace {
  const base = trace.baseSpelling;
  assert.ok(base, "Candidate has no baseSpelling");
  const knownIds = new Set<number>();
  const cells: SpellingCell[] = [];
  for (const unit of base.units) {
    assert.equal(unit.id, unit.choiceId);
    assert.deepEqual(unit.phoneIds, [unit.choiceId]);
    const choice = trace.graphemeSelections[unit.choiceId];
    assert.equal(unit.selected, choice.selected);
    assert.equal(
      unit.afterDoubling,
      choice.doubling?.result ?? choice.selected,
    );
    assert.equal(base.phones[unit.choiceId].soundAtSpelling, choice.phoneme);
    assert.equal(unit.sourceCellIds.length, unit.afterDoubling.length);
    cells.push(
      ...unit.sourceCellIds.map((id, offset): SpellingCell => {
        assert.ok(!knownIds.has(id), "Duplicate source cell ID");
        knownIds.add(id);
        return {
          id,
          text: unit.afterDoubling[offset],
          origin: { kind: "selection", unitId: unit.id, offset },
        };
      }),
    );
  }
  for (const [id, edit] of base.edits.entries()) {
    assert.equal(edit.id, id);
    assert.deepEqual(
      cells.slice(edit.start, edit.start + edit.input.length),
      edit.input,
    );
    assert.equal(edit.before, edit.input.map((cell) => cell.text).join(""));
    assert.equal(edit.after, edit.output.map((cell) => cell.text).join(""));
    const sourceUnitIds = [
      ...new Set(
        edit.input.flatMap((cell) =>
          cell.origin.kind === "selection"
            ? [cell.origin.unitId]
            : cell.origin.sourceUnitIds,
        ),
      ),
    ];
    for (const cell of edit.output) {
      assert.ok(!knownIds.has(cell.id), "Reused edit cell ID");
      knownIds.add(cell.id);
      assert.deepEqual(cell.origin, {
        kind: "rewrite",
        editId: id,
        sourceUnitIds,
        ownership: "unresolved",
      });
    }
    cells.splice(edit.start, edit.input.length, ...edit.output);
  }
  assert.deepEqual(cells, base.cells);
  assert.equal(base.surface, cells.map((cell) => cell.text).join(""));
  assert.equal(
    base.unresolvedCells,
    cells.filter((cell) => cell.origin.kind === "rewrite").length,
  );
  assert.equal(base.surface, trace.orthography?.surface);
  return base;
}

function comparableWord(word: Word): string {
  const output = { ...word };
  delete output.trace;
  return JSON.stringify(output);
}
function comparableTrace(trace: WordTrace): string {
  const legacy = { ...trace };
  delete legacy.baseSpelling;
  if (legacy.orthography) {
    legacy.orthography = { ...legacy.orthography };
    delete legacy.orthography.alignment;
  }
  return JSON.stringify(legacy);
}

const [rootArg, outputArg, mode] = process.argv.slice(2);
assert.ok(
  rootArg && outputArg && (mode === "original" || mode === "candidate"),
  "Usage: capture.ts CHECKOUT REPORT.json original|candidate",
);
const root = resolve(rootArg);
const sourceFiles = sourceSnapshot(root);
const sourceDigest = sha(JSON.stringify(sourceFiles));
const api: API = await import(pathToFileURL(join(root, "src/index.ts")).href);
const streams = [];
const editCounts: Record<string, number> = {};
let verifiedLedgers = 0;
for (const profile of profiles) {
  for (const seed of profile.seeds) {
    const variants = [];
    for (const tracing of [false, true]) {
      const rng = api.createSeededRng(seed);
      let calls = 0;
      const rand = (): number => {
        calls++;
        return rng();
      };
      const wordHash = createHash("sha256");
      const rngHash = createHash("sha256");
      const traceHash = createHash("sha256");
      for (let draw = 0; draw < draws; draw++) {
        const word = api.generateWord({
          ...profile.options,
          rand,
          trace: tracing,
        });
        wordHash.update(comparableWord(word) + "\n");
        rngHash.update(`${draw}:${calls}\n`);
        if (tracing) {
          traceHash.update(comparableTrace(word.trace!) + "\n");
          if (mode === "candidate") {
            const base = verifyLedger(word.trace!);
            verifiedLedgers++;
            for (const edit of base.edits)
              editCounts[edit.rule] = (editCounts[edit.rule] ?? 0) + 1;
          }
        }
      }
      variants.push({
        tracing,
        wordHash: wordHash.digest("hex"),
        rngBoundaryHash: rngHash.digest("hex"),
        rngCalls: calls,
        nextRng: rng(),
        legacyTraceHash: tracing ? traceHash.digest("hex") : null,
      });
    }
    for (const key of [
      "wordHash",
      "rngBoundaryHash",
      "rngCalls",
      "nextRng",
    ] as const)
      assert.equal(
        variants[0][key],
        variants[1][key],
        `${profile.id} ${seed}: trace parity ${key}`,
      );
    streams.push({
      profile: profile.id,
      options: profile.options,
      seed,
      draws,
      variants,
    });
  }
}
assert.deepEqual(
  sourceSnapshot(root),
  sourceFiles,
  "Runtime source changed during capture",
);
const probePath = fileURLToPath(import.meta.url);
const report = {
  schemaVersion: 1,
  probe: "base-spelling-parity-v1",
  createdAt: new Date().toISOString(),
  mode,
  node: process.version,
  checkout: root,
  gitHead: execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  }).trim(),
  sourceDigest,
  sourceFiles,
  evaluatorSha256: sha(readFileSync(probePath)),
  scheduleSha256: sha(JSON.stringify({ profiles, draws })),
  generatedWords: draws * streams.length * 2,
  verifiedLedgers,
  editCounts,
  streams,
};
writeFileSync(resolve(outputArg), JSON.stringify(report, null, 2) + "\n");
console.log(
  JSON.stringify({
    mode,
    sourceDigest,
    generatedWords: report.generatedWords,
    verifiedLedgers,
    report: resolve(outputArg),
  }),
);
