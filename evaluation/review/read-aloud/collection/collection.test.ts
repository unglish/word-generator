import { spawn } from "node:child_process";
import { once } from "node:events";
import { appendFile, mkdir, mkdtemp, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { bytesHash } from "../../auditory/audio.js";
import { digest } from "../../snapshot.js";
import { fixture } from "../read-aloud.fixture.js";
import { createReadAloudCollector, restoreReadAloudCollector } from "./core.js";
import { initializeReadAloudCollector, parseReadAloudJournal, ReadAloudJournal, recoverReadAloudCollector } from "./journal.js";
import type { PresentationSubmission, ReadAloudEvent } from "./model.js";
import { createReadAloudServer } from "./server.js";

const journals: ReadAloudJournal[] = [];
const children: ReturnType<typeof spawn>[] = [];
afterEach(async () => {
  await Promise.all(children.splice(0).map(async child => {
    if (child.exitCode === null && child.signalCode === null) { const exited = once(child, "exit"); child.kill("SIGKILL"); await exited; }
  }));
  await Promise.all(journals.splice(0).map(journal => journal.close()));
});
async function setup() {
  const source = fixture(), collector = createReadAloudCollector(source.comparison, source.plan, source.roster, "synthetic-fixture");
  const directory = resolve(await mkdtemp(resolve(tmpdir(), "q23-collector-unit-")), "store");
  await initializeReadAloudCollector(directory, collector.manifest, collector.credentials);
  const journal = await ReadAloudJournal.openWriter(directory); journals.push(journal);
  const participant = collector.credentials.participants[0].participant_slot;
  function presentation(): PresentationSubmission {
    const pending = journal.next(participant); if (pending.exhausted) throw new Error("Fixture exhausted.");
    return { session_id: pending.session_id, position: pending.position, request_id: digest(["request", pending.session_id, pending.position]),
      capture: { source: "synthetic-fixture", context_sample_rate: source.comparison.registration.recording.sample_rate,
        device_sample_rate: null, device_channel_count: null, echo_cancellation: null, noise_suppression: null, auto_gain_control: null } };
  }
  return { ...source, ...collector, directory, journal, participant, presentation };
}
function reseal(events: ReadAloudEvent[], manifestDigest: string): ReadAloudEvent[] {
  let previous = manifestDigest;
  return events.map((event, sequence) => {
    const { sha256: ignored, ...content } = event;
    if (!ignored) throw new Error("Original event digest missing.");
    const sealed = { ...content, sequence, previous_sha256: previous };
    previous = digest(sealed); return { ...sealed, sha256: previous };
  });
}

describe("durable first-presentation read-aloud collection", () => {
  it("completes private initialization and refuses partial or changed credentials", async () => {
    const f = await setup();
    expect((await stat(f.directory)).mode & 0o777).toBe(0o700);
    for (const file of ["manifest.json", "credentials.json", "events.jsonl", "complete.json"]) expect((await stat(resolve(f.directory, file))).mode & 0o777).toBe(0o600);
    await unlink(resolve(f.directory, "complete.json"));
    await expect(ReadAloudJournal.load(f.directory)).rejects.toThrow();
    await expect(initializeReadAloudCollector(f.directory, f.manifest, f.credentials)).rejects.toThrow(/EEXIST/);
  });
  it("reveals only the current spelling after a persisted presentation; exact retries are idempotent", async () => {
    const f = await setup(), before = f.journal.next(f.participant);
    expect(before).not.toHaveProperty("spelling"); expect(before).not.toHaveProperty("items"); expect(before).not.toHaveProperty("phones");
    const request = f.presentation();
    const [one, two] = await Promise.all([f.journal.present(f.participant, request), f.journal.present(f.participant, request)]);
    expect(one.duplicate).toBe(false); expect(two).toEqual({ ...one, duplicate: true });
    const events = parseReadAloudJournal(await readFile(resolve(f.directory, "events.jsonl"), "utf8"));
    expect(events).toHaveLength(1); expect(events[0].kind).toBe("presentation");
    expect(one.spelling).toBe(f.comparison.partition.items.find(item => item.id === one.item_id)!.spelling);
    expect(Object.keys(one).sort()).toEqual(["attempt_id", "duplicate", "item_id", "position", "saved", "session_id", "spelling"]);
    await expect(f.journal.present(f.participant, { ...request, request_id: digest("retake") })).rejects.toThrow(/second attempt/);
  });
  it("rejects future positions, foreign readers, changed capture settings and hidden-field injection", async () => {
    const f = await setup(), request = f.presentation();
    await expect(f.journal.present(f.participant, { ...request, position: request.position + 1 })).rejects.toThrow(/current/);
    await expect(f.journal.present(f.participant, { ...request, capture: { ...request.capture, source: "microphone" } })).rejects.toThrow(/registered/);
    await expect(f.journal.present(f.participant, { ...request, spelling: "hint" })).rejects.toThrow(/Invalid/);
    await expect(f.journal.present(f.participant, { ...request, capture: { ...request.capture, context_sample_rate: 16000 } })).rejects.toThrow(/registered/);
    const shown = await f.journal.present(f.participant, request), other = f.credentials.participants[1].participant_slot;
    await expect(f.journal.record(other, shown.attempt_id, f.recording)).rejects.toThrow(/assignment/);
    expect(f.journal.snapshot().events).toHaveLength(1);
  });
  it("commits the first WAV hash, durably saves exact bytes, and rejects changed recording retries", async () => {
    const f = await setup(), shown = await f.journal.present(f.participant, f.presentation());
    const receipt = await f.journal.record(f.participant, shown.attempt_id, f.recording);
    expect(receipt.reading.outcome.status).toBe("recorded");
    expect(f.journal.snapshot().events.map(event => event.kind)).toEqual(["presentation", "recording-intent", "reading"]);
    expect(await readFile(resolve(f.directory, "recordings", bytesHash(f.recording) + ".wav"))).toEqual(f.recording);
    expect((await stat(resolve(f.directory, "recordings", bytesHash(f.recording) + ".wav"))).mode & 0o777).toBe(0o600);
    expect((await f.journal.record(f.participant, shown.attempt_id, f.recording)).duplicate).toBe(true);
    const altered = Buffer.from(f.recording); altered.writeInt16LE(100, 44);
    await expect(f.journal.record(f.participant, shown.attempt_id, altered)).rejects.toThrow(/immutable/);
    await expect(f.journal.fail(f.participant, { attempt_id: shown.attempt_id, status: "skipped", reason: "change answer" })).rejects.toThrow(/immutable/);
    await f.journal.close();
    const restored = await ReadAloudJournal.load(f.directory);
    expect(restored.snapshot().data.readings).toEqual([receipt.reading]);
    expect((await restored.materialInventory()).filter(file => file.directory === "incoming")).toHaveLength(1);
  });
  it("retains an audio commitment across storage failure; only identical bytes can finish it", async () => {
    const f = await setup(), shown = await f.journal.present(f.participant, f.presentation()), audioHash = bytesHash(f.recording);
    const blocked = resolve(f.directory, "recordings", audioHash + ".wav"); await mkdir(blocked);
    await expect(f.journal.record(f.participant, shown.attempt_id, f.recording)).rejects.toThrow();
    expect(f.journal.snapshot().events.map(event => event.kind)).toEqual(["presentation", "recording-intent"]);
    expect(f.journal.snapshot().data.readings).toHaveLength(0);
    await expect(f.journal.fail(f.participant, { attempt_id: shown.attempt_id, status: "recording-failed", reason: "lost" })).rejects.toThrow(/inspection/);
    await f.journal.close();
    await rename(blocked, resolve(f.directory, "injected-storage-block-preserved"));
    const reopened = await ReadAloudJournal.openWriter(f.directory); journals.push(reopened);
    expect(reopened.next(f.participant)).toHaveProperty("committed_audio_sha256", audioHash);
    const altered = Buffer.from(f.recording); altered.writeInt16LE(200, 44);
    await expect(reopened.record(f.participant, shown.attempt_id, altered)).rejects.toThrow(/first received/);
    await expect(reopened.fail(f.participant, { attempt_id: shown.attempt_id, status: "skipped", reason: "lost" })).rejects.toThrow(/recording failure/);
    expect((await reopened.record(f.participant, shown.attempt_id, f.recording)).reading.outcome.status).toBe("recorded");
  });
  it("keeps skips, failures and pending first presentations distinct", async () => {
    const f = await setup();
    await expect(f.journal.fail(f.participant, { attempt_id: digest("unpresented"), status: "skipped", reason: "skip" })).rejects.toThrow(/assignment/);
    const shown = await f.journal.present(f.participant, f.presentation());
    await f.journal.close();
    const reopened = await ReadAloudJournal.openWriter(f.directory); journals.push(reopened);
    expect(reopened.next(f.participant)).toHaveProperty("attempt_id", shown.attempt_id);
    expect(reopened.snapshot().data.readings).toHaveLength(0);
    const request = { attempt_id: shown.attempt_id, status: "recording-failed" as const, reason: "Browser lost the first recording before encoding." };
    expect((await reopened.fail(f.participant, request)).duplicate).toBe(false);
    expect((await reopened.fail(f.participant, request)).duplicate).toBe(true);
    await expect(reopened.fail(f.participant, { ...request, reason: "different" })).rejects.toThrow(/immutable/);
    expect(reopened.snapshot().data.readings[0].outcome).toEqual({ status: request.status, reason: request.reason });
  });
  it("refuses changed acknowledged WAVs and a second writer", async () => {
    const f = await setup(), shown = await f.journal.present(f.participant, f.presentation());
    await expect(ReadAloudJournal.openWriter(f.directory)).rejects.toThrow(/EEXIST/);
    await f.journal.record(f.participant, shown.attempt_id, f.recording);
    const changed = Buffer.from(f.recording); changed[50] ^= 1;
    await writeFile(resolve(f.directory, "recordings", bytesHash(f.recording) + ".wav"), changed);
    await expect(ReadAloudJournal.load(f.directory)).rejects.toThrow();
    await expect(f.journal.record(f.participant, shown.attempt_id, f.recording)).rejects.toThrow(/bytes changed/);
    await expect(f.journal.present(f.participant, f.presentation())).rejects.toThrow(/inspection/);
  });
  it("drains accepted operations before releasing its writer lease", async () => {
    const f = await setup(), request = f.presentation();
    const pending = f.journal.present(f.participant, request), closing = f.journal.close();
    expect((await pending).saved).toBe(true); await closing;
    expect((await ReadAloudJournal.load(f.directory)).snapshot().events).toHaveLength(1);
    await expect(f.journal.present(f.participant, request)).rejects.toThrow(/exclusive/);
  });
  it("rejects consistently resealed source identities, impossible facts, missing commitments and changed reading IDs", async () => {
    const f = await setup(), shown = await f.journal.present(f.participant, f.presentation());
    await f.journal.record(f.participant, shown.attempt_id, f.recording);
    const events = f.journal.snapshot().events;
    const badItem = structuredClone(events); if (badItem[0].kind === "presentation") badItem[0].presentation.item_id = digest("foreign");
    expect(() => restoreReadAloudCollector(f.manifest, reseal(badItem, f.manifest.digest))).toThrow();
    const badFacts = structuredClone(events); if (badFacts[1].kind === "recording-intent") badFacts[1].audio.frames = -1;
    expect(() => restoreReadAloudCollector(f.manifest, reseal(badFacts, f.manifest.digest))).toThrow(/PCM/);
    expect(() => restoreReadAloudCollector(f.manifest, reseal([events[0], events[2]], f.manifest.digest))).toThrow(/commitment/);
    const badId = structuredClone(events); if (badId[2].kind === "reading") badId[2].reading.id = digest("other-reading");
    expect(() => restoreReadAloudCollector(f.manifest, reseal(badId, f.manifest.digest))).toThrow(/identity/);
  });
  it("refuses synthetic capture in a declared human study", async () => {
    const f = await setup(), manifest = structuredClone(f.manifest);
    manifest.comparison.registration.purpose = "human-study";
    expect(() => restoreReadAloudCollector(manifest, [])).toThrow(/synthetic/);
  });
  it("preserves the complete receipt prefix and original interrupted tail after a verified stopped writer", async () => {
    const f = await setup(), shown = await f.journal.present(f.participant, f.presentation());
    await f.journal.record(f.participant, shown.attempt_id, f.recording); await f.journal.close();
    const moduleUrl = pathToFileURL(resolve("evaluation/review/read-aloud/collection/journal.ts")).href;
    const child = spawn(process.execPath, ["--import", "tsx", "--input-type=module", "-e",
      `const {ReadAloudJournal}=await import(${JSON.stringify(moduleUrl)}); await ReadAloudJournal.openWriter(${JSON.stringify(f.directory)}); process.stdout.write('ready\\n'); setInterval(()=>{},1000);`], { stdio: ["ignore", "pipe", "pipe"] });
    children.push(child);
    await new Promise<void>((accept, reject) => { child.stdout.once("data", () => accept()); child.once("exit", code => reject(new Error(`Child exited ${code}`))); });
    const lease = await readFile(resolve(f.directory, "writer.lock")), complete = await readFile(resolve(f.directory, "events.jsonl"));
    await expect(recoverReadAloudCollector(f.directory, bytesHash(lease), bytesHash(complete))).rejects.toThrow(/still live/);
    const exited = once(child, "exit"); child.kill("SIGKILL"); await exited;
    await appendFile(resolve(f.directory, "events.jsonl"), "{\"interrupted\":");
    const interrupted = await readFile(resolve(f.directory, "events.jsonl"));
    await expect(ReadAloudJournal.openWriter(f.directory)).rejects.toThrow(/EEXIST/);
    await expect(recoverReadAloudCollector(f.directory, bytesHash(lease), digest("wrong"))).rejects.toThrow(/hashes/);
    const recovered = await recoverReadAloudCollector(f.directory, bytesHash(lease), bytesHash(interrupted));
    expect(recovered.report.retained_events).toBe(3); expect(recovered.report.retained_readings).toBe(1);
    expect(await readFile(resolve(recovered.backup, "events.jsonl"))).toEqual(interrupted);
    expect(await readFile(resolve(f.directory, "events.jsonl"))).toEqual(complete);
    expect((await ReadAloudJournal.load(f.directory)).snapshot().data.readings).toHaveLength(1);
  });
  it("protects the actual loopback presentation, binary upload, immutable retry and owner export routes", async () => {
    const f = await setup(), server = createReadAloudServer(f.journal);
    await new Promise<void>(accept => server.listen(0, "127.0.0.1", accept));
    const address = server.address(); if (!address || typeof address === "string") throw new Error("No test address.");
    const url = `http://127.0.0.1:${address.port}`, token = f.credentials.participants[0].token;
    const auth = { Authorization: `Bearer ${token}` }, owner = { Authorization: `Bearer ${f.credentials.owner_token}` };
    try {
      expect((await fetch(url + "/api/next")).status).toBe(401);
      const first = await (await fetch(url + "/api/next", { headers: auth })).json(); expect(first).not.toHaveProperty("spelling");
      expect((await fetch(url + "/api/audit", { headers: auth })).status).toBe(401);
      expect((await fetch(url + "/api/presentation", { method: "POST", headers: { ...auth, "content-type": "xapplication/json" }, body: "{}" })).status).toBe(415);
      const response = await fetch(url + "/api/presentation", { method: "POST", headers: { ...auth, "content-type": "application/json" }, body: JSON.stringify(f.presentation()) });
      expect(response.status).toBe(200); const shown = await response.json();
      const uploaded = await fetch(url + "/api/recording/" + shown.attempt_id, { method: "POST", headers: { ...auth, "content-type": "audio/wav" }, body: f.recording });
      expect(uploaded.status).toBe(200); expect((await uploaded.json()).saved).toBe(true);
      const retry = await fetch(url + "/api/recording/" + shown.attempt_id, { method: "POST", headers: { ...auth, "content-type": "audio/wav" }, body: f.recording });
      expect((await retry.json()).duplicate).toBe(true);
      expect((await (await fetch(url + "/api/export", { headers: owner })).json()).readings).toHaveLength(1);
      expect((await (await fetch(url + "/api/audit", { headers: owner })).json()).events).toHaveLength(3);
    } finally { server.closeAllConnections(); await new Promise<void>(accept => server.close(() => accept())); }
  });
});
