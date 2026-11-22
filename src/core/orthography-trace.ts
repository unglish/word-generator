import type { BaseSpellingTrace, SpellingEdit } from "./base-spelling.js";
import type {
  TraceCollector,
  OrthographySource,
  OrthographyTrace,
  OrthographyUnitTrace,
  TraceLink,
  StructuralTrace,
} from "./trace.js";

export interface TraceUnitSeed {
  id: number;
  graphemeSelectionIndex: number;
  phoneme: string;
  position: string;
  positionIndex: number;
  syllableIndex: number;
  selected: string;
  emitted: string;
}

type EditOp = "match" | "substitute" | "insert" | "delete";

/**
 * Map character ownership from a source string onto a rewritten target string.
 *
 * Uses edit-distance alignment and propagates ownership through substitutions
 * and insertions so every target character can be highlighted in the debug UI.
 */
export function remapOwnersThroughRewrite(
  source: string,
  sourceOwners: number[],
  target: string,
): number[] {
  if (source === target) return sourceOwners.slice(0, target.length);
  if (target.length === 0) return [];
  if (source.length === 0) return new Array<number>(target.length).fill(-1);

  const m = source.length;
  const n = target.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array<number>(n + 1).fill(0),
  );

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const substCost = source[i - 1] === target[j - 1] ? 0 : 1;
      const del = dp[i - 1][j] + 1;
      const ins = dp[i][j - 1] + 1;
      const sub = dp[i - 1][j - 1] + substCost;
      dp[i][j] = Math.min(del, ins, sub);
    }
  }

  const ops: EditOp[] = [];
  let i = m;
  let j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0) {
      const substCost = source[i - 1] === target[j - 1] ? 0 : 1;
      if (dp[i][j] === dp[i - 1][j - 1] + substCost) {
        ops.push(substCost === 0 ? "match" : "substitute");
        i--;
        j--;
        continue;
      }
    }
    if (j > 0 && dp[i][j] === dp[i][j - 1] + 1) {
      ops.push("insert");
      j--;
      continue;
    }
    if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
      ops.push("delete");
      i--;
      continue;
    }
    // Defensive fallback for any rare tie/rounding edge.
    if (i > 0 && j > 0) {
      ops.push("substitute");
      i--;
      j--;
    } else if (j > 0) {
      ops.push("insert");
      j--;
    } else {
      ops.push("delete");
      i--;
    }
  }
  ops.reverse();

  const targetOwners = new Array<number>(n).fill(-1);
  let srcIdx = 0;
  let tgtIdx = 0;

  for (const op of ops) {
    if (op === "match" || op === "substitute") {
      targetOwners[tgtIdx] = sourceOwners[srcIdx] ?? -1;
      srcIdx++;
      tgtIdx++;
      continue;
    }
    if (op === "delete") {
      srcIdx++;
      continue;
    }
    const leftOwner = tgtIdx > 0 ? targetOwners[tgtIdx - 1] : -1;
    const rightOwner = sourceOwners[srcIdx] ?? -1;
    targetOwners[tgtIdx] = leftOwner !== -1 ? leftOwner : rightOwner;
    tgtIdx++;
  }

  for (let k = 0; k < targetOwners.length; k++) {
    if (targetOwners[k] !== -1) continue;
    let resolved = -1;
    for (let l = k - 1; l >= 0; l--) {
      if (targetOwners[l] !== -1) {
        resolved = targetOwners[l];
        break;
      }
    }
    if (resolved === -1) {
      for (let r = k + 1; r < targetOwners.length; r++) {
        if (targetOwners[r] !== -1) {
          resolved = targetOwners[r];
          break;
        }
      }
    }
    targetOwners[k] = resolved;
  }

  return targetOwners;
}

