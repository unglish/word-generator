import type { BaseSpellingTraceV3, SpellingCell, SpellingEdit } from "./base-spelling.js";
import type { NormalizationSite } from "./spelling-normalization-types.js";

/** Recount every scheduled writer guard, including guards that compare no letters. */
export function verifyNormalizationChecks(trace: BaseSpellingTraceV3): void {
  function require(condition: unknown, reason: string): asserts condition {
    if (!condition) throw new Error(`Invalid spelling evidence: normalization checks ${reason}`);
  }
  const equal = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
  const checks = trace.normalization.checks;
  require(Array.isArray(checks), "unavailable");
  const schedule = trace.units.flatMap((unit, id) => {
    const sites: NormalizationSite[] = ["adjacent-choice"];
    if (trace.phones[id + 1]?.syllableIndex !== trace.phones[id].syllableIndex) sites.push("syllable-join");
    return sites.map(site => ({ site, lastAppendedUnitId: unit.id }));
  });
  require(checks.length === schedule.length, "incomplete schedule");
  const cells: SpellingCell[] = trace.units.flatMap(unit => unit.sourceCellIds.map((id, offset) => ({
    id, text: unit.afterDoubling[offset],
    origin: { kind: "selection" as const, unitId: unit.id, offset },
    partId: trace.phones[unit.id].syllableIndex,
  })));
  const counts = { "adjacent-choice": 0, "syllable-join": 0 };
  const collisions = { "adjacent-choice": 0, "syllable-join": 0 };
  const localByEdit = new Map(trace.normalizationCertificates.map(certificate => [certificate.editId, certificate]));
  function beforeCheck(edit: SpellingEdit, site: NormalizationSite, end: number, part: number): boolean {
    const local = localByEdit.get(edit.id);
    if (edit.phase === "selection") {
      require(local?.site === "adjacent-choice", "selection edit phase");
      return local.cursor.lastAppendedUnitId < end || (local.cursor.lastAppendedUnitId === end && site === "syllable-join");
    }
    if (edit.phase === "syllable") {
      require(typeof edit.partId === "number" && Number.isInteger(edit.partId) && edit.partId >= 0, "syllable edit part");
      if (local) {
        require(local.site === "syllable-join", "join edit phase");
        return edit.partId < part;
      }
      return edit.partId < part || (edit.partId === part && site === "syllable-join");
    }
    require(edit.phase === "word" || edit.phase === "gap", "unknown edit phase");
    return false;
  }
  let expectedEdit = 0;
  let nextEdit = 0;
  let nextEpisode = 0;
  for (const [index, check] of checks.entries()) {
    const expected = schedule[index];
    const end = check.cursor.lastAppendedUnitId;
    require(check.site === expected.site && end === expected.lastAppendedUnitId, "application point");
    const part = trace.phones[end].syllableIndex;
    while (expectedEdit < trace.edits.length && beforeCheck(trace.edits[expectedEdit], check.site, end, part)) expectedEdit++;
    require(check.cursor.nextEditId === expectedEdit, "phase/part cursor");
    while (nextEdit < check.cursor.nextEditId) {
      const edit = trace.edits[nextEdit++];
      require(equal(cells.slice(edit.start, edit.start + edit.input.length), edit.input), "replay input");
      cells.splice(edit.start, edit.input.length, ...edit.output);
    }
    const prefix = cells.filter(cell => cell.origin.kind !== "selection" || cell.origin.unitId <= end);
    require(prefix.every(cell => (cell.origin.kind === "rewrite" ? cell.origin.sourceUnitIds : [cell.origin.unitId]).every(id => id <= end)), "future ownership");
    let left: SpellingCell | undefined;
    let right: SpellingCell | undefined;
    if (check.site === "adjacent-choice") {
      // The writer checks the immediately preceding emitted unit, even if empty.
      // It does not search backward to an earlier nonempty unit.
      if (trace.phones[end - 1]?.syllableIndex === part) {
        const previous = prefix.filter(cell => cell.origin.kind !== "rewrite" && cell.origin.unitId === end - 1);
        left = previous[previous.length - 1];
      }
      right = prefix.find(cell => cell.origin.kind === "selection" && cell.origin.unitId === end);
    } else {
      const previous = prefix.filter(cell => cell.partId === part - 1);
      left = previous[previous.length - 1];
      right = prefix.find(cell => cell.partId === part);
    }
    if (!left || !right) continue;
    counts[check.site]++;
    if (left.text !== right.text) continue;
    collisions[check.site]++;
    const episode = trace.normalization.episodes[nextEpisode++];
    require(episode && episode.site === check.site && equal(episode.cursor, check.cursor) &&
      episode.predecessorCellId === left.id && episode.rightCellId === right.id, "collision episode");
  }
  require(nextEpisode === trace.normalization.episodes.length, "extra collision episode");
  require(equal(counts, trace.normalization.comparisons), "comparison counts");
  require(equal(collisions, trace.normalization.collisions), "collision counts");
}
