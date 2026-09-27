import { spellingBoundaryContexts } from "../../../src/core/spelling-context.js";
import { createGraphemeSequenceModel } from "../../../src/core/spelling-sequence-model.js";
import { verifySequenceEvidence } from "../../../src/core/spelling-sequence-evidence.js";
import type { LanguageConfig } from "../../../src/config/language.js";
import type { GraphemeReading, Word } from "../../../src/types.js";
import type { SpellingCell } from "../../../src/core/base-spelling.js";
import type { ConstructionLedgerView } from "../../../src/core/spelling-construction-ownership.js";
import { resolveSingleSpellingUnit } from "../../../src/core/spelling-construction-ownership.js";
import { createDoublingModel } from "../../../src/core/spelling-doubling.js";
import { createBaseSpellingEvidenceVerifier } from "../../../src/core/spelling-evidence.js";

export type FollowingContext = { kind: "letter"; letter: string; origin: string }
  | { kind: "root-edge" } | { kind: "unavailable" };
export type ReadingStatus = "contextual-compatible" | "contextual-incompatible"
  | "context-unavailable" | "non-contextual" | "reading-unavailable";
export type OwnershipStatus = "single-owned" | "joint-owned" | "unavailable" | "outside-supported-version";
export interface FollowingEvent {
  boundary: "selection" | "final-root";
  phoneId: number;
  sound: string;
  selected: string | null;
  form: string | null;
  stratum: string;
  selectionStratum: string;
  ownership: OwnershipStatus;
  reason?: string;
  cellIds?: number[];
  constructionId?: number;
  context?: FollowingContext;
  reading?: GraphemeReading;
  readingStatus?: ReadingStatus;
  interpretation: string;
  finalAssembled: "unavailable";
}
const strata = ["soft-c:c", "soft-c:sc", "soft-g:g", "hard-c:c", "hard-g:g", "hard-g:gu", "other"] as const;

export interface FollowingObservation {
  counts: Record<string, number>;
  events: FollowingEvent[];
}

/** Context is written adjacency, never the next phone's vowel category. */
export function classifyFollowing(reading: GraphemeReading | undefined, context: FollowingContext): ReadingStatus {
  if (!reading || reading.kind === "unsupported-construction") return "reading-unavailable";
  if (reading.kind !== "following-letter") return "non-contextual";
  if (context.kind === "unavailable") return "context-unavailable";
  const letter = context.kind === "root-edge" ? "" : context.letter.toLowerCase();
  if (reading.require && !reading.require.includes(letter) || reading.forbid?.includes(letter)) return "contextual-incompatible";
  return "contextual-compatible";
}

export function followingStratum(sound: string, form: string | null): string {
  if (sound === "s" && (form === "c" || form === "sc")) return `soft-c:${form}`;
  if (sound === "dʒ" && form === "g") return "soft-g:g";
  if (sound === "k" && form === "c") return "hard-c:c";
  if (sound === "g" && (form === "g" || form === "gu")) return `hard-g:${form}`;
  return "other";
}

export function interpretFollowing(event: FollowingEvent): string {
  if (event.ownership !== "single-owned" || event.readingStatus === "reading-unavailable") return "unsupported-evidence";
  if (event.stratum === "hard-g:g" && event.context?.kind === "letter" && ["e", "i", "y"].includes(event.context.letter.toLowerCase())) {
    return "hard-g-exception-sensitive";
  }
  if (!event.context || event.context.kind === "unavailable") return "unsupported-evidence";
  const frontLetter = event.context.kind === "letter" && ["e", "i", "y"].includes(event.context.letter.toLowerCase());
  if (event.stratum.startsWith("soft-") && !frontLetter) return "productive-soft-pattern-departure";
  if (event.stratum === "hard-c:c" && frontLetter) return "hard-c-pattern-departure";
  if (event.readingStatus === "contextual-incompatible") return "other-declared-context-departure";
  return "no-departure-established";
}

