/**
 * Regenerate the golden-output fixture checked by src/core/golden-output.test.ts.
 *
 *   npm run golden:update
 *
 * Run it only when a change is meant to alter generated output, and review the
 * fixture diff as part of the change.
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { captureGoldenOutput, GOLDEN_FIXTURE_URL, serializeGoldenOutput } from "../src/test-support/golden-output.js";

writeFileSync(GOLDEN_FIXTURE_URL, serializeGoldenOutput(captureGoldenOutput()));
console.log(`Wrote ${fileURLToPath(GOLDEN_FIXTURE_URL)}`);
