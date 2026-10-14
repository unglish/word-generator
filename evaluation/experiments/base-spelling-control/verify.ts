import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createReadStream, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createInterface } from "node:readline";
import { createGunzip } from "node:zlib";
import { fileURLToPath } from "node:url";
import { readRun } from "../../quality/capture.js";
import type { Draw } from "../../quality/model.js";
import type {
  BaseSpellingTrace,
  SpellingCell,
  WordTrace,
} from "../../../src/index.js";

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

const capRules = new Set([
  "repairConsonantPileups",
  "repairConsonantLetters",
  "repairFinalConsonantLetters",
  "repairVowelLetters",
  "postJoinVowelCap",
  "repairJunctions:backstop",
]);
function counts() {
  return {
    words: 0,
    phones: 0,
    units: 0,
    unitsWithoutSourceCells: 0,
    partialDirectUnits: 0,
    noSurvivingLineageUnits: 0,
    partialThUnits: 0,
    partialThSourceEditRules: {} as Record<string, number>,
    noLineageLastConsumptionRules: {} as Record<string, number>,
    selectedThUnits: 0,
    directCells: 0,
    unresolvedCells: 0,
    wordsWithUnresolvedCells: 0,
    capWords: 0,
    capEvents: 0,
    capInputCells: 0,
    capUnknownInputCells: 0,
    observedNonpositiveChoices: 0,
    unavailableSelectedWeights: 0,
    editRules: {} as Record<string, number>,
    capRules: {} as Record<string, number>,
  };
}
function observe(
  draw: Draw,
  base: BaseSpellingTrace,
  stats: ReturnType<typeof counts>,
  witnesses: Record<string, unknown[]>,
): void {
  stats.words++;
  stats.phones += base.phones.length;
  stats.units += base.units.length;
  const direct = new Map<number, SpellingCell[]>();
  const rewritten = new Set<number>();
  for (const cell of base.cells) {
    if (cell.origin.kind === "selection") {
      stats.directCells++;
      const list = direct.get(cell.origin.unitId) ?? [];
      list.push(cell);
      direct.set(cell.origin.unitId, list);
    } else {
      stats.unresolvedCells++;
      for (const unitId of cell.origin.sourceUnitIds) rewritten.add(unitId);
    }
  }
  if (base.unresolvedCells > 0) stats.wordsWithUnresolvedCells++;
  function witness(reason: string, detail: unknown): void {
    const list = (witnesses[reason] ??= []);
    if (list.length < 6)
      list.push({
        profile: draw.profile,
        seed: draw.seed,
        drawIndex: draw.drawIndex,
        word: draw.word.written.clean,
        base: base.surface,
        detail,
      });
  }
  for (const unit of base.units) {
    if (unit.selected === "th") stats.selectedThUnits++;
    const remaining = direct.get(unit.id) ?? [];
    if (unit.sourceCellIds.length === 0) stats.unitsWithoutSourceCells++;
    if (remaining.length > 0 && remaining.length < unit.sourceCellIds.length)
      stats.partialDirectUnits++;
    if (
      unit.sourceCellIds.length > 0 &&
      remaining.length === 0 &&
      !rewritten.has(unit.id)
    ) {
      stats.noSurvivingLineageUnits++;
      const last = [...base.edits]
        .reverse()
        .find((edit) =>
          edit.input.some((cell) =>
            cell.origin.kind === "selection"
              ? cell.origin.unitId === unit.id
              : cell.origin.sourceUnitIds.includes(unit.id),
          ),
        );
      assert.ok(last);
      stats.noLineageLastConsumptionRules[last.rule] =
        (stats.noLineageLastConsumptionRules[last.rule] ?? 0) + 1;
      witness("noSurvivingLineage", {
        unit,
        phone: base.phones[unit.choiceId],
      });
    }
    if (
      unit.selected === "th" &&
      remaining.length === 1 &&
      !rewritten.has(unit.id)
    ) {
      stats.partialThUnits++;
      const missingId = unit.sourceCellIds.find(
        (id) => !remaining.some((cell) => cell.id === id),
      );
      const sourceEdit = base.edits.find((edit) =>
        edit.input.some((cell) => cell.id === missingId),
      );
      assert.ok(sourceEdit);
      stats.partialThSourceEditRules[sourceEdit.rule] =
        (stats.partialThSourceEditRules[sourceEdit.rule] ?? 0) + 1;
      witness("partialTh", {
        unit,
        remaining,
        phone: base.phones[unit.choiceId],
      });
    }
    const decision = draw.word.trace!.graphemeSelections[unit.choiceId];
    const weight = decision.weights.find(
      ([form]) => form === decision.selected,
    )?.[1];
    if (weight === undefined) stats.unavailableSelectedWeights++;
    else if (!(weight > 0) || !Number.isFinite(weight))
      stats.observedNonpositiveChoices++;
  }
  let hasCap = false;
  for (const edit of base.edits) {
    stats.editRules[edit.rule] = (stats.editRules[edit.rule] ?? 0) + 1;
    if (capRules.has(edit.rule)) {
      hasCap = true;
      stats.capEvents++;
      stats.capRules[edit.rule] = (stats.capRules[edit.rule] ?? 0) + 1;
      stats.capInputCells += edit.input.length;
      stats.capUnknownInputCells += edit.input.filter(
        (cell) => cell.origin.kind === "rewrite",
      ).length;
      witness("capEdit", edit);
    }
  }
  if (hasCap) stats.capWords++;
}
async function* rows(path: string): AsyncGenerator<Draw> {
  const stream = createReadStream(path).pipe(createGunzip());
  const lines = createInterface({ input: stream, crlfDelay: Infinity });
  for await (const line of lines) {
    assert.ok(line, `Blank archive row in ${path}`);
    yield JSON.parse(line) as Draw;
  }
}
const [originalArg, controlArg, outputArg] = process.argv.slice(2);
assert.ok(
  originalArg && controlArg && outputArg,
  "Usage: verify.ts ORIGINAL_RUN CONTROL_RUN OUTPUT.json",
);
const originalDir = resolve(originalArg);
const controlDir = resolve(controlArg);
const original = await readRun(originalDir, true);
const control = await readRun(controlDir, true);
assert.equal(control.manifest.id, "base-spelling-control");
assert.equal(control.manifest.cohort, "development");
assert.equal(original.manifest.cohort, "development");
for (const key of [
  "protocolDigest",
  "evaluatorDigest",
  "referenceDigest",
] as const)
  assert.equal(original.manifest[key], control.manifest[key], key);
