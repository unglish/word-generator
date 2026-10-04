import { randomBytes } from "node:crypto";
import { createServer } from "node:http";
import type { IncomingMessage, Server, ServerResponse } from "node:http";
import { CollectorError } from "../../comparison/collection/collection-core.js";
import { AuditoryJournal } from "./journal.js";
import { auditoryCollectorHtml } from "./ui.js";

function bearer(request: IncomingMessage): string {
  const match = /^Bearer ([a-f0-9]{64})$/.exec(request.headers.authorization ?? "");
  if (!match) throw new CollectorError("Authentication required.", 401); return match[1];
}
function json(response: ServerResponse, status: number, value: unknown): void {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" }); response.end(JSON.stringify(value));
}
async function submission(request: IncomingMessage): Promise<unknown> {
  if (!/^application\/json(?:;|$)/i.test(request.headers["content-type"] ?? "")) throw new CollectorError("Use a JSON submission.", 415);
  const chunks: Buffer[] = []; let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk); size += buffer.length;
    if (size > 16384) throw new CollectorError("Submission is too large.", 413); chunks.push(buffer);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { throw new CollectorError("Invalid JSON submission.", 400); }
}
export function createAuditoryServer(journal: AuditoryJournal): Server {
  return createServer(async (request, response) => {
    response.setHeader("cache-control", "no-store"); response.setHeader("x-content-type-options", "nosniff"); response.setHeader("referrer-policy", "no-referrer");
    try {
      const path = new URL(request.url ?? "/", "http://127.0.0.1").pathname;
      if (request.method === "GET" && path === "/") {
        const nonce = randomBytes(16).toString("base64");
        response.setHeader("content-security-policy", `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; connect-src 'self'; media-src blob:; base-uri 'none'; frame-ancestors 'none'; form-action 'none'`);
        response.writeHead(200, { "content-type": "text/html; charset=utf-8" }); response.end(auditoryCollectorHtml(nonce)); return;
      }
      if (request.method === "GET" && path === "/api/next") { json(response, 200, journal.next(journal.participant(bearer(request)))); return; }
      const audio = /^\/api\/audio\/([a-f0-9]{64})$/.exec(path);
      if (request.method === "GET" && audio) {
        const served = await journal.audio(journal.participant(bearer(request)), audio[1]);
        response.writeHead(200, { "content-type": "audio/wav", "content-length": served.bytes.length,
          "x-auditory-sha256": audio[1], "x-auditory-delivery": served.delivery_id }); response.end(served.bytes); return;
      }
      if (request.method === "POST" && (path === "/api/playback" || path === "/api/answer")) {
        const participant = journal.participant(bearer(request)), value = await submission(request);
        const receipt = path === "/api/playback" ? await journal.playback(participant, value) : await journal.answer(participant, value);
        json(response, 200, receipt); return;
      }
      if (request.method === "GET" && (path === "/api/export" || path === "/api/audit")) {
        journal.owner(bearer(request)); const state = journal.snapshot();
        json(response, 200, path === "/api/export" ? state.data : { manifest: state.manifest, events: state.events }); return;
      }
      json(response, 404, { error: "Unknown auditory route." });
    } catch (error) {
      if (error instanceof CollectorError) json(response, error.status, { error: error.message });
      else { console.error("Auditory request failed; inspect local storage before resuming."); json(response, 503, { error: "The request could not be confirmed. Please retry or contact the study owner." }); }
    }
  });
}
