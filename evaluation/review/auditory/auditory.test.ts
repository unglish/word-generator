import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { fixtureSnapshot } from "../fixtures.js";
import type { Snapshot } from "../model.js";
import { digest } from "../snapshot.js";
import { allocateAuditory, auditoryPacket, validateAuditoryPlan } from "./allocation.js";
import { bytesHash, freezeRelease, inspectWav, validateRelease, verifyReleaseFiles } from "./audio.js";
import type { AssetMaterial } from "./audio.js";
import { freezeAuditory, validateAuditory } from "./freeze.js";
import type { AuditoryComparison, AuditoryExport, AuditoryRegistration, PronunciationPolicy } from "./model.js";
import { buildAuditoryReport, validateAuditoryExport } from "./report.js";
import { assessTarget, makeTarget, validatePronunciationPolicy } from "./targets.js";

function policy(): PronunciationPolicy {
  return { version: "auditory-pronunciation-v1", dialect: "Explicit synthetic test inventory, no English dialect claim",
    scope: "Development phone/stress contracts only.", phones: [
      { id: "p", ipa: "p", description: "Voiceless bilabial stop" },
      { id: "a", ipa: "a", description: "Open vowel used in synthetic fixtures" },
      { id: "i", ipa: "i", description: "Close front vowel used in synthetic fixtures" },
      { id: "t", ipa: "t", description: "Voiceless alveolar stop" },
    ], mappings: ["p", "a", "i", "t"].map(source => ({ source, status: "mapped", phones: [source], rationale: "Exact identity in synthetic fixture inventory." })) };
}
function registration(): AuditoryRegistration {
  return { version: "auditory-comparison-v1", study_id: "auditory-fixture", purpose: "development-fixture",
    candidate_selection: "Synthetic contract fixtures only; no human stimulus selection.", population: "Synthetic slots; no people.",
    assignment_seed: 42, pairs_per_stratum: 1, session_length: 2, participant_slots: ["p1", "p2", "p3", "p4"],
    strata: [{ id: "all", lengths: [1, 100], syllables: [1, 20], morphology: ["bare", "prefixed", "suffixed", "prefixed-and-suffixed", "applied-unspecified"] }],
    pronunciation: policy(), production: { method: "development-fixture", voice: "Synthetic PCM ramps, not speech",
      producer_person_key: digest("synthetic-producer"), settings_digest: digest({ fixture: "pcm-ramp-v1" }), sample_rate: 8000, maximum_seconds: 2 } };
}
function syntheticSnapshot(id: string, phones: string[], spellings = phones.map((_, index) => `item${index}`)): Snapshot {
  const snapshot = fixtureSnapshot(id, spellings);
  snapshot.samples.forEach((sample, index) => {
    const exemplar = structuredClone(sample.word.syllables[0].nucleus[0]);
    sample.word.syllables = [{ onset: [], nucleus: [{ ...exemplar, sound: phones[index] }], coda: [], stress: "ˈ" }];
    sample.word.pronunciation = `ˈ${phones[index]}`;
  });
  return resealSnapshot(snapshot);
}
function resealSnapshot(snapshot: Snapshot): Snapshot {
  snapshot.digest = digest({ manifest: snapshot.manifest, words: snapshot.samples.map(sample => sample.word) });
  snapshot.samples.forEach((sample, index) => { sample.id = digest([snapshot.digest, index]); });
  return snapshot;
}
function comparison(): AuditoryComparison {
  return freezeAuditory(registration(), {
    baseline: syntheticSnapshot("baseline-fixture", ["a", "a", "i", "p"], ["one", "other", "same", "base"]),
    candidate: syntheticSnapshot("candidate-fixture", ["a", "i", "t"], ["third", "same", "cand"]),
  });
}
function wav(marker = 1000): Buffer {
  const bytes = Buffer.alloc(44 + 80 * 2);
  bytes.write("RIFF"); bytes.writeUInt32LE(bytes.length - 8, 4); bytes.write("WAVE", 8);
  bytes.write("fmt ", 12); bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(8000, 24); bytes.writeUInt32LE(16000, 28); bytes.writeUInt16LE(2, 32); bytes.writeUInt16LE(16, 34);
  bytes.write("data", 36); bytes.writeUInt32LE(160, 40);
  for (let index = 0; index < 80; index++) bytes.writeInt16LE(index % 2 ? marker : -marker, 44 + 2 * index);
  return bytes;
}
function materials(frozen: AuditoryComparison, verifiers = 0): AssetMaterial[] {
  const targets = [...new Map(frozen.items.map(item => [item.target.digest, item.target])).values()];
  return targets.map((target, index) => {
    const bytes = wav(1000 + index), transcript = Buffer.from(JSON.stringify(target.syllables));
    const production = { version: "auditory-production-record-v1",
      target_digest: target.digest, audio_sha256: bytesHash(bytes), contract_digest: digest(frozen.registration.production),
      method_details: `SYNTHETIC PCM ramp ${index}; not speech or real production evidence.` };
    return { target_digest: target.digest, wav: bytes, production_record: Buffer.from(JSON.stringify(production)),
      verification: Array.from({ length: verifiers }, (_, person) => ({ transcription_file: transcript,
        record: { person_key: digest(`synthetic-verifier-${person}`), audio_sha256: bytesHash(bytes), policy_digest: target.policy_digest,
          transcription_sha256: bytesHash(transcript), transcription: target.syllables,
          independent_of_production: true, blind_to_condition_and_target: true, method: "Synthetic attestation fixture; no humans or speech." } })) };
  });
}
function emptyExport(): AuditoryExport {
  const frozen = comparison();
  return { version: "auditory-export-v1", comparison: frozen, release: freezeRelease(frozen, materials(frozen)), plan: allocateAuditory(frozen), responses: [] };
}

