import { generateWord } from "../../src/index.js";
import { digest } from "./snapshot.js";
import { RUBRIC } from "./protocol.js";
import type { Manifest, ReviewExport, Snapshot } from "./model.js";

export function fixtureSnapshot(id = "test-study", spellings = ["blim", "blim", "sproke", "thindle"], sessionLength = 3): Snapshot {
  const manifest: Manifest = {
    schema_version: 1, study_id: id, rubric: RUBRIC, session_length: sessionLength, sample_count: spellings.length,
    options: { seed: 42, mode: "lexicon", morphology: true, trace: true }, effective_config: {},
    generator: { package_version: "test", commit: "synthetic-fixture", dirty: false, source_digest: digest([]), source_files: [], patch: "" },
  };
  const base = generateWord({ seed: 42, trace: true });
  const words = spellings.map(spelling => ({ ...structuredClone(base), written: { clean: spelling, hyphenated: spelling } }));
  const hash = digest({ manifest, words });
  return {
    manifest, digest: hash,
    samples: words.map((word, draw_index) => ({ id: digest([hash, draw_index]), study_id: id, draw_index, spelling: word.written.clean, word })),
  };
}

export function fixtureExport(): ReviewExport {
  const snapshot = fixtureSnapshot();
  const [a, , b, c] = snapshot.samples;
  const timestamp = "2026-09-04T12:00:00.000Z";
  const sessions = ["s1", "s2", "s3"].map(id => ({ id, study_id: snapshot.manifest.study_id, assignments: [a.id, b.id, c.id], created_at: timestamp, completed_at: null }));
  return {
    schema_version: 1, exported_at: timestamp,
    study: { id: snapshot.manifest.study_id, manifest: snapshot.manifest, digest: snapshot.digest, session_length: 3, enrollment_open: true },
    samples: snapshot.samples, sessions,
    responses: [
      { id: "r1", session_id: "s1", position: 0, sample_id: a.id, status: "rated", rating: 5, familiar: false, received_at: timestamp },
      { id: "r2", session_id: "s2", position: 0, sample_id: a.id, status: "rated", rating: 1, familiar: true, received_at: timestamp },
      { id: "r3", session_id: "s1", position: 1, sample_id: b.id, status: "rated", rating: 4, familiar: false, received_at: timestamp },
      { id: "r4", session_id: "s2", position: 1, sample_id: b.id, status: "rated", rating: 4, familiar: false, received_at: timestamp },
      { id: "r5", session_id: "s3", position: 1, sample_id: b.id, status: "rated", rating: 4, familiar: false, received_at: timestamp },
      { id: "r6", session_id: "s1", position: 2, sample_id: c.id, status: "skipped", rating: null, familiar: null, received_at: timestamp },
    ],
  };
}
