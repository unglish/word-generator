import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  captureGoldenOutput, GOLDEN_FIXTURE_URL, GOLDEN_UPDATE_COMMAND, serializeGoldenOutput, type GoldenOutput,
} from "../test-support/golden-output.js";

// The only test that pins exact generated words. Behavior tests find their own
// examples (see src/test-support/find-example.ts); output changes surface here.
describe("golden output", () => {
  const recorded = JSON.parse(readFileSync(GOLDEN_FIXTURE_URL, "utf8")) as GoldenOutput;
  const current = captureGoldenOutput();
  const hint = `Generated output changed. If that is intended, run \`${GOLDEN_UPDATE_COMMAND}\` and commit the reviewed fixture diff.`;

  it.each(current.cases.map(golden => [golden.name, golden] as const))("matches the recorded words for %s", (name, golden) => {
    const expected = recorded.cases.find(entry => entry.name === name);
    expect(expected, hint).toBeDefined();
    expect(golden, hint).toEqual(expected);
  });

  // Also catches added or removed cases and hand edits to the fixture.
  it("is byte-identical to what the update script writes", () => {
    expect(readFileSync(GOLDEN_FIXTURE_URL, "utf8"), hint).toBe(serializeGoldenOutput(current));
  });
});