describe("auditory phone and stress contracts", () => {
  it("derives segmented phones instead of reparsing the display IPA or spelling", () => {
    const word = comparison().conditions.baseline.samples[0].word;
    const expected = assessTarget(word, policy());
    word.pronunciation = "misleading display"; word.written.clean = "changed";
    expect(assessTarget(word, policy())).toEqual(expected);
  });
  it("retains unknown, ambiguous and missing-stress problems together", () => {
    const word = comparison().conditions.baseline.samples[0].word;
    delete word.syllables[0].stress;
    word.syllables[0].onset = [{ ...word.syllables[0].nucleus[0], sound: "unknown" }];
    const mapping = policy(); mapping.mappings[1] = { source: "a", status: "ambiguous", alternatives: [["a"], ["i"]], rationale: "Unresolved fixture ambiguity." };
    const assessment = assessTarget(word, mapping);
    expect(assessment.status).toBe("unresolved");
    if (assessment.status === "unresolved") expect(assessment.issues.map(issue => issue.kind)).toEqual(["missing-primary", "unknown-phone", "ambiguous-phone"]);
  });
  it("rejects deletion, undeclared phones and collapsed ambiguous alternatives", () => {
    for (const phones of [[], ["undeclared"]]) {
      const value = policy(); value.mappings[0] = { source: "p", status: "mapped", phones, rationale: "Fixture" };
      expect(() => validatePronunciationPolicy(value)).toThrow();
    }
    const value = policy(); value.mappings[0] = { source: "p", status: "ambiguous", alternatives: [["p"], ["p"]], rationale: "Fixture" };
    expect(() => validatePronunciationPolicy(value)).toThrow("distinct");
  });
  it("includes stress, syllable sequence and registered dialect policy in target identity", () => {
    const first = makeTarget(policy(), [{ phones: ["p", "a"], stress: "primary" }, { phones: ["i"], stress: "unmarked" }]);
    const second = makeTarget(policy(), [{ phones: ["p", "a"], stress: "unmarked" }, { phones: ["i"], stress: "primary" }]);
    expect(first.digest).not.toBe(second.digest);
    const changed = policy(); changed.dialect = "Other fixture dialect";
    expect(makeTarget(changed, first.syllables).digest).not.toBe(first.digest);
    expect(() => makeTarget(policy(), [{ phones: ["a"], stress: "unmarked" }])).toThrow();
  });
  it("does not infer a missing primary or normalize an invalid stress mark", () => {
    const word = comparison().conditions.baseline.samples[0].word;
    (word.syllables[0] as unknown as { stress: string }).stress = "invalid";
    const result = assessTarget(word, policy());
    expect(result.status).toBe("unresolved");
    if (result.status === "unresolved") expect(result.issues.map(value => value.kind)).toEqual(["missing-primary", "invalid-stress"]);
  });
});