/** Producer-assisted observation: semantic authentication precedes every count. */
export function createFollowingObserver(configuration: LanguageConfig) {
  const config = structuredClone(configuration);
  const verify = createBaseSpellingEvidenceVerifier(config);
  const doubling = createDoublingModel(config.doubling);

  function selectedReading(view: ConstructionLedgerView, unitId: number): GraphemeReading | undefined {
    const unit = view.units[unitId];
    const grapheme = unit.inventoryIndex === undefined ? undefined : config.graphemes[unit.inventoryIndex];
    if (!grapheme || grapheme.form !== unit.selected || grapheme.phoneme !== view.phones[unitId].soundAtSpelling) return;
    return doubling.readingFor(grapheme, unit.afterDoubling);
  }

  function currentReading(view: ConstructionLedgerView, unitId: number, first: SpellingCell): GraphemeReading | undefined {
    const origin = first.origin;
    switch (origin.kind) {
      case "selection": return selectedReading(view, unitId);
      case "licensed": return view.certificates[origin.certificateId]?.replacements.find(item => item.unitId === unitId)?.reading;
      case "normalized": return view.normalizationCertificates[origin.certificateId]?.targetReading;
      case "completion": return view.completionCertificates?.[origin.certificateId]?.reading;
      default: return undefined;
    }
  }

  return (word: Word): FollowingObservation => {
    const base = word.trace?.baseSpelling;
    if (!base) throw new Error("Following-letter observation requires a complete base trace");
    const selections = word.trace!.graphemeSelections;
    if (!config.followingLetters && (base.followingGuards !== undefined || selections.some(selection => selection.conditionedSelection))) {
      throw new Error("Conditioned selection requires its declared configuration");
    }
    verify(base);
    if (config.followingLetters) {
      if (selections.length !== base.units.length) throw new Error("Conditioned selection population mismatch");
      const records = selections.map((selection, index) => {
        const record = selection.conditionedSelection;
        const unit = base.units[index];
        if (!record || record.index !== index || selection.index !== index ||
            record.choice.selected !== unit.selected || record.choice.realized !== unit.afterDoubling ||
            !("inventoryIndex" in unit) || record.choice.inventoryIndex !== unit.inventoryIndex ||
            !("doublingIncrement" in unit) || record.choice.doublingIncrement !== unit.doublingIncrement ||
            selection.selected !== record.choice.selected || selection.selection || selection.doubling) {
          throw new Error("Conditioned selection disagrees with base evidence");
        }
        return record;
      });
      const contexts = spellingBoundaryContexts(base.phones);
      verifySequenceEvidence(createGraphemeSequenceModel(config,
        contexts.map(context => ({ grapheme: context.slot, doubling: context.doubling })), config.followingLetters.targets), records);
    }
    const events: FollowingEvent[] = [];
    const counts: Record<string, number> = { words: 1, phones: base.phones.length };
    for (const boundary of ["selection", "final-root"]) {
      for (const ownership of ["single-owned", "joint-owned", "unavailable", "outside-supported-version"]) {
        counts[`${boundary}:ownership:${ownership}`] = 0;
        for (const stratum of strata) {
          counts[`${boundary}:stratum:${stratum}:ownership:${ownership}`] = 0;
          counts[`${boundary}:selectionCohort:${stratum}:ownership:${ownership}`] = 0;
        }
      }
      for (const status of ["contextual-compatible", "contextual-incompatible", "context-unavailable", "non-contextual", "reading-unavailable"]) {
        counts[`${boundary}:reading:${status}`] = 0;
        for (const stratum of strata) {
          counts[`${boundary}:stratum:${stratum}:reading:${status}`] = 0;
        }
      }
    }
    const add = (key: string) => { counts[key] = (counts[key] ?? 0) + 1; };
    const record = (event: FollowingEvent) => {
      event.interpretation = interpretFollowing(event);
      events.push(event);
      add(`${event.boundary}:ownership:${event.ownership}`);
      add(`${event.boundary}:stratum:${event.stratum}:ownership:${event.ownership}`);
      add(`${event.boundary}:selectionCohort:${event.selectionStratum}:ownership:${event.ownership}`);
      if (event.readingStatus) {
        add(`${event.boundary}:reading:${event.readingStatus}`);
        add(`${event.boundary}:stratum:${event.stratum}:reading:${event.readingStatus}`);
      }
      add(`${event.boundary}:interpretation:${event.interpretation}`);
    };
    const view: ConstructionLedgerView = {
      cursor: { lastAppendedUnitId: base.units.length - 1, nextEditId: base.edits.length },
      phones: base.phones, units: base.units, cells: base.cells, certificates: base.certificates ?? [],
      normalizationCertificates: base.normalizationCertificates ?? [],
      constructions: base.version === 4 || base.version === 5
        ? base.shared.constructions.filter(item => base.shared.liveConstructionIds.includes(item.id)) : [],
      ...(base.version === 5 ? { completionCertificates: base.completion.certificates } : {}),
    };
    for (const phone of base.phones) {
      const unit = base.units[phone.id];
      const template = { phoneId: phone.id, sound: phone.soundAtSpelling, selected: unit?.selected ?? null,
        form: null, stratum: "other", selectionStratum: followingStratum(phone.soundAtSpelling, unit?.afterDoubling ?? null), interpretation: "unsupported-evidence", finalAssembled: "unavailable" as const };
      for (const boundary of ["selection", "final-root"] as const) {
        const event: FollowingEvent = { ...template, boundary, ownership: "unavailable" };
        if (!unit) { record({ ...event, reason: "missing-unit" }); continue; }
        if (boundary === "selection") {
          const following = base.units.slice(unit.id + 1).find(item => item.afterDoubling.length > 0);
          event.form = unit.afterDoubling;
          event.stratum = followingStratum(phone.soundAtSpelling, event.form);
          event.ownership = "single-owned";
          event.cellIds = [...unit.sourceCellIds];
          event.context = following ? { kind: "letter", letter: following.afterDoubling[0], origin: "reconstructed-selection" } : { kind: "root-edge" };
          event.reading = selectedReading(view, unit.id);
        } else {
          if (base.version !== 4 && base.version !== 5) {
            record({ ...event, ownership: "outside-supported-version", reason: `ledger-v${base.version}` }); continue;
          }
          const joint = view.constructions.find(item => item.phoneIds.includes(phone.id));
          if (joint) {
            record({ ...event, ownership: "joint-owned", constructionId: joint.id, form: joint.after,
              cellIds: [...joint.outputCellIds], reason: "joint-context-not-modeled" }); continue;
          }
          const span = resolveSingleSpellingUnit(view, unit.id);
          if (span.status !== "complete") { record({ ...event, reason: span.reason }); continue; }
          event.form = span.before;
          event.stratum = followingStratum(phone.soundAtSpelling, event.form);
          event.ownership = "single-owned";
          event.cellIds = [...span.inputCellIds];
          const next = view.cells[span.end];
          event.context = next ? { kind: "letter", letter: next.text, origin: next.origin.kind } : { kind: "root-edge" };
          event.reading = currentReading(view, unit.id, view.cells[span.start]);
        }
        event.readingStatus = classifyFollowing(event.reading, event.context);
        record(event);
      }
    }
    for (let index = 0; index < events.length; index += 2) {
      const selected = events[index];
      const root = events[index + 1];
      const from = selected.readingStatus ?? selected.ownership;
      const to = root.readingStatus ?? root.ownership;
      add(`transition:${selected.selectionStratum}:${from}:${to}`);
    }
    return { counts, events };
  };
}