function buildLinksForUnit(
  unit: TraceUnitSeed,
  trace: TraceCollector,
  source?: OrthographySource,
  removal?: SpellingEdit,
): TraceLink[] {
  const links: TraceLink[] = [
    {
      kind: "graphemeSelection",
      index: unit.graphemeSelectionIndex,
      label: `graphemeSelection:${unit.graphemeSelectionIndex}`,
    },
  ];

  const repNeedles = [unit.emitted, unit.selected].filter(
    (n) => !!n && n.length >= 2,
  );
  const hasTokenLike = (text: string, needle: string): boolean => {
    if (!needle || needle.length < 2) return false;
    // Boundaries are start/end or non-letter to reduce accidental substring matches.
    const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rx = new RegExp(`(^|[^a-z])${escaped}([^a-z]|$)`, "i");
    return rx.test(text);
  };
  for (let i = 0; i < trace.repairs.length; i++) {
    const r = trace.repairs[i];
    if (
      (removal && r.spellingEditIds?.includes(removal.id)) ||
      repNeedles.some(
        (n) => hasTokenLike(r.before, n) || hasTokenLike(r.after, n),
      )
    ) {
      links.push({ kind: "repair", index: i, label: r.rule });
    }
  }

  for (let i = 0; i < trace.structural.length; i++) {
    const s = trace.structural[i];
    if (structuralEventReferencesUnit(s, unit, source)) {
      links.push({ kind: "structural", index: i, label: s.event });
    }
  }

  return links;
}

function structuralEventReferencesUnit(
  event: StructuralTrace,
  unit: TraceUnitSeed,
  source?: OrthographySource,
): boolean {
  switch (event.event) {
  case "boundaryDrop":
    // Dropped-coda segment is removed pre-orthography; link only the onset-side survivor.
    return (
      unit.position === "onset" &&
        unit.syllableIndex === event.rightSyllableIndex &&
        unit.phoneme === event.beforeOnset
    );
  case "sspBoundaryDrop":
    return (
      (unit.position === "coda" &&
          unit.syllableIndex === event.leftSyllableIndex &&
          event.remainingCoda.includes(unit.phoneme)) ||
        (unit.position === "onset" &&
          unit.syllableIndex === event.rightSyllableIndex &&
          event.onset.includes(unit.phoneme))
    );
  case "risingCodaBoundaryDrop":
  case "junctionBoundaryDrop":
    return (
      (unit.position === "coda" &&
          unit.syllableIndex === event.leftSyllableIndex &&
          event.remainingCoda.includes(unit.phoneme)) ||
        (unit.position === "onset" &&
          unit.syllableIndex === event.rightSyllableIndex &&
          event.onset.includes(unit.phoneme))
    );
  case "finalS":
    return (
      unit.position === "coda" &&
        unit.syllableIndex === event.syllableIndex &&
        unit.phoneme === "s"
    );
  case "nasalStopExtension":
    return (
      unit.position === "coda" &&
        unit.syllableIndex === event.syllableIndex &&
        (unit.phoneme === event.nasal || unit.phoneme === event.appendedStop)
    );
  case "vowelHiatusFallback":
    return (
      unit.position === "onset" &&
        unit.syllableIndex === event.rightSyllableIndex &&
        unit.phoneme === event.inserted
    );
  case "morphPrefixHiatusFallback":
  case "morphSuffixHiatusFallback":
    // Morphology inserts these phones only in the assembled derived word.
    // They have no grapheme in the base root, even if its index/sound matches.
    if (source?.kind === "lexical-root") return false;
    return (
      unit.position === "onset" &&
        unit.syllableIndex === event.syllableIndex &&
        unit.phoneme === event.inserted
    );
  case "codaExtensionRejected":
    return false;
  case "aspirationDecision":
    if (!event.targetPhoneme) return false;
    return (
      unit.position === (event.targetSegment ?? "onset") &&
        unit.syllableIndex === event.syllableIndex &&
        (event.targetIndex == null ||
          unit.positionIndex === event.targetIndex) &&
        unit.phoneme === event.targetPhoneme
    );
  case "morphHiatusDecision":
    // Morphology follows base spelling; these coordinates have a different scope.
    return false;
  }
}

/**
 * Project compatibility owners through each actual edit span. Matching against
 * the whole word can move ownership onto unrelated letters of the same form.
 * Joint rewrite ancestry remains in baseSpelling; this view still picks one owner.
 */
function projectOwners(base: BaseSpellingTrace): {
  owners: number[];
  removals: Map<number, SpellingEdit>;
} {
  const owners = base.units.flatMap(unit => unit.sourceCellIds.map(() => unit.id));
  const removals = new Map<number, SpellingEdit>();
  for (const edit of base.edits) {
    const removed = owners.slice(edit.start, edit.start + edit.input.length);
    const inserted = removed.length
      ? remapOwnersThroughRewrite(edit.before, removed, edit.after)
      : edit.output.map(() => owners[edit.start - 1] ?? owners[edit.start] ?? -1);
    owners.splice(edit.start, removed.length, ...edit.output.map((cell, index) =>
      cell.origin.kind === "licensed" ? cell.origin.unitId : inserted[index]));
    for (const owner of removed) {
      if (owner >= 0 && !owners.includes(owner)) removals.set(owner, edit);
    }
  }
  return { owners, removals };
}