assert.equal(
  control.manifest.evaluatorDigest,
  "ad7bf7980d18a9e4ed8084c5b3ea0b6f43ae24722db44b99f38a5da15c404007",
);
assert.equal(
  original.manifest.environment.node,
  control.manifest.environment.node,
);
assert.equal(
  original.manifest.environment.packageLockDigest,
  control.manifest.environment.packageLockDigest,
);
assert.deepEqual(original.summary.definitions, control.summary.definitions);
assert.deepEqual(
  original.summary.profiles,
  control.summary.profiles,
  "Frozen core summaries changed",
);
const wordArtifacts = (manifest: typeof original.manifest): string[] =>
  manifest.artifacts
    .filter((artifact) => artifact.file.startsWith("words/"))
    .map((artifact) => artifact.file)
    .sort();
const scheduledArtifacts = control.manifest.protocol.profiles
  .flatMap((profile) =>
    profile.seeds.development.map(
      (seed) => `words/${profile.id}-${seed}.jsonl.gz`,
    ),
  )
  .sort();
assert.deepEqual(wordArtifacts(original.manifest), scheduledArtifacts);
assert.deepEqual(wordArtifacts(control.manifest), scheduledArtifacts);
assert.equal(control.manifest.protocol.wordsPerReplicate, 10000);
const profiles: Array<{
  id: string;
  statistics: ReturnType<typeof counts>;
  witnesses: Record<string, unknown[]>;
}> = [];
const streams = [];
let compared = 0;
for (const profile of control.manifest.protocol.profiles) {
  const statistics = counts();
  const witnesses: Record<string, unknown[]> = {};
  for (const seed of profile.seeds.development) {
    const file = `words/${profile.id}-${seed}.jsonl.gz`;
    const iterator = rows(join(originalDir, file))[Symbol.asyncIterator]();
    let drawIndex = 0;
    const hash = createHash("sha256");
    for await (const candidate of rows(join(controlDir, file))) {
      const next = await iterator.next();
      assert.equal(next.done, false, `Original missing ${file}:${drawIndex}`);
      const expected = next.value!;
      for (const draw of [expected, candidate]) {
        assert.equal(draw.profile, profile.id);
        assert.equal(draw.seed, seed);
        assert.equal(draw.drawIndex, drawIndex);
      }
      assert.ok(
        !Object.hasOwn(expected.word.trace!, "baseSpelling"),
        "Original unexpectedly has ledger",
      );
      assert.ok(
        !Object.hasOwn(expected.word.trace!.orthography!, "alignment"),
        "Original unexpectedly has alignment label",
      );
      assert.equal(candidate.word.trace!.orthography!.alignment, "inferred");
      const base = verifyLedger(candidate.word.trace!);
      observe(candidate, base, statistics, witnesses);
      delete candidate.word.trace!.baseSpelling;
      delete candidate.word.trace!.orthography!.alignment;
      assert.deepEqual(
        candidate,
        expected,
        `${file}:${drawIndex} legacy output changed`,
      );
      hash.update(JSON.stringify(candidate) + "\n");
      drawIndex++;
      compared++;
    }
    assert.equal(
      (await iterator.next()).done,
      true,
      `Control missing rows in ${file}`,
    );
    assert.equal(drawIndex, 10000);
    streams.push({
      profile: profile.id,
      seed,
      words: drawIndex,
      commonLegacyDrawHash: hash.digest("hex"),
    });
    console.log(
      `${profile.id} ${seed}: ${drawIndex} exact legacy matches and replayed ledgers`,
    );
  }
  assert.equal(statistics.words, 50000);
  profiles.push({ id: profile.id, statistics, witnesses });
}
assert.equal(compared, 200000);
const sha = (bytes: Buffer): string =>
  createHash("sha256").update(bytes).digest("hex");
const report = {
  schemaVersion: 1,
  id: "base-spelling-control-verification",
  result: "pass",
  createdAt: new Date().toISOString(),
  description:
    "Regenerated ledger control from the parity-checked implementation; historical original archives remain unmodified.",
  original: {
    directory: originalDir,
    id: original.manifest.id,
    manifestSha256: sha(readFileSync(join(originalDir, "manifest.json"))),
  },
  control: {
    directory: controlDir,
    id: control.manifest.id,
    commit: control.manifest.generator.commit,
    sourceDigest: control.manifest.generator.sourceDigest,
    manifestSha256: sha(readFileSync(join(controlDir, "manifest.json"))),
  },
  scriptSha256: sha(readFileSync(fileURLToPath(import.meta.url))),
  node: process.version,
  compared,
  replayedLedgers: compared,
  coreProfilesExactlyEqual: true,
  strippedFields: [
    "word.trace.baseSpelling",
    "word.trace.orthography.alignment",
  ],
  streams,
  profiles,
};
writeFileSync(resolve(outputArg), JSON.stringify(report, null, 2) + "\n");
console.log(
  JSON.stringify({
    result: report.result,
    compared,
    replayedLedgers: compared,
    output: resolve(outputArg),
  }),
);
