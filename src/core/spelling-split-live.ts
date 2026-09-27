import type { SpellingCell, SpellingPhone } from "./base-spelling.js";
import type { SplitVowelConstruction } from "./spelling-split-transaction.js";
import type { SplitVowelSupport } from "./spelling-split-policy.js";

export type SplitLiveResult = { status: "preserved" } | {
  status: "refused"; constructionId: number | null;
  reason: "unknown-construction" | "invalid-component" | "invalid-marker" | "changed-coda" | "changed-reading" | "changed-edge";
};
const equal = (a: readonly number[], b: readonly number[]): boolean => a.length === b.length && a.every((id, index) => id === b[index]);

/** Protect existing constructions; retirement must be an explicit separately authenticated operation. */
export function createSplitLiveGuard(supports: readonly SplitVowelSupport[]) {
  const table = structuredClone(supports);
  return (cells: readonly SpellingCell[], phones: readonly SpellingPhone[], constructions: readonly SplitVowelConstruction[]): SplitLiveResult => {
    const ids = new Set(constructions.map(entry => entry.id));
    if (ids.size !== constructions.length || cells.some(cell => cell.origin.kind === "split-vowel" && !ids.has(cell.origin.constructionId))) {
      return { status: "refused", constructionId: null, reason: "unknown-construction" };
    }
    for (const construction of constructions) {
      const refuse = (reason: Extract<SplitLiveResult, { status: "refused" }>["reason"]): SplitLiveResult =>
        ({ status: "refused", constructionId: construction.id, reason });
      const positions = (role: "component" | "marker") => cells.flatMap((cell, index) =>
        cell.origin.kind === "split-vowel" && cell.origin.constructionId === construction.id && cell.origin.role === role ? [index] : []);
      const component = positions("component"); const marker = positions("marker");
      const valid = (indices: number[], expected: number[], role: "component" | "marker", form: string): boolean =>
        indices.length > 0 && equal(indices.map(index => cells[index].id), expected) && indices.length === form.length &&
        indices.every((index, offset) => {
          const cell = cells[index]; const origin = cell.origin;
          return index === indices[0] + offset && cell.text === form[offset] && cell.partId === construction.partId &&
            origin.kind === "split-vowel" && origin.role === role && origin.offset === offset &&
            origin.editId === construction.editId && origin.unitId === construction.nucleusUnitId && origin.phoneId === construction.phoneId;
        });
      if (!valid(component, construction.componentCellIds, "component", construction.reading.component)) return refuse("invalid-component");
      if (!valid(marker, construction.markerCellIds, "marker", construction.reading.marker)) return refuse("invalid-marker");
      const coda = cells.slice(component[component.length - 1] + 1, marker[0]);
      if (!equal(coda.map(cell => cell.id), construction.preservedCodaCellIds) || JSON.stringify(coda) !== JSON.stringify(construction.preservedCodaCells) || coda.some(cell => cell.partId !== construction.partId)) return refuse("changed-coda");
      const phone = phones[construction.phoneId];
      const codaPhones = construction.codaUnitIds.map(id => phones[id]);
      if (!phone || phone.id !== construction.phoneId || phone.segment !== "nucleus" || phone.syllableIndex !== construction.partId ||
          phone.soundAtSpelling !== construction.reading.sound || codaPhones.some(entry => !entry || entry.segment !== "coda" || entry.syllableIndex !== construction.partId)) return refuse("changed-reading");
      if (!table.some(row => row.vowel.sound === construction.reading.sound && row.vowel.component === construction.reading.component &&
          row.marker === construction.reading.marker && row.coda.written === coda.map(cell => cell.text).join("") &&
          row.coda.sounds.length === codaPhones.length && row.coda.sounds.every((sound, index) => sound === codaPhones[index].soundAtSpelling))) return refuse("changed-reading");
      if (cells.slice(marker[marker.length - 1] + 1).some(cell => cell.partId === construction.partId || cell.partId === null)) return refuse("changed-edge");
    }
    return { status: "preserved" };
  };
}