describe("auditory inventory and allocation", () => {
  it("groups homophones across spellings while retaining all original draws and condition multiplicity", () => {
    const frozen = comparison(); validateAuditory(frozen);
    expect(frozen.draws).toHaveLength(7);
    expect(frozen.items.reduce((sum, item) => sum + item.draws.length, 0)).toBe(7);
    expect(frozen.items.find(item => item.condition === "baseline" && item.draws.length === 2)?.draws.map(draw => draw.draw_index)).toEqual([0, 1]);
    expect(new Set(frozen.items.map(item => item.target.digest)).size).toBe(4);
  });
  it("keeps identical spellings with different target phones separate", () => {
    const frozen = freezeAuditory(registration(), { baseline: syntheticSnapshot("base", ["a", "i"], ["same", "same"]),
      candidate: syntheticSnapshot("cand", ["p", "t"], ["same", "same"]) });
    expect(frozen.items).toHaveLength(4);
    expect(allocateAuditory(frozen).sessions).toHaveLength(4);
  });
  it("retains an unresolved draw and forbids subset release or allocation", () => {
    const conditions = comparison().conditions;
    delete conditions.baseline.samples[0].word.syllables[0].stress;
    resealSnapshot(conditions.baseline);
    const frozen = freezeAuditory(registration(), conditions);
    expect(frozen.draws).toHaveLength(7);
    expect(frozen.draws.filter(draw => draw.assessment.status === "unresolved")).toHaveLength(1);
    expect(() => allocateAuditory(frozen)).toThrow("Unresolved");
    expect(() => freezeRelease(frozen, materials(frozen))).toThrow("Unresolved");
  });
  it("rejects overwritten and resealed targets or lost draw multiplicity", () => {
    const frozen = comparison(); frozen.items[0].draws.pop();
    const { digest: previous, ...content } = frozen; expect(previous).not.toBe(digest(content)); frozen.digest = digest(content);
    expect(() => validateAuditory(frozen)).toThrow("changed");
  });
  it("is deterministic, condition balanced by position and target-repeat-free across sessions", () => {
    const frozen = comparison(), plan = allocateAuditory(frozen), byId = new Map(frozen.items.map(item => [item.id, item]));
    expect(allocateAuditory(frozen)).toEqual(plan);
    for (const participant of frozen.registration.participant_slots) {
      const items = plan.sessions.filter(session => session.participant_slot === participant).flatMap(session => session.item_ids.map(id => byId.get(id)!));
      expect(new Set(items.map(item => item.target.digest)).size).toBe(items.length);
      expect(items.filter(item => item.condition === "baseline")).toHaveLength(1);
      expect(items.filter(item => item.condition === "candidate")).toHaveLength(1);
    }
    for (let position = 0; position < 2; position++) {
      expect(plan.sessions.filter(session => byId.get(session.item_ids[position])!.condition === "baseline")).toHaveLength(2);
    }
  });
  it("finds a complete matching for every feasible two-slot subset of three targets", () => {
    const phones = ["a", "i", "p"];
    for (let baseline = 1; baseline < 8; baseline++) for (let candidate = 1; candidate < 8; candidate++) {
      const subset = (mask: number) => phones.filter((_, index) => mask & (1 << index));
      const frozen = freezeAuditory(registration(), { baseline: syntheticSnapshot("base", subset(baseline)), candidate: syntheticSnapshot("cand", subset(candidate)) });
      const feasible = new Set([...subset(baseline), ...subset(candidate)]).size >= 2;
      if (feasible) expect(allocateAuditory(frozen).sessions).toHaveLength(4);
      else expect(() => allocateAuditory(frozen)).toThrow("Insufficient");
    }
  });
  it("rejects a globally insufficient Hall pool despite enough targets overall", () => {
    const value = registration(); value.pairs_per_stratum = 2;
    const frozen = freezeAuditory(value, { baseline: syntheticSnapshot("base", ["a"]), candidate: syntheticSnapshot("cand", ["i", "p", "t"]) });
    expect(() => allocateAuditory(frozen)).toThrow("no fallback");
  });
  it("rejects changed plan order and never exposes owner source, spelling, targets or labels in packets", () => {
    const data = emptyExport(), packet = auditoryPacket(data.comparison, data.release, data.plan, data.plan.sessions[0].id);
    expect(Object.keys(packet).sort()).toEqual(["items", "rubric", "session_id"]);
    expect(Object.keys(packet.items[0]).sort()).toEqual(["audio_sha256", "item_id", "mime_type", "position"]);
    expect(packet.rubric.version).toBe("auditory-wordlikeness-v1");
    const changed = structuredClone(data.plan); changed.sessions[0].item_ids.reverse();
    expect(() => validateAuditoryPlan(data.comparison, changed)).toThrow("changed");
  });
});

