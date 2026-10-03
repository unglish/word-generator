import { constants } from "node:fs";
import { mkdir, open, readFile, unlink } from "node:fs/promises";
import { resolve } from "node:path";
import { authorizeOwner, authorizeParticipant, eventForSubmission, nextAssignment, parseSubmission, restoreCollector } from "./collection-core.js";
import type { CollectorCredentials, CollectorEvent, CollectorManifest, CollectorState } from "./collection-model.js";

async function privateFile(path: string, content: string): Promise<void> {
  const handle = await open(path, "wx", 0o600);
  try { await handle.writeFile(content); await handle.sync(); } finally { await handle.close(); }
}
export async function initializeCollector(directory: string, manifest: CollectorManifest, credentials: CollectorCredentials): Promise<void> {
  restoreCollector(manifest, []);
  if (credentials.version !== "written-collector-credentials-v1" || credentials.manifest_digest !== manifest.digest ||
    credentials.participants.length !== manifest.participant_credentials.length ||
    new Set(credentials.participants.map(entry => entry.participant_slot)).size !== credentials.participants.length) {
    throw new Error("Credentials do not match the collector manifest.");
  }
  authorizeOwner(manifest, credentials.owner_token);
  for (const entry of credentials.participants) if (authorizeParticipant(manifest, entry.token) !== entry.participant_slot) {
    throw new Error("Participant credential is bound to another slot.");
  }
  await mkdir(directory, { mode: 0o700 });
  await privateFile(resolve(directory, "manifest.json"), JSON.stringify(manifest) + "\n");
  await privateFile(resolve(directory, "credentials.json"), JSON.stringify(credentials) + "\n");
  await privateFile(resolve(directory, "responses.jsonl"), "");
  const handle = await open(directory, "r");
  try { await handle.sync(); } finally { await handle.close(); }
}
export function parseJournal(text: string): CollectorEvent[] {
  if (text && !text.endsWith("\n")) throw new Error("Interrupted collector journal; preserve it for owner recovery before resuming.");
  return text ? text.slice(0, -1).split("\n").map(line => JSON.parse(line) as CollectorEvent) : [];
}
export class CollectorJournal {
  private queue: Promise<void> = Promise.resolve();
  private poisoned = false;
  private writable = false;
  private closed = false;
  private constructor(readonly directory: string, private state: CollectorState) {}
  static async load(directory: string): Promise<CollectorJournal> {
    const manifest = JSON.parse(await readFile(resolve(directory, "manifest.json"), "utf8")) as CollectorManifest;
    const events = parseJournal(await readFile(resolve(directory, "responses.jsonl"), "utf8"));
    return new CollectorJournal(directory, restoreCollector(manifest, events));
  }
  static async openWriter(directory: string): Promise<CollectorJournal> {
    const lease = await open(resolve(directory, "writer.lock"), "wx", 0o600);
    try {
      await lease.writeFile(JSON.stringify({ pid: process.pid, created_at: new Date().toISOString() }) + "\n"); await lease.sync();
      const journal = await CollectorJournal.load(directory); journal.writable = true;
      return journal;
    } catch (error) { await unlink(resolve(directory, "writer.lock")); throw error; }
    finally { await lease.close(); }
  }
  snapshot(): CollectorState { return structuredClone(this.state); }
  participant(token: string): string { return authorizeParticipant(this.state.manifest, token); }
  owner(token: string): void { authorizeOwner(this.state.manifest, token); }
  next(participant: string) { return nextAssignment(this.state, participant); }
  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true; await this.queue;
    if (this.writable) { await unlink(resolve(this.directory, "writer.lock")); this.writable = false; }
  }
  async submit(participant: string, value: unknown): Promise<{ saved: true; duplicate: boolean }> {
    const submission = parseSubmission(value);
    const task = this.queue.then(async () => {
      if (!this.writable || this.closed) throw new Error("An active exclusive collector writer is required.");
      if (this.poisoned) throw new Error("Collector storage needs owner recovery before more answers can be saved.");
      const event = eventForSubmission(this.state, participant, submission, new Date().toISOString());
      if (!event) return { saved: true as const, duplicate: true };
      try {
        const handle = await open(resolve(this.directory, "responses.jsonl"), constants.O_APPEND | constants.O_WRONLY);
        try { await handle.writeFile(JSON.stringify(event) + "\n"); await handle.sync(); } finally { await handle.close(); }
      } catch (error) { this.poisoned = true; throw error; }
      this.state.events.push(event); this.state.data.responses.push(event.response);
      return { saved: true as const, duplicate: false };
    });
    this.queue = task.then(() => undefined, () => undefined);
    return task;
  }
}
