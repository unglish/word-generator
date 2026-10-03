import { randomBytes } from "node:crypto";
import { constants } from "node:fs";
import { mkdir, open, readFile, unlink } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { CollectorError } from "../../comparison/collection/collection-core.js";
import { bytesHash, verifyReleaseFiles } from "../audio.js";
import type { AssetMaterial } from "../audio.js";
import { answerEvent, appendEvent, deliveryEvent, nextAuditory, parseAnswer, parsePlayback, participantFor, playbackEvent,
  requireOwner, restoreAuditoryCollector } from "./core.js";
import type { AuditoryCollectorManifest, AuditoryCollectorState, AuditoryCredentials, AuditoryEvent } from "./model.js";
import { digest } from "../../snapshot.js";

async function syncDirectory(directory: string): Promise<void> {
  const handle = await open(directory, "r"); try { await handle.sync(); } finally { await handle.close(); }
}
async function privateFile(file: string, content: string | Uint8Array): Promise<void> {
  const handle = await open(file, "wx", 0o600); try { await handle.writeFile(content); await handle.sync(); } finally { await handle.close(); }
}
export async function initializeAuditoryCollector(directory: string, manifest: AuditoryCollectorManifest, credentials: AuditoryCredentials, materials: AssetMaterial[]): Promise<void> {
  restoreAuditoryCollector(manifest, []); verifyReleaseFiles(manifest.comparison, manifest.release, materials);
  if (credentials.version !== "auditory-credentials-v1" || credentials.manifest_digest !== manifest.digest ||
      credentials.participants.length !== manifest.participant_credentials.length || new Set(credentials.participants.map(entry => entry.participant_slot)).size !== credentials.participants.length) {
    throw new Error("Auditory credentials do not match the manifest.");
  }
  requireOwner(manifest, credentials.owner_token);
  for (const entry of credentials.participants) if (participantFor(manifest, entry.token) !== entry.participant_slot) throw new Error("Auditory credential bound to another slot.");
  await mkdir(directory, { mode: 0o700 });
  await mkdir(resolve(directory, "assets"), { mode: 0o700 }); await mkdir(resolve(directory, "records"), { mode: 0o700 });
  for (const material of materials) {
    const audioHash = bytesHash(material.wav);
    await privateFile(resolve(directory, "assets", `${audioHash}.wav`), material.wav);
    await privateFile(resolve(directory, "records", `${material.target_digest}-production.json`), material.production_record);
    for (const verification of material.verification) await privateFile(resolve(directory, "records", `${material.target_digest}-${verification.record.person_key}-transcription.json`), verification.transcription_file);
  }
  await privateFile(resolve(directory, "manifest.json"), JSON.stringify(manifest) + "\n");
  await privateFile(resolve(directory, "credentials.json"), JSON.stringify(credentials) + "\n");
  await privateFile(resolve(directory, "events.jsonl"), "");
  await syncDirectory(resolve(directory, "assets")); await syncDirectory(resolve(directory, "records"));
  await syncDirectory(directory); await syncDirectory(dirname(resolve(directory)));
}
export function parseAuditoryJournal(text: string): AuditoryEvent[] {
  if (text && !text.endsWith("\n")) throw new Error("Interrupted auditory journal; preserve it for owner recovery before resuming.");
  return text ? text.slice(0, -1).split("\n").map(line => JSON.parse(line) as AuditoryEvent) : [];
}
async function verifyPrivateMaterials(directory: string, manifest: AuditoryCollectorManifest): Promise<void> {
  const materials: AssetMaterial[] = [];
  for (const asset of manifest.release.assets) {
    const verification: AssetMaterial["verification"] = [];
    for (const record of asset.verification) verification.push({ record,
      transcription_file: await readFile(resolve(directory, "records", `${asset.target_digest}-${record.person_key}-transcription.json`)) });
    materials.push({ target_digest: asset.target_digest, wav: await readFile(resolve(directory, "assets", `${asset.audio.sha256}.wav`)),
      production_record: await readFile(resolve(directory, "records", `${asset.target_digest}-production.json`)), verification });
  }
  verifyReleaseFiles(manifest.comparison, manifest.release, materials);
}
export class AuditoryJournal {
  private queue: Promise<void> = Promise.resolve();
  private poisoned = false;
  private writable = false;
  private closed = false;
  private constructor(readonly directory: string, private state: AuditoryCollectorState) {}
  static async load(directory: string): Promise<AuditoryJournal> {
    const manifest = JSON.parse(await readFile(resolve(directory, "manifest.json"), "utf8")) as AuditoryCollectorManifest;
    const state = restoreAuditoryCollector(manifest, parseAuditoryJournal(await readFile(resolve(directory, "events.jsonl"), "utf8")));
    await verifyPrivateMaterials(directory, manifest);
    return new AuditoryJournal(directory, state);
  }
  static async openWriter(directory: string): Promise<AuditoryJournal> {
    const lease = await open(resolve(directory, "writer.lock"), "wx", 0o600);
    try {
      try { await readFile(resolve(directory, "recovery.lock")); throw new Error("Owner recovery is active; do not open another writer."); }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
      await lease.writeFile(JSON.stringify({ pid: process.pid, created_at: new Date().toISOString() }) + "\n"); await lease.sync(); await syncDirectory(directory);
      const journal = await AuditoryJournal.load(directory); journal.writable = true; return journal;
    } catch (error) { await unlink(resolve(directory, "writer.lock")); await syncDirectory(directory); throw error; }
    finally { await lease.close(); }
  }
  snapshot(): AuditoryCollectorState { return structuredClone(this.state); }
  participant(token: string): string { return participantFor(this.state.manifest, token); }
  owner(token: string): void { requireOwner(this.state.manifest, token); }
  next(participant: string) { return nextAuditory(this.state, participant); }
  async audio(participant: string, audioHash: string): Promise<{ bytes: Buffer; delivery_id: string }> {
    const pending = this.next(participant);
    if (pending.exhausted || pending.packet.items[pending.position].audio_sha256 !== audioHash) throw new CollectorError("Only the current assigned audio may be served.", 403);
    let bytes: Buffer;
    try {
      bytes = await readFile(resolve(this.directory, "assets", `${audioHash}.wav`));
      if (bytesHash(bytes) !== audioHash) throw new Error("Frozen audio bytes changed; collection cannot continue.");
    } catch (error) { this.poisoned = true; throw error; }
    const deliveryId = randomBytes(32).toString("hex");
    await this.persist(state => deliveryEvent(state, participant, pending.packet.session_id, pending.position, audioHash, deliveryId, new Date().toISOString()));
    return { bytes, delivery_id: deliveryId };
  }
  async playback(participant: string, value: unknown): Promise<{ saved: true; duplicate: boolean }> {
    const submission = parsePlayback(value);
    return this.persist(state => playbackEvent(state, participant, submission, new Date().toISOString()));
  }
  async answer(participant: string, value: unknown): Promise<{ saved: true; duplicate: boolean }> {
    const submission = parseAnswer(value);
    return this.persist(state => answerEvent(state, participant, submission, new Date().toISOString()));
  }
  private async persist(create: (state: AuditoryCollectorState) => AuditoryEvent | null): Promise<{ saved: true; duplicate: boolean }> {
    const task = this.queue.then(async () => {
      if (!this.writable || this.closed) throw new Error("An active exclusive auditory writer is required.");
      if (this.poisoned) throw new Error("Auditory storage needs owner recovery before more events can be saved.");
      const event = create(this.state);
      if (!event) return { saved: true as const, duplicate: true };
      try {
        const handle = await open(resolve(this.directory, "events.jsonl"), constants.O_APPEND | constants.O_WRONLY);
        try { await handle.writeFile(JSON.stringify(event) + "\n"); await handle.sync(); } finally { await handle.close(); }
      } catch (error) { this.poisoned = true; throw error; }
      appendEvent(this.state, event);
      return { saved: true as const, duplicate: false };
    });
    this.queue = task.then(() => undefined, () => undefined); return task;
  }
  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true; await this.queue;
    if (this.writable) { await unlink(resolve(this.directory, "writer.lock")); await syncDirectory(this.directory); this.writable = false; }
  }
}