describe("audio byte and verification bindings", () => {
  it("independently exposes exact PCM counts, duration, peaks, clipping and complete file hash", () => {
    const bytes = wav(32767); bytes.writeInt16LE(-32768, 44);
    const facts = inspectWav(bytes, registration().production);
    expect(facts).toEqual({ sha256: bytesHash(bytes), bytes: 204, format: "pcm16-mono-wav", sample_rate: 8000,
      frames: 80, seconds: 0.01, peak_absolute_sample: 32768, clipped_samples: 41 });
  });
  it("rejects truncation, inconsistent rate, stereo and embedded metadata", () => {
    const badRate = wav(); badRate.writeUInt32LE(16000, 24);
    const stereo = wav(); stereo.writeUInt16LE(2, 22);
    const metadata = Buffer.concat([wav(), Buffer.from("LIST\x00\x00\x00\x00")]); metadata.writeUInt32LE(metadata.length - 8, 4);
    for (const bytes of [wav().subarray(0, 80), badRate, stereo, metadata]) expect(() => inspectWav(bytes, registration().production)).toThrow();
  });
  it("freezes one shared asset per target across conditions and authenticates material bytes", () => {
    const frozen = comparison(), files = materials(frozen), release = freezeRelease(frozen, files);
    expect(release.assets).toHaveLength(4); validateRelease(frozen, release); verifyReleaseFiles(frozen, release, files);
    const changed = structuredClone(files); changed[0].wav[50] ^= 1;
    expect(() => verifyReleaseFiles(frozen, release, changed)).toThrow("does not bind");
  });
  it("rejects duplicate, missing and cross-target-identical audio assets", () => {
    const frozen = comparison(), files = materials(frozen);
    expect(() => freezeRelease(frozen, files.slice(1))).toThrow("Exactly one");
    expect(() => freezeRelease(frozen, [...files.slice(1), files[1]])).toThrow("Exactly one");
    files[1].wav = files[0].wav;
    const record = JSON.parse(Buffer.from(files[1].production_record).toString("utf8")); record.audio_sha256 = bytesHash(files[1].wav);
    files[1].production_record = Buffer.from(JSON.stringify(record));
    expect(() => freezeRelease(frozen, files)).toThrow("identical audio");
  });
  it("rejects a production record detached from the audio or registered target", () => {
    const frozen = comparison(), files = materials(frozen);
    const record = JSON.parse(Buffer.from(files[0].production_record).toString("utf8")); record.target_digest = "0".repeat(64);
    files[0].production_record = Buffer.from(JSON.stringify(record));
    expect(() => freezeRelease(frozen, files)).toThrow("does not bind");
  });
  it("rejects altered transcription files, wrong stress and a producer verifying their own asset", () => {
    const frozen = comparison();
    const altered = materials(frozen, 1); altered[0].verification[0].transcription_file = Buffer.from("[]");
    expect(() => freezeRelease(frozen, altered)).toThrow("file changed");
    const dependent = materials(frozen, 1); dependent[0].verification[0].record.person_key = frozen.registration.production.producer_person_key;
    expect(() => freezeRelease(frozen, dependent)).toThrow("dependent");
    const wrong = materials(frozen, 1); wrong[0].verification[0].record.transcription = [{ phones: ["a"], stress: "unmarked" }];
    const bytes = Buffer.from(JSON.stringify(wrong[0].verification[0].record.transcription));
    wrong[0].verification[0].transcription_file = bytes; wrong[0].verification[0].record.transcription_sha256 = bytesHash(bytes);
    expect(() => freezeRelease(frozen, wrong)).toThrow("phones/stress");
  });
  it("requires two distinct verifiers for human-shaped fixtures without treating them as humans", () => {
    const value = registration(); value.purpose = "human-study"; value.production.method = "recorded-speech";
    const conditions = comparison().conditions;
    for (const snapshot of Object.values(conditions)) {
      snapshot.manifest.generator.commit = "a".repeat(40);
      snapshot.manifest.generator.source_files = [{ path: "src/core/generate.ts", content: "SYNTHETIC source-shaped test metadata; not a real commit." }];
      snapshot.manifest.generator.source_digest = digest(snapshot.manifest.generator.source_files);
      resealSnapshot(snapshot);
    }
    const frozen = freezeAuditory(value, conditions);
    expect(() => freezeRelease(frozen, materials(frozen, 1))).toThrow("two independent");
    const files = materials(frozen, 2); files[0].verification[1].record.person_key = files[0].verification[0].record.person_key;
    expect(() => freezeRelease(frozen, files)).toThrow("dependent");
    // Passing metadata checks cannot prove an attestation is truthful.
    expect(freezeRelease(frozen, materials(frozen, 2)).assets).toHaveLength(4);
  });
  it("rejects a human study registered with development audio", () => {
    const value = registration(); value.purpose = "human-study";
    expect(() => freezeAuditory(value, comparison().conditions)).toThrow("Development audio");
  });
});

