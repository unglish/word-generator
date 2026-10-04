import { isSingleOwned, sourceUnits } from "./spelling-ownership.js";
import { verifyNormalizationChecks } from "./spelling-normalization-checks.js";
import type { LanguageConfig } from "../config/language.js";
import type { BaseSpellingTraceV3, SpellingCell } from "./base-spelling.js";
import { spellingBoundaryContexts } from "./spelling-context.js";
import { createSpellingCoveragePlanner } from "./spelling-coverage.js";
import { createSpellingNormalizer } from "./spelling-normalization.js";
import type { UnitNormalizationCertificate } from "./spelling-normalization-types.js";

const equal = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
function require(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Invalid spelling evidence: ${message}`);
}
const sources = (cell: SpellingCell): number[] => [...sourceUnits(cell.origin)];

/** V3 replay authenticates local emitted licenses separately from whole-sequence cap plans. */
export function createNormalizationEvidenceVerifier(config?: LanguageConfig) {
  const normalizer = config ? createSpellingNormalizer(config) : undefined;
  const planner = config ? createSpellingCoveragePlanner(config) : undefined;
  return (trace: BaseSpellingTraceV3): { version: 3; verifiedCertificates: number; verifiedNormalizations: number; verifiedEpisodes: number } => {
    require(config && normalizer && planner, "v3 replay requires its configuration");
    require(trace.version === 3 && equal(trace.capabilities,
      { exactParts: 1, licensedOrigins: 1, writerBoundary: 1, unitNormalization: 1 }), "unsupported normalization capabilities");
    require(trace.phones.length === trace.units.length, "phone/unit cardinality");
    require(trace.normalization?.version === 1 && Array.isArray(trace.normalization.episodes) && Array.isArray(trace.normalizationCertificates), "normalization observation version");
    const contexts = spellingBoundaryContexts(trace.phones);
    const states = normalizer.historicalStates(trace.units, contexts);
    const cells: SpellingCell[] = [];
    const knownIds = new Set<number>();
    for (const [id, unit] of trace.units.entries()) {
      require(unit.id === id && unit.choiceId === id && equal(unit.phoneIds, [id]), "unit/phone identity");
      require(unit.doublingIncrement === 0 || unit.doublingIncrement === 1, "actual doubling increment");
      const selected = config.graphemes[unit.inventoryIndex!];
      require(Number.isInteger(unit.inventoryIndex) && selected?.form === unit.selected && selected.phoneme === trace.phones[id].soundAtSpelling, "selection inventory identity");
      require(unit.sourceCellIds.length === unit.afterDoubling.length, "source-cell length");
      unit.sourceCellIds.forEach((cellId, offset) => {
        require(Number.isInteger(cellId) && cellId >= 0 && !knownIds.has(cellId), "source cell identity");
        knownIds.add(cellId);
        cells.push({ id: cellId, text: unit.afterDoubling[offset], origin: { kind: "selection", unitId: id, offset },
          partId: trace.phones[id].syllableIndex });
      });
    }
    const coverageSeen = new Set<number>();
    const coverageReplacements = new Set<string>();
    const normalizations: UnitNormalizationCertificate[] = [];
    const pendingNormalizations = new Map<number, UnitNormalizationCertificate>();
    const priorChoices = trace.units.map(unit => ({ inventoryIndex: unit.inventoryIndex, afterDoubling: unit.afterDoubling }));
    const collisions = { "adjacent-choice": 0, "syllable-join": 0 };
    let episodeIndex = 0;
    let lastAppended = -1;
    const seenSites = new Set<string>();

    function verifyEpisodes(nextEditId: number): void {
      while (episodeIndex < trace.normalization.episodes.length) {
        const episode = trace.normalization.episodes[episodeIndex];
        if (episode.cursor.nextEditId !== nextEditId) {
          require(episode.cursor.nextEditId > nextEditId, "episode edit order");
          break;
        }
        const end = episode.cursor.lastAppendedUnitId;
        require(episode.version === 1 && episode.id === episodeIndex &&
          (episode.site === "adjacent-choice" || episode.site === "syllable-join") && Number.isInteger(end) &&
          end >= lastAppended && end < trace.units.length && !coverageSeen.size && !pendingNormalizations.size,
        "episode identity/cursor");
        const siteKey = `${episode.site}/${end}`;
        require(!seenSites.has(siteKey), "repeated normalization application point");
        seenSites.add(siteKey);
        lastAppended = end;
        // Future appended selections sit at the tail in historical edit replay, but
        // they did not exist at this local decision and cannot supply its context.
        const prefix = cells.filter(cell => cell.origin.kind !== "selection" || cell.origin.unitId <= end);
        require(prefix.every(cell => sources(cell).every(id => id <= end)), "future unit in local input");
        const rightIndex = prefix.findIndex(cell => cell.id === episode.rightCellId);
        const right = prefix[rightIndex]; const previous = prefix[rightIndex - 1];
        require(rightIndex > 0 && previous?.id === episode.predecessorCellId && right.text === previous.text, "episode collision cells");
        require(episode.rightUnitId === (isSingleOwned(right.origin) ? right.origin.unitId : null), "episode right ownership");
        if (episode.site === "adjacent-choice") {
          require(right.origin.kind === "selection" && right.origin.unitId === end && right.origin.offset === 0 &&
            trace.phones[end - 1]?.syllableIndex === trace.phones[end].syllableIndex &&
            previous.partId === right.partId, "adjacent-choice application point");
        } else {
          const part = trace.phones[end].syllableIndex;
          require(trace.phones[end + 1]?.syllableIndex !== part && right.partId === part && part > 0 &&
            previous.partId === part - 1 && prefix.findIndex(cell => cell.partId === part) === rightIndex,
          "syllable-join application point");
        }
        const input = { cells: prefix, units: trace.units.slice(0, end + 1), phones: trace.phones,
          certificates: normalizations, contexts, states, cursor: episode.cursor, site: episode.site, rightIndex };
        const decision = normalizer!.decide(input);
        if (episode.outcome.status === "retained") {
          require(decision.status === "retained" && episode.outcome.reason === decision.reason, "retained normalization reason");
        } else {
          require(episode.outcome.status === "normalized" && decision.status === "normalized", "normalization decision");
          const certificate = trace.normalizationCertificates[episode.outcome.certificateId];
          require(certificate?.id === normalizations.length && certificate.id === episode.outcome.certificateId && certificate.editId === nextEditId,
            "normalization certificate identity");
          const { id, ...plan } = certificate;
          require(id === normalizations.length, "normalization certificate order");
          normalizer!.verify(input, plan);
          pendingNormalizations.set(nextEditId, certificate);
        }
        collisions[episode.site]++;
        episodeIndex++;
      }
    }

    for (const [id, edit] of trace.edits.entries()) {
      verifyEpisodes(id);
      require(edit.id === id && Number.isInteger(edit.start) && edit.start >= 0 && edit.start + edit.input.length <= cells.length, "edit identity/range");
      require(equal(cells.slice(edit.start, edit.start + edit.input.length), edit.input), "edit input cells");
      require(edit.before === edit.input.map(cell => cell.text).join("") && edit.after === edit.output.map(cell => cell.text).join(""), "edit text");
      require(edit.rule !== "deduplicateAdjacentLetters" && edit.rule !== "deduplicateSyllableJoin", "uncertified deduplication edit");
      const parts = new Set(edit.input.map(cell => cell.partId));
      if (edit.input.length) require(edit.partId === (parts.size === 1 ? edit.input[0].partId : null), "edit part");
      require(edit.partId === null || Number.isInteger(edit.partId), "missing edit part");
      const ancestry = [...new Set(edit.input.flatMap(sources))];
      const local = pendingNormalizations.get(id);
      if (local) require(edit.phase === (local.site === "adjacent-choice" ? "selection" : "syllable") &&
        edit.rule === `unitNormalization:${local.site}` && equal(edit.input.map(cell => cell.id), local.inputCellIds) &&
        edit.before === local.before && edit.after === local.after && edit.partId === local.partId && edit.output.length === local.after.length,
      "local edit/certificate identity");
      else require(!edit.rule.startsWith("unitNormalization:"), "normalization edit without episode");
      for (const [offset, cell] of edit.output.entries()) {
        require(Number.isInteger(cell.id) && cell.id >= 0 && !knownIds.has(cell.id) && cell.text.length === 1, "output cell identity");
        knownIds.add(cell.id);
        require(cell.partId === edit.partId, "output part");
        const origin = cell.origin;
        if (origin.kind === "normalized") {
          require(local && origin.certificateId === local.id && origin.unitId === local.unitId && origin.offset === offset &&
            origin.editId === edit.id && equal(origin.sourceUnitIds, [local.unitId]) && cell.text === local.after[offset], "normalized origin");
        } else if (origin.kind === "licensed") {
          require(!local && !normalizations.length && !cells.some(entry => entry.origin.kind === "normalized"), "stale cap normalization context");
          const certificate = trace.certificates[origin.certificateId];
          require(certificate?.id === origin.certificateId && certificate.version === 1, "coverage certificate identity");
          if (!coverageSeen.has(certificate.id)) {
            require(certificate.contexts.length === trace.units.length, "coverage context count");
            const choices = certificate.contexts.map((context, unitId) => {
              const expected = contexts[unitId];
              require(equal(context.slot, expected.slot) && equal(context.doubling, expected.doubling), "authoritative writer boundary");
              require(context.inventoryIndex === priorChoices[unitId].inventoryIndex && context.afterDoubling === priorChoices[unitId].afterDoubling, "pre-plan choices");
              const grapheme = config!.graphemes[context.inventoryIndex];
              require(grapheme?.phoneme === expected.slot.phoneme.sound, "coverage inventory identity");
              return { ...expected, grapheme, form: context.afterDoubling };
            });
            planner!.verify({ current: () => ({ cells, units: trace.units, phones: trace.phones, normalizationCount: normalizations.length }) }, choices, certificate);
            certificate.choices.forEach((choice, unitId) => { priorChoices[unitId] = { inventoryIndex: choice.inventoryIndex, afterDoubling: choice.afterDoubling }; });
            coverageSeen.add(certificate.id);
          }
          const replacement = certificate.replacements.find(entry => entry.unitId === origin.unitId);
          require(replacement && equal(replacement.inputCellIds, edit.input.map(entry => entry.id)) && replacement.before === edit.before &&
            replacement.after === edit.after && replacement.after.length === edit.output.length && cell.text === replacement.after[offset] &&
            cell.partId === replacement.partId && origin.editId === edit.id && origin.offset === offset &&
            equal(origin.sourceUnitIds, [origin.unitId]), "coverage edit/certificate identity");
          if (offset === 0) {
            const key = `${certificate.id}/${origin.unitId}`;
            require(!coverageReplacements.has(key), "repeated coverage replacement");
            coverageReplacements.add(key);
          }
        } else {
          require(!local && origin.kind === "rewrite" && origin.editId === id && origin.ownership === "unresolved" &&
            equal(origin.sourceUnitIds, ancestry), "rewrite ancestry");
        }
      }
      cells.splice(edit.start, edit.input.length, ...edit.output);
      if (local) {
        normalizations.push(local);
        pendingNormalizations.delete(id);
      }
    }
    verifyEpisodes(trace.edits.length);
    require(!pendingNormalizations.size && episodeIndex === trace.normalization.episodes.length, "episode without applied edit");
    require(equal(collisions, trace.normalization.collisions), "normalization collision counts");
    verifyNormalizationChecks(trace);
    require(normalizations.length === trace.normalizationCertificates.length, "unused local certificate");
    require(coverageSeen.size === trace.certificates.length && trace.certificates.every((certificate, id) => certificate.id === id &&
      certificate.replacements.every(replacement => coverageReplacements.has(`${id}/${replacement.unitId}`))), "unused coverage certificate/replacement");
    require(equal(cells, trace.cells) && cells.map(cell => cell.text).join("") === trace.surface, "final cells/surface");
    require(trace.unresolvedCells === cells.filter(cell => cell.origin.kind === "rewrite").length, "unresolved count");
    return { version: 3, verifiedCertificates: coverageSeen.size, verifiedNormalizations: normalizations.length, verifiedEpisodes: episodeIndex };
  };
}
