import { describe, expect, it } from "vitest";
import { createGenerator, englishConfig } from "../index.js";
import { englishSharedSpellings } from "../elements/graphemes/shared.js";
import type { BaseSpellingTraceV4 } from "./base-spelling.js";
import { createBaseSpellingEvidenceVerifier } from "./spelling-evidence.js";
import { createSharedLedgerReplayer } from "./spelling-construction-evidence.js";
import { createSharedWriterScheduleVerifier } from "./spelling-construction-schedule.js";

const config = { ...englishConfig, sharedSpellings: englishSharedSpellings };
const generator = createGenerator(config);
const verify = createSharedWriterScheduleVerifier(config, englishSharedSpellings);
const replay = createSharedLedgerReplayer(config, englishSharedSpellings);
const publicVerify = createBaseSpellingEvidenceVerifier(config);
function fixture(): BaseSpellingTraceV4 {
  const word = generator.generateWord({ seed: 129, syllableCount: 2, morphology: false, trace: true });
  const trace = word.trace!.baseSpelling!;
  if (trace.version !== 4) throw new Error("Expected generated v4");
  return trace;
}

/** Remove references and compact indices, so failures cannot rely on dangling indexes alone. */
function removeEmptyScan(trace: BaseSpellingTraceV4, index: number): void {
  expect(trace.shared.scans[index].candidates).toEqual([]);
  trace.shared.scans.splice(index, 1);
  trace.shared.scans.forEach((scan, id) => { scan.id = id; });
  trace.shared.timeline = trace.shared.timeline.filter(entry =>
    !(["scan-start", "scan-end"].includes(entry.kind) && entry.index === index));
  trace.shared.timeline.forEach(entry => {
    if (["scan-start", "scan-end"].includes(entry.kind) && entry.index > index) entry.index--;
  });
}
function removeWriterSteps(trace: BaseSpellingTraceV4, indices: number[]): void {
  const old = trace.shared.writerSteps;
  const kept = old.map((_, i) => i).filter(i => !indices.includes(i));
  trace.shared.writerSteps = kept.map(i => old[i]);
  trace.shared.timeline = trace.shared.timeline.filter(entry => entry.kind !== "writer-step" || kept.includes(entry.index));
  trace.shared.timeline.forEach(entry => { if (entry.kind === "writer-step") entry.index = kept.indexOf(entry.index); });
}