describe("actual auditory owner CLI", () => {
  it("saves and reauthenticates a complete synthetic workflow with private no-overwrite artifacts", async () => {
    const directory = await mkdtemp(join(tmpdir(), "q22-owner-cli-fixture-"));
    const json = async (name: string, value: unknown) => writeFile(join(directory, name), JSON.stringify(value));
    const frozen = comparison(), files = materials(frozen, 2);
    await json("registration.json", frozen.registration); await json("baseline.json", frozen.conditions.baseline); await json("candidate.json", frozen.conditions.candidate);
    const manifest = [];
    for (let index = 0; index < files.length; index++) {
      const file = files[index], wavName = `${index}.wav`, recordName = `${index}-production.json`, verification = [];
      await writeFile(join(directory, wavName), file.wav); await writeFile(join(directory, recordName), file.production_record);
      for (let person = 0; person < file.verification.length; person++) {
        const transcriptName = `${index}-${person}-transcription.json`, entry = file.verification[person];
        await writeFile(join(directory, transcriptName), entry.transcription_file);
        verification.push({ record: entry.record, transcription_file: transcriptName });
      }
      manifest.push({ target_digest: file.target_digest, wav: wavName, production_record: recordName, verification });
    }
    await json("materials.json", manifest);
    const cli = fileURLToPath(new URL("./cli.ts", import.meta.url));
    const loader = fileURLToPath(new URL("../../../node_modules/tsx/dist/loader.mjs", import.meta.url));
    function run(command: string, ...args: string[]): string {
      return execFileSync(process.execPath, ["--import", loader, cli, command, ...args], { cwd: directory, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    }
    expect(run("inventory", "--registration", "registration.json", "--baseline", "baseline.json", "--candidate", "candidate.json", "--out", "comparison.json")).toContain("7 source draws");
    run("release", "--comparison", "comparison.json", "--input", "materials.json", "--out", "release.json");
    run("verify", "--comparison", "comparison.json", "--input", "materials.json", "--release", "release.json");
    run("allocate", "--comparison", "comparison.json", "--out", "plan.json");
    const plan = JSON.parse(await readFile(join(directory, "plan.json"), "utf8"));
    run("packet", "--comparison", "comparison.json", "--release", "release.json", "--plan", "plan.json", "--session", plan.sessions[0].id, "--out", "packet.json");
    const data = { version: "auditory-export-v1", comparison: JSON.parse(await readFile(join(directory, "comparison.json"), "utf8")),
      release: JSON.parse(await readFile(join(directory, "release.json"), "utf8")), plan, responses: [] };
    await json("export.json", data); run("report", "--input", "export.json", "--out", "report.json");
    expect(JSON.parse(await readFile(join(directory, "packet.json"), "utf8"))).toEqual(auditoryPacket(data.comparison, data.release, plan, plan.sessions[0].id));
    expect((await stat(join(directory, "comparison.json"))).mode & 0o777).toBe(0o600);
    const original = await readFile(join(directory, "plan.json"));
    expect(() => run("allocate", "--comparison", "comparison.json", "--out", "plan.json")).toThrow();
    expect(await readFile(join(directory, "plan.json"))).toEqual(original);
    const altered = Buffer.from(files[0].wav); altered[50] ^= 1; await writeFile(join(directory, "0.wav"), altered);
    expect(() => run("verify", "--comparison", "comparison.json", "--input", "materials.json", "--release", "release.json")).toThrow();
  }, 30000);
});

describe("auditory descriptive reports", () => {
  it("weights homophone draw multiplicity independently of their number of ratings", () => {
    const frozen = freezeAuditory(registration(), { baseline: syntheticSnapshot("base", ["a", "a", "i"]), candidate: syntheticSnapshot("cand", ["p", "t"]) });
    const data: AuditoryExport = { version: "auditory-export-v1", comparison: frozen, release: freezeRelease(frozen, materials(frozen)), plan: allocateAuditory(frozen), responses: [] };
    for (const session of data.plan.sessions) session.item_ids.forEach((id, position) => {
      const item = frozen.items.find(value => value.id === id)!, asset = data.release.assets.find(value => value.target_digest === item.target.digest)!;
      const rating = item.target.syllables[0].phones[0] === "a" ? 5 : 1;
      data.responses.push({ id: `${session.id}/${position}`, session_id: session.id, position, item_id: id, audio_sha256: asset.audio.sha256,
        played_complete: true, answer: { status: "rated", rating, familiar: false } });
    });
    const row = buildAuditoryReport(data).groups.find(value => value.condition === "baseline" && value.stratum === null)!;
    expect(row.all.covered_draws).toBe(3); expect(row.all.covered_items).toBe(2);
    expect(row.all.share_4_5).toBeCloseTo(2 / 3, 15);
    expect(row.all.proportions).toEqual([1 / 3, 0, 0, 0, 2 / 3]);
  });
  it("keeps candidate-minus-baseline direction under reversed presentation orders", () => {
    const data = emptyExport();
    for (const session of data.plan.sessions) session.item_ids.forEach((id, position) => {
      const item = data.comparison.items.find(value => value.id === id)!, asset = data.release.assets.find(value => value.target_digest === item.target.digest)!;
      data.responses.push({ id: `${session.id}/${position}`, session_id: session.id, position, item_id: id, audio_sha256: asset.audio.sha256,
        played_complete: true, answer: { status: "rated", rating: item.condition === "candidate" ? 4 : 2, familiar: false } });
    });
    expect(buildAuditoryReport(data).participant_contrasts.map(row => row.all.mean_candidate_minus_baseline)).toEqual([2, 2, 2, 2]);
  });
  it("reports every missing assignment and null score when no responses exist", () => {
    const report = buildAuditoryReport(emptyExport());
    const pooled = report.groups.filter(group => group.stratum === null);
    expect(pooled.map(group => group.missing)).toEqual([4, 4]);
    expect(pooled.map(group => group.all.share_4_5)).toEqual([null, null]);
    expect(report.verified_distinct_people).toBeNull();
    expect(report.participant_contrasts.every(row => row.all.incomplete_pairs === 1)).toBe(true);
  });
  it("distinguishes missing, unplayed skip, familiarity and item/draw weighting", () => {
    const data = emptyExport();
    for (const session of data.plan.sessions) session.item_ids.forEach((id, position) => {
      const item = data.comparison.items.find(value => value.id === id)!;
      const asset = data.release.assets.find(value => value.target_digest === item.target.digest)!;
      data.responses.push({ id: `${session.id}/${position}`, session_id: session.id, position, item_id: id, audio_sha256: asset.audio.sha256,
        played_complete: item.condition === "candidate", answer: item.condition === "candidate" ? { status: "rated", rating: 5, familiar: true } : { status: "skipped", rating: null, familiar: null } });
    });
    const report = buildAuditoryReport(data), baseline = report.groups.find(row => row.condition === "baseline" && row.stratum === null)!;
    const candidate = report.groups.find(row => row.condition === "candidate" && row.stratum === null)!;
    expect(baseline.skipped_before_complete_playback).toBe(4); expect(baseline.missing).toBe(0);
    expect(candidate.familiar).toBe(4); expect(candidate.all.share_4_5).toBe(1); expect(candidate.unfamiliar.share_4_5).toBeNull();
    expect(report.participant_contrasts.every(row => row.all.complete_pairs === 0)).toBe(true);
  });
  it("rejects ratings before complete playback, swapped hashes and repeated response positions", () => {
    const data = emptyExport(), session = data.plan.sessions[0], item = data.comparison.items.find(value => value.id === session.item_ids[0])!;
    const audio = data.release.assets.find(value => value.target_digest === item.target.digest)!.audio.sha256;
    const response = { id: "r", session_id: session.id, position: 0, item_id: item.id, audio_sha256: audio,
      played_complete: true, answer: { status: "rated" as const, rating: 5, familiar: false } };
    data.responses = [response]; validateAuditoryExport(data);
    response.played_complete = false; expect(() => validateAuditoryExport(data)).toThrow("unplayed");
    response.played_complete = true; response.audio_sha256 = "0".repeat(64); expect(() => validateAuditoryExport(data)).toThrow("misbound");
    response.audio_sha256 = audio; data.responses.push({ ...response, id: "other" }); expect(() => validateAuditoryExport(data)).toThrow("duplicate");
  });
});
