import { parseAssignment, parseContinuation } from "../../evaluation/review/protocol.js";
import type { Submission } from "../../evaluation/review/protocol.js";
import type { ReviewReceipt, ReviewRequest } from "./local.js";

export class ApiError extends Error {
  constructor(message: string, readonly retryable: boolean) { super(message); }
}

export class ReviewApi {
  constructor(private readonly url: string, private readonly key: string, private readonly study: string) {}

  private async rpc(name: string, body: unknown): Promise<unknown> {
    let response: Response;
    try {
      response = await fetch(`${this.url.replace(/\/$/, "")}/rest/v1/rpc/${name}`, {
        method: "POST", headers: { apikey: this.key, "Content-Type": "application/json" }, body: JSON.stringify(body),
        signal: AbortSignal.timeout(15000),
      });
    } catch { throw new ApiError("The connection was interrupted. Your saved responses are still on this device.", true); }
    if (!response.ok) {
      if (response.status === 404 && (name === "start_review" || name === "continue_review")) throw new ApiError("This study is unavailable or closed to new reviews.", false);
      if (response.status === 429 || response.status >= 500) throw new ApiError("Submissions are temporarily unavailable. Your saved responses will be retried.", true);
      throw new ApiError("The study could not accept this request. Your saved responses remain on this device. Please contact the study owner.", false);
    }
    try { return await response.json(); }
    catch { throw new ApiError("The server returned an unreadable acknowledgement. Please retry.", true); }
  }

  async request({ kind, id: sessionId, token }: ReviewRequest): Promise<ReviewReceipt> {
    const payload = await this.rpc(`${kind}_review`, { study_id: this.study, session_id: sessionId, submission_token: token });
    if (kind === "start") return { kind, sessionId, assignment: parseAssignment(payload) };
    try { return { kind, sessionId, result: parseContinuation(payload) }; }
    catch { throw new ApiError("The server returned an invalid continuation. Please retry.", true); }
  }

  async submit(response: Submission): Promise<void> {
    const ack = await this.rpc("submit_review_response", response) as { accepted?: boolean; response_id?: string } | null;
    if (ack?.accepted !== true || ack.response_id !== response.response_id) throw new ApiError("The response was not acknowledged. Please retry.", true);
  }
}