describe("configured writer schedule evidence", () => {
  it("derives all slots from configuration and all passes from the original phones", () => {
    const trace = fixture();
    const syllableSlots = config.spellingRules!.filter(rule => (!rule.scope || rule.scope === "both" || rule.scope === "syllable") && rule.name !== "cx-to-x").length;
    const wordSlots = config.spellingRules!.filter(rule => (!rule.scope || rule.scope === "both" || rule.scope === "word") && rule.name !== "cx-to-x").length;
    expect(verify(trace)).toEqual({ verifiedPasses: 3, verifiedSlots: 2 * syllableSlots + wordSlots, verifiedScans: 5 });
  });
  it("detects an omitted empty scan even when ledger reconstruction remains self-consistent", () => {
    const trace = fixture();
    removeEmptyScan(trace, trace.shared.scans.findIndex(scan => scan.candidates.length === 0));
    expect(() => replay(trace)).not.toThrow();
    expect(() => publicVerify(trace)).toThrow();
    expect(() => verify(trace)).toThrow("missing/incomplete scan");
  });
  it("detects removal of the entire empty shared slot with all references compacted", () => {
    const trace = fixture();
    const scanIndex = trace.shared.scans.findIndex(scan => scan.candidates.length === 0);
    const scan = trace.shared.scans[scanIndex];
    const slotIndex = config.spellingRules!.findIndex(rule => rule.name === scan.ruleId);
    const indices = trace.shared.writerSteps.flatMap((step, index) =>
      step.slotIndex === slotIndex && JSON.stringify(step.slot) === JSON.stringify(scan.slot) ? [index] : []);
    removeEmptyScan(trace, scanIndex);
    removeWriterSteps(trace, indices);
    expect(() => replay(trace)).not.toThrow();
    expect(() => publicVerify(trace)).toThrow();
    expect(() => verify(trace)).toThrow("configured slot order");
  });
  it("detects removal of a regex slot that made no edits", () => {
    const trace = fixture();
    const start = trace.shared.timeline.findIndex((entry, i, entries) => entry.kind === "writer-step" &&
      trace.shared.writerSteps[entry.index].kind === "slot-start" && entries[i + 1]?.kind === "writer-step" &&
      trace.shared.writerSteps[entries[i + 1].index].kind === "slot-end");
    expect(start).toBeGreaterThanOrEqual(0);
    removeWriterSteps(trace, [trace.shared.timeline[start].index, trace.shared.timeline[start + 1].index]);
    expect(() => replay(trace)).not.toThrow();
    expect(() => publicVerify(trace)).toThrow();
    expect(() => verify(trace)).toThrow("configured slot order");
  });
  it.each(["rule", "part", "phase", "cursor", "duplicate", "missing-pass"])("rejects forged %s schedule evidence", change => {
    const trace = fixture();
    if (change === "rule") trace.shared.scans[0].ruleId = "cw-to-qu";
    if (change === "part") trace.shared.scans[0].slot = { phase: "syllable", partId: 99 };
    if (change === "phase") trace.shared.writerSteps[0].slot = { phase: "word", partId: null };
    if (change === "cursor") trace.shared.timeline.find(entry => entry.kind === "writer-step")!.cursor.lastAppendedUnitId--;
    if (change === "duplicate") {
      const index = trace.shared.timeline.findIndex(entry => entry.kind === "scan-start");
      trace.shared.timeline.splice(index, 0, structuredClone(trace.shared.timeline[index]));
    }
    if (change === "missing-pass") removeWriterSteps(trace, [0]);
    expect(() => publicVerify(trace)).toThrow();
    expect(() => verify(trace)).toThrow();
  });
  it("rejects a word pass moved ahead of the final syllable join", () => {
    const trace = fixture();
    const start = trace.shared.timeline.findIndex(entry => entry.kind === "writer-step" &&
      trace.shared.writerSteps[entry.index].kind === "pass-start" && trace.shared.writerSteps[entry.index].slot.phase === "word");
    const end = trace.shared.timeline.findIndex((entry, i) => i > start && entry.kind === "writer-step" &&
      trace.shared.writerSteps[entry.index].kind === "pass-end");
    const block = trace.shared.timeline.splice(start, end - start + 1);
    const join = trace.shared.timeline.findLastIndex(entry => entry.kind === "normalization-check");
    trace.shared.timeline.splice(join, 0, ...block);
    expect(() => publicVerify(trace)).toThrow();
    expect(() => verify(trace)).toThrow();
  });
  it("rejects foreign configuration and malformed syllable identity", () => {
    const trace = fixture();
    expect(() => createSharedWriterScheduleVerifier({ spellingRules: [...config.spellingRules!].reverse() }, englishSharedSpellings)(trace)).toThrow();
    trace.phones[0].syllableIndex = 2;
    expect(() => publicVerify(trace)).toThrow();
    expect(() => verify(trace)).toThrow("syllable order");
  });
});


describe("public v4 evidence capability", () => {
  it("requires the matching explicit configuration", () => {
    const trace = fixture();
    expect(() => createBaseSpellingEvidenceVerifier()(trace)).toThrow("requires its shared spelling configuration");
    expect(() => createBaseSpellingEvidenceVerifier({ ...englishConfig, sharedSpellings: undefined })(trace)).toThrow("requires its shared spelling configuration");
    expect(() => createBaseSpellingEvidenceVerifier({ ...config, sharedSpellings: [] })(trace)).toThrow();
  });
  it("does not let correct scheduling hide an invalid recorded construction decision", () => {
    const trace = fixture();
    trace.surface += "forged";
    expect(() => verify(trace)).not.toThrow();
    expect(() => publicVerify(trace)).toThrow("complete trace mismatch");
  });
});
