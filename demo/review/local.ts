import type { Answer, Assignment, Submission } from "../../evaluation/review/protocol.js";
import { validAnswer } from "../../evaluation/review/protocol.js";

export interface LocalSession {
  revision: number;
  id: string;
  token: string;
  assignment: Assignment | null;
  next: number;
  outbox: Submission[];
}

export class StalePositionError extends Error {
  constructor() { super("This word was already submitted in another tab. Your current position has been restored."); }
}

export class ReviewStore {
  constructor(private readonly database: IDBDatabase) {}

  static open(): Promise<ReviewStore> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("unglish-review-v1", 1);
      request.onupgradeneeded = () => request.result.createObjectStore("sessions");
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error("Close other review tabs and reload to update local storage."));
      request.onsuccess = () => {
        request.result.onversionchange = () => request.result.close();
        resolve(new ReviewStore(request.result));
      };
    });
  }

  close(): void { this.database.close(); }

  private transaction(key: string, update?: (session: LocalSession | undefined) => LocalSession): Promise<LocalSession | undefined> {
    return new Promise((resolve, reject) => {
      const tx = this.database.transaction("sessions", update ? "readwrite" : "readonly");
      const store = tx.objectStore("sessions");
      const request = store.get(key);
      let result: LocalSession | undefined;
      let failure: unknown;
      request.onsuccess = () => {
        try {
          result = request.result;
          if (update) {
            const next = update(result);
            if (next !== result) {
              result = { ...next, revision: (result?.revision ?? 0) + 1 };
              store.put(result, key);
            }
          }
        } catch (error) { failure = error; tx.abort(); }
      };
      tx.oncomplete = () => resolve(result);
      tx.onabort = () => reject(failure ?? tx.error ?? new Error("Local storage transaction failed."));
      tx.onerror = () => { failure ??= tx.error; };
    });
  }

  get(key: string): Promise<LocalSession | undefined> { return this.transaction(key); }

  private newSession(): LocalSession {
    return {
      id: crypto.randomUUID(), token: [...crypto.getRandomValues(new Uint8Array(32))].map(byte => byte.toString(16).padStart(2, "0")).join(""),
      revision: 0, assignment: null, next: 0, outbox: [],
    };
  }

  async ensure(key: string): Promise<LocalSession> {
    return (await this.transaction(key, existing => existing ?? this.newSession()))!;
  }

  async nextBatch(key: string, completedId: string): Promise<LocalSession> {
    return (await this.transaction(key, existing => {
      if (!existing) throw new Error("Local session is missing.");
      if (existing.id !== completedId) return existing;
      if (!existing.assignment || existing.next !== existing.assignment.items.length || existing.outbox.length) {
        throw new Error("Wait until all responses are received before continuing.");
      }
      return this.newSession();
    }))!;
  }

  async assign(key: string, assignment: Assignment): Promise<LocalSession> {
    return (await this.transaction(key, session => {
      if (!session) throw new Error("Local session is missing.");
      if (session.assignment && JSON.stringify(session.assignment.items) !== JSON.stringify(assignment.items)) throw new Error("The saved assignment has changed. Please contact the study owner.");
      return { ...session, assignment };
    }))!;
  }

  async enqueue(key: string, position: number, answer: Answer, sessionId?: string): Promise<LocalSession> {
    if (!validAnswer(answer)) throw new Error("Choose a rating or skip this word.");
    return (await this.transaction(key, session => {
      if (!session?.assignment) throw new Error("The assignment is missing.");
      if ((sessionId !== undefined && session.id !== sessionId) || session.next !== position) throw new StalePositionError();
      if (position >= session.assignment.items.length) throw new Error("This review is already complete.");
      return { ...session, next: position + 1, outbox: [...session.outbox, {
        session_id: session.id, submission_token: session.token, response_id: crypto.randomUUID(), position, ...answer,
      }] };
    }))!;
  }

  async acknowledge(key: string, responseId: string): Promise<LocalSession> {
    return (await this.transaction(key, session => {
      if (!session) throw new Error("Local session is missing.");
      return { ...session, outbox: session.outbox.filter(response => response.response_id !== responseId) };
    }))!;
  }
}
