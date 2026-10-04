import { describe, expect, it } from "vitest";
import type { RunSummary } from "../../quality/model.js";
import { verifySummarySchedule, writtenLength } from "./study.js";

const expected = [{ id: "lexicon-default", words: 20000, replicates: [{ seed: 1, words: 10000 }, { seed: 2, words: 10000 }] }];
const raw = () => ({ schemaVersion: "q09-raw-capture-v1", profiles: [], captureOnly: { metricStatus: "not-evaluated", words: 20000,
  streams: [{ profile: "lexicon-default", seed: 1, words: 10000 }, { profile: "lexicon-default", seed: 2, words: 10000 }] } });
const asSummary = (value: unknown) => value as RunSummary;
describe("exact archived schedule decoding", () => {
  it("counts written code points independently of phones, syllables, or UTF-16 units", () => {
    expect(writtenLength("through")).toBe(7);
    expect(writtenLength("a😀b")).toBe(3);
    expect(writtenLength("")).toBe(0);
  });
  it("accepts both complete metric summaries and explicitly unevaluated raw capture summaries", () => {
    expect(() => verifySummarySchedule(asSummary({ profiles: expected }), expected)).not.toThrow();
    expect(() => verifySummarySchedule(asSummary(raw()), expected)).not.toThrow();
  });
  it("rejects truncated, reordered, miscounted, or relabeled raw streams", () => {
    const truncated = raw(); truncated.captureOnly.streams.pop();
    const reordered = raw(); reordered.captureOnly.streams.reverse();
    const wrongCount = raw(); wrongCount.captureOnly.words--;
    const wrongProfile = raw(); wrongProfile.captureOnly.streams[0].profile = "other";
    for (const changed of [truncated, reordered, wrongCount, wrongProfile]) expect(() => verifySummarySchedule(asSummary(changed), expected)).toThrow();
  });
  it("never labels an unevaluated raw capture as a metric summary", () => {
    const changed = raw(); changed.captureOnly.metricStatus = "evaluated";
    expect(() => verifySummarySchedule(asSummary(changed), expected)).toThrow();
  });
});