export async function recoverAuditoryCollector(directory: string, expectedLeaseHash: string, expectedJournalHash: string) {
  const leaseFile = resolve(directory, "writer.lock"), journalFile = resolve(directory, "events.jsonl"), recoveryFile = resolve(directory, "recovery.lock");
  const lease = await readFile(leaseFile), raw = await readFile(journalFile);
  if (bytesHash(lease) !== expectedLeaseHash || bytesHash(raw) !== expectedJournalHash) throw new Error("Recovery hashes do not match the inspected lease and journal.");
  const savedLease = JSON.parse(lease.toString("utf8"));
  if (!Number.isSafeInteger(savedLease.pid) || savedLease.pid < 1) throw new Error("Invalid writer PID; cannot prove the writer is stopped.");
  try { process.kill(savedLease.pid, 0); throw new Error("Writer PID is still live; recovery is refused."); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "ESRCH") throw error; }
  const recovery = await open(recoveryFile, "wx", 0o600);
  try {
    await recovery.writeFile(JSON.stringify({ pid: process.pid, created_at: new Date().toISOString() }) + "\n"); await recovery.sync(); await syncDirectory(directory);
    if (bytesHash(await readFile(leaseFile)) !== expectedLeaseHash || bytesHash(await readFile(journalFile)) !== expectedJournalHash) throw new Error("Recovery inputs changed before preservation.");
    const prefixBytes = raw.length && raw.at(-1) !== 10 ? raw.lastIndexOf(10) + 1 : raw.length;
    const prefix = raw.subarray(0, prefixBytes), manifest = JSON.parse(await readFile(resolve(directory, "manifest.json"), "utf8")) as AuditoryCollectorManifest;
    const state = restoreAuditoryCollector(manifest, parseAuditoryJournal(prefix.toString("utf8"))); await verifyPrivateMaterials(directory, manifest);
    const backup = resolve(directory, `recovery-${digest([expectedLeaseHash, expectedJournalHash])}-${randomBytes(8).toString("hex")}`);
    await mkdir(backup, { mode: 0o700 }); await privateFile(resolve(backup, "writer.lock"), lease); await privateFile(resolve(backup, "events.jsonl"), raw);
    const report = { version: "auditory-recovery-v1", manifest_digest: manifest.digest, lease_sha256: expectedLeaseHash,
      original_journal_sha256: expectedJournalHash, retained_journal_sha256: bytesHash(prefix), original_bytes: raw.length,
      retained_bytes: prefixBytes, interrupted_tail_bytes: raw.length - prefixBytes, retained_events: state.events.length,
      retained_responses: state.data.responses.length, stopped_writer_pid: savedLease.pid, recovered_at: new Date().toISOString() };
    await privateFile(resolve(backup, "report.json"), JSON.stringify(report) + "\n"); await syncDirectory(backup); await syncDirectory(directory);
    const handle = await open(journalFile, "r+");
    try {
      if (bytesHash(await handle.readFile()) !== expectedJournalHash) throw new Error("Journal changed after recovery backup.");
      await handle.truncate(prefixBytes); await handle.sync();
    } finally { await handle.close(); }
    if (bytesHash(await readFile(leaseFile)) !== expectedLeaseHash) throw new Error("Lease changed after recovery backup.");
    await unlink(leaseFile); await syncDirectory(directory); return { backup, report };
  } finally { await recovery.close(); await unlink(recoveryFile); await syncDirectory(directory); }
}