export function buildOrthographyTrace(
  base: BaseSpellingTrace,
  units: TraceUnitSeed[],
  trace: TraceCollector,
  source?: OrthographySource,
): OrthographyTrace {
  const { surface } = base;
  const { owners: finalOwners, removals } = projectOwners(base);
  const unitById = new Map<number, TraceUnitSeed>(units.map((u) => [u.id, u]));
  const spans = new Map<number, { start: number; end: number }>();
  for (let i = 0; i < finalOwners.length; i++) {
    const owner = finalOwners[i];
    if (!unitById.has(owner)) continue;
    const existing = spans.get(owner);
    if (!existing) {
      spans.set(owner, { start: i, end: i });
    } else {
      existing.end = i;
    }
  }

  const chars = surface.split("").map((char, index) => {
    const unitId = finalOwners[index] ?? -1;
    const owner = unitById.get(unitId);
    return {
      index,
      char,
      unitId,
      graphemeSelectionIndex: owner ? owner.graphemeSelectionIndex : -1,
    };
  });

  const toUnitTrace = (unit: TraceUnitSeed): OrthographyUnitTrace => {
    const span = spans.get(unit.id);
    const removedBy = removals.get(unit.id);
    return {
      id: unit.id,
      graphemeSelectionIndex: unit.graphemeSelectionIndex,
      phoneme: unit.phoneme,
      position: unit.position,
      syllableIndex: unit.syllableIndex,
      selected: unit.selected,
      emitted: unit.emitted,
      present: !!span,
      start: span ? span.start : null,
      end: span ? span.end : null,
      ...(!span && removedBy ? { deletedBy: { editId: removedBy.id, rule: removedBy.rule } } : {}),
      links: buildLinksForUnit(unit, trace, source, removedBy),
    };
  };

  const graphemeUnits = units.map(toUnitTrace);
  return {
    surface,
    chars,
    graphemeUnits,
    alignment: "inferred",
    ...(source ? { source } : {}),
  };
}

export function rewriteOrthographyTraceSurface(
  trace: TraceCollector,
  surface: string,
  edit?: SpellingEdit,
): void {
  const orthography = trace.orthographyTrace;
  if (!orthography) return;

  const unitById = new Map<number, OrthographyUnitTrace>(
    orthography.graphemeUnits.map((unit) => [unit.id, unit]),
  );
  const sourceOwners = orthography.chars.map((char) => char.unitId);
  const remappedOwners = remapOwnersThroughRewrite(
    orthography.surface,
    sourceOwners,
    surface,
  );
  const spans = new Map<number, { start: number; end: number }>();

  for (let i = 0; i < remappedOwners.length; i++) {
    const owner = remappedOwners[i];
    if (!unitById.has(owner)) continue;
    const span = spans.get(owner);
    if (span) {
      span.end = i;
    } else {
      spans.set(owner, { start: i, end: i });
    }
  }

  orthography.surface = surface;
  orthography.chars = surface.split("").map((char, index) => {
    const unitId = remappedOwners[index] ?? -1;
    const unit = unitById.get(unitId);
    return {
      index,
      char,
      unitId,
      graphemeSelectionIndex: unit?.graphemeSelectionIndex ?? -1,
    };
  });
  const repairIndex = edit ? trace.repairs.findIndex(repair =>
    repair.spellingEditIds?.includes(edit.id)) : -1;
  orthography.graphemeUnits = orthography.graphemeUnits.map((unit) => {
    const span = spans.get(unit.id);
    const newlyAbsent = edit && unit.present && !span;
    return {
      ...unit,
      ...(newlyAbsent ? {
        deletedBy: { editId: edit.id, rule: edit.rule },
        ...(repairIndex >= 0 ? {
          links: [...unit.links ?? [], { kind: "repair", index: repairIndex, label: edit.rule }],
        } : {}),
      } : {}),
      present: !!span,
      start: span ? span.start : null,
      end: span ? span.end : null,
    };
  });
}
