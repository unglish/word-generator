import { createNormalizationEvidenceVerifier } from "./spelling-normalization-evidence.js";
import { spellingBoundaryContexts } from "./spelling-context.js";
import type { LanguageConfig } from "../config/language.js";
import type { BaseSpellingTrace, BaseSpellingTraceV1, BaseSpellingTraceV2, SpellingCell } from "./base-spelling.js";
import { createSpellingCoveragePlanner } from "./spelling-coverage.js";

/** Exact ledger replay. V1 has no available part identity or licensed replacement capability. */
function createHistoricalSpellingEvidenceVerifier(config?: LanguageConfig) {
  const planner = config ? createSpellingCoveragePlanner(config) : undefined;
  return (trace: BaseSpellingTraceV1 | BaseSpellingTraceV2): { version: 1 | 2; verifiedCertificates: number } => {
    const require = (condition: unknown, message: string): void => { if (!condition) throw new Error(`Invalid spelling evidence: ${message}`); };
    const equal = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
    require(trace.version === 1 || trace.version === 2, "unsupported ledger version");
    const licensed = trace.version === 2;
    require(!licensed || equal(trace.capabilities, { exactParts: 1, licensedOrigins: 1, writerBoundary: 1 }), "unsupported capabilities");
    require(licensed || (trace.capabilities === undefined && trace.certificates === undefined), "v1 cannot declare v2 capabilities");
    require(trace.phones.length === trace.units.length, "phone/unit cardinality");
    const boundaryContexts = licensed ? spellingBoundaryContexts(trace.phones) : undefined;
    const priorChoices = trace.units.map(unit => ({ inventoryIndex: unit.inventoryIndex, afterDoubling: unit.afterDoubling }));
    const knownIds = new Set<number>();
    const cells: SpellingCell[] = [];
    for (const [i, unit] of trace.units.entries()) {
      require(unit.id === i && unit.choiceId === i && equal(unit.phoneIds, [i]), "unit/phone identity");
      require(unit.sourceCellIds.length === unit.afterDoubling.length, "source-cell length");
      require(trace.phones[i]?.id === i, "phone identity");
      if (licensed) {
        require(Number.isInteger(unit.inventoryIndex) && unit.inventoryIndex! >= 0, "selection inventory identity");
        if (config) {
          const selected = config.graphemes[unit.inventoryIndex!];
          require(selected?.form === unit.selected && selected.phoneme === trace.phones[i].soundAtSpelling, "selected inventory identity");
        }
      }
      unit.sourceCellIds.forEach((id, offset) => {
        require(!knownIds.has(id), "reused source ID"); knownIds.add(id);
        cells.push({ id, text: unit.afterDoubling[offset], origin: { kind: "selection", unitId: i, offset },
          ...(licensed ? { partId: trace.phones[i].syllableIndex } : {}) });
      });
    }
    const verified = new Set<number>();
    for (const [i, edit] of trace.edits.entries()) {
      require(edit.id === i && Number.isInteger(edit.start) && edit.start >= 0, "edit identity/range");
      require(equal(cells.slice(edit.start, edit.start + edit.input.length), edit.input), "edit input cells");
      require(edit.before === edit.input.map(cell => cell.text).join("") && edit.after === edit.output.map(cell => cell.text).join(""), "edit text");
      if (licensed) {
        require(edit.partId === null || Number.isInteger(edit.partId), "missing edit part identity");
        const parts = new Set(edit.input.map(cell => cell.partId));
        const expectedPart = parts.size === 1 ? edit.input[0].partId : null;
        if (edit.input.length) require(edit.partId === expectedPart, "edit part disagrees with consumed cells");
        require(edit.output.every(cell => cell.partId === edit.partId), "output part disagrees with edit");
      }
      const sources = [...new Set(edit.input.flatMap(cell => cell.origin.kind === "rewrite" ? cell.origin.sourceUnitIds : [cell.origin.unitId]))];
      for (const [offset, cell] of edit.output.entries()) {
        require(!knownIds.has(cell.id) && cell.text.length === 1, "output cell identity/length"); knownIds.add(cell.id);
        if (cell.origin.kind === "licensed") {
          const origin = cell.origin;
          require(licensed && !!planner && !!config, "licensed replay requires v2 and its config");
          const certificate = trace.certificates?.[cell.origin.certificateId];
          require(certificate?.id === cell.origin.certificateId && certificate.version === 1, "certificate identity/version");
          if (!certificate || !config || !planner) throw new Error("Missing certificate inputs");
          if (!verified.has(certificate.id)) {
            require(certificate.contexts.length === trace.units.length, "certificate context count");
            const choices = certificate.contexts.map((context, id) => {
              const expected = boundaryContexts![id];
              require(equal(context.slot, expected.slot) && equal(context.doubling, expected.doubling), "authoritative writer-boundary context");
              require(context.inventoryIndex === priorChoices[id].inventoryIndex && context.afterDoubling === priorChoices[id].afterDoubling, "pre-plan choice state");
              const slot = expected.slot;
              const grapheme = config.graphemes[context.inventoryIndex];
              require(grapheme?.phoneme === slot.phoneme.sound, "inventory identity");
              return { ...expected, grapheme, form: context.afterDoubling };
            });
            planner.verify({ current: () => ({ cells, units: trace.units, phones: trace.phones }) }, choices, certificate);
            certificate.choices.forEach((choice, id) => { priorChoices[id] = { inventoryIndex: choice.inventoryIndex, afterDoubling: choice.afterDoubling }; });
            verified.add(certificate.id);
          }
          const replacement = certificate.replacements.find(entry => entry.unitId === origin.unitId);
          require(!!replacement && equal(replacement.inputCellIds, edit.input.map(entry => entry.id)) &&
          replacement.after === edit.after && cell.text === replacement.after[cell.origin.offset] &&
          cell.partId === replacement.partId && cell.origin.editId === edit.id && cell.origin.offset === offset &&
          equal(cell.origin.sourceUnitIds, [cell.origin.unitId]), "licensed edit/certificate mismatch");
        } else {
          require(cell.origin.kind === "rewrite" && cell.origin.editId === edit.id && equal(cell.origin.sourceUnitIds, sources) &&
          cell.origin.ownership === "unresolved", "rewrite ancestry is not ownership");
          require(!licensed || cell.partId === null || Number.isInteger(cell.partId), "missing v2 part identity");
        }
        require(licensed || cell.partId === undefined, "v1 part identity unavailable");
      }
      cells.splice(edit.start, edit.input.length, ...edit.output);
    }
    require(equal(cells, trace.cells) && cells.map(cell => cell.text).join("") === trace.surface, "final cells/surface");
    require(trace.unresolvedCells === cells.filter(cell => cell.origin.kind === "rewrite").length, "unresolved count");
    require(verified.size === (trace.certificates?.length ?? 0), "certificate without an applied edit");
    return { version: trace.version, verifiedCertificates: verified.size };
  };
}

export function createBaseSpellingEvidenceVerifier(config?: LanguageConfig) {
  const historical = createHistoricalSpellingEvidenceVerifier(config);
  let normalization: ReturnType<typeof createNormalizationEvidenceVerifier> | undefined;
  return (trace: BaseSpellingTrace) => {
    if (trace.version !== 1 && trace.version !== 2 && trace.version !== 3) {
      throw new Error("Invalid spelling evidence: unsupported ledger version");
    }
    if (trace.version === 3) {
      normalization ??= createNormalizationEvidenceVerifier(config);
      return normalization(trace);
    }
    if ("normalization" in trace || "normalizationCertificates" in trace || trace.units.some(unit => "doublingIncrement" in unit)) {
      throw new Error("Invalid spelling evidence: normalization fields require v3");
    }
    return historical(trace);
  };
}

export function verifyBaseSpellingEvidence(trace: BaseSpellingTrace, config?: LanguageConfig) {
  return createBaseSpellingEvidenceVerifier(config)(trace);
}
