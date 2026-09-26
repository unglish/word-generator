import { describe, expect, it } from "vitest";
import { generateWord } from "../../../../src/index.js";
import { snapshotWordDifference } from "./morphology-integration.js";

describe("detached morphology evidence", () => {
  it("retains the candidate spelling and realization after comparison normalization", () => {
    const candidate = generateWord({ seed: 435, trace: true });
    expect(candidate.written.clean).toBe("immorn");
    expect(candidate.trace?.morphology?.realization?.prefix?.resolved.written).toBe("im");
    const original = structuredClone(candidate);
    original.written = { clean: "inmorn", hyphenated: "inmorn" };
    delete original.trace!.morphology!.realization;
    const witness = snapshotWordDifference(original, candidate);
    const emitted = structuredClone(candidate);

    delete candidate.trace!.morphology!.realization;
    candidate.written = original.written;
    delete candidate.trace;
    original.written.clean = "mutated";

    expect(witness.candidate).toEqual(emitted);
    expect(witness.original.written.clean).toBe("inmorn");
    expect(witness.original.trace?.morphology?.realization).toBeUndefined();
  });
});
