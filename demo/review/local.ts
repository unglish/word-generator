import type {
  Answer,
  Assignment,
  Continuation,
  Submission,
} from "../../evaluation/review/protocol.js";
import { validAnswer } from "../../evaluation/review/protocol.js";

interface Credentials {
  id: string;
  token: string;
}

type OpenBatch = {
  assignment: null;
  next: 0;
  outbox: readonly [];
  continuing?: false;
  exhausted?: false;
};

type AssignedBatch = { assignment: Assignment; next: number };
type Batch =
  | OpenBatch
  | (AssignedBatch &
      (
        | {
            continuing?: false;
            exhausted?: false;
            outbox: readonly Submission[];
          }
        | { continuing: true; exhausted?: false; outbox: readonly [] }
        | { continuing: false; exhausted: true; outbox: readonly [] }
      ));

export type LocalSession = Credentials & { revision: number } & Batch;

export type ReviewRequest = Credentials & { kind: "start" | "continue" };

export type ReviewReceipt = { sessionId: string } & (
  | { kind: "start"; assignment: Assignment }
  | { kind: "continue"; result: Continuation }
);

export interface ReviewPosition {
  sessionId: string;
  position: number;
}

export function pendingReviewRequest({
  id,
  token,
  assignment,
  continuing,
}: LocalSession): ReviewRequest | undefined {
  if (continuing) return { kind: "continue", id, token };
  if (!assignment) return { kind: "start", id, token };
  return undefined;
}

export function latestSession(
  current: LocalSession | undefined,
  incoming: LocalSession | undefined,
): LocalSession | undefined {
  return incoming && (!current || incoming.revision >= current.revision)
    ? incoming
    : current;
}

export class StalePositionError extends Error {
  constructor() {
    super(
      "This word was already submitted in another tab. Your current position has been restored.",
    );
  }
}

export class ReviewStore {
  constructor(private readonly database: IDBDatabase) {}

  static open(): Promise<ReviewStore> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("unglish-review-v1", 1);
      request.onupgradeneeded = () =>
        request.result.createObjectStore("sessions");
      request.onerror = () => reject(request.error);
      request.onblocked = () =>
        reject(
          new Error(
            "Close other review tabs and reload to update local storage.",
          ),
        );
      request.onsuccess = () => {
        request.result.onversionchange = () => request.result.close();
        resolve(new ReviewStore(request.result));
      };
    });
  }

  close(): void {
    this.database.close();
  }

  private transaction(key: string): Promise<LocalSession | undefined>;
  private transaction(
    key: string,
    update: (session: LocalSession | undefined) => LocalSession,
  ): Promise<LocalSession>;
  private transaction(
    key: string,
    update?: (session: LocalSession | undefined) => LocalSession,
  ): Promise<LocalSession | undefined> {
    return new Promise((resolve, reject) => {
      const tx = this.database.transaction(
        "sessions",
        update ? "readwrite" : "readonly",
      );
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
        } catch (error) {
          failure = error;
          tx.abort();
        }
      };
      tx.oncomplete = () => resolve(result);
      tx.onabort = () =>
        reject(
          failure ?? tx.error ?? new Error("Local storage transaction failed."),
        );
      tx.onerror = () => {
        failure ??= tx.error;
      };
    });
  }

  private updateExisting(
    key: string,
    update: (session: LocalSession) => LocalSession,
    missingMessage = "Local session is missing.",
  ): Promise<LocalSession> {
    return this.transaction(key, (session) => {
      if (!session) throw new Error(missingMessage);
      return update(session);
    });
  }

  get(key: string): Promise<LocalSession | undefined> {
    return this.transaction(key);
  }

  private newSession(): LocalSession {
    return {
      id: crypto.randomUUID(),
      token: [...crypto.getRandomValues(new Uint8Array(32))]
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join(""),
      revision: 0,
      assignment: null,
      next: 0,
      outbox: [],
    };
  }

  async ensure(key: string): Promise<LocalSession> {
    return this.transaction(key, (existing) => existing ?? this.newSession());
  }

  async nextBatch(key: string, completedId: string): Promise<LocalSession> {
    return this.updateExisting(key, (existing) => {
      if (
        existing.id !== completedId ||
        existing.continuing ||
        existing.exhausted
      )
        return existing;
      if (
        !existing.assignment ||
        existing.next !== existing.assignment.items.length ||
        existing.outbox.length
      ) {
        throw new Error(
          "Wait until all responses are received before continuing.",
        );
      }
      return { ...existing, continuing: true, outbox: [] };
    });
  }

  async receive(key: string, receipt: ReviewReceipt): Promise<LocalSession> {
    return this.updateExisting(key, (session) => {
      if (session.id !== receipt.sessionId) return session;
      if (receipt.kind === "start") {
        if (!session.assignment)
          return { ...session, assignment: receipt.assignment };
        if (
          JSON.stringify(session.assignment.items) !==
          JSON.stringify(receipt.assignment.items)
        ) {
          throw new Error(
            "The saved assignment has changed. Please contact the study owner.",
          );
        }
        return session;
      }
      if (!session.continuing) return session;
      const { result } = receipt;
      if (result.exhausted)
        return { ...session, continuing: false, exhausted: true };
      return {
        revision: session.revision,
        id: result.session_id,
        token: result.submission_token,
        assignment: result.assignment,
        next: 0,
        outbox: [],
      };
    });
  }

  async enqueue(
    key: string,
    { sessionId, position }: ReviewPosition,
    answer: Answer,
  ): Promise<LocalSession> {
    if (!validAnswer(answer))
      throw new Error("Choose a rating or skip this word.");
    return this.updateExisting(
      key,
      (session) => {
        if (!session.assignment) throw new Error("The assignment is missing.");
        if (session.id !== sessionId || session.next !== position)
          throw new StalePositionError();
        if (
          session.continuing ||
          session.exhausted ||
          position >= session.assignment.items.length
        )
          throw new Error("This review is already complete.");
        return {
          ...session,
          next: position + 1,
          outbox: [
            ...session.outbox,
            {
              session_id: session.id,
              submission_token: session.token,
              response_id: crypto.randomUUID(),
              position,
              ...answer,
            },
          ],
        };
      },
      "The assignment is missing.",
    );
  }

  async acknowledge(key: string, responseId: string): Promise<LocalSession> {
    return this.updateExisting(key, (session) => {
      if (!session.assignment || session.continuing || session.exhausted)
        return session;
      const outbox = session.outbox.filter(
        (response) => response.response_id !== responseId,
      );
      if (outbox.length === session.outbox.length) return session;
      return {
        ...session,
        outbox,
      };
    });
  }
}
