import { randomBytes } from "node:crypto";
import { createServer } from "node:http";
import type { IncomingMessage, Server, ServerResponse } from "node:http";
import { CollectorError } from "./collection-core.js";
import { CollectorJournal } from "./collection-journal.js";
import { collectorHtml } from "./collection-ui.js";

function bearer(request: IncomingMessage): string {
  const match = /^Bearer ([a-f0-9]{64})$/.exec(request.headers.authorization ?? "");
  if (!match) throw new CollectorError("Authentication required.", 401);
  return match[1];
}
function json(response: ServerResponse, status: number, value: unknown): void {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" }); response.end(JSON.stringify(value));
}
async function submission(request: IncomingMessage): Promise<unknown> {
  if (!/^application\/json(?:;|$)/i.test(request.headers["content-type"] ?? "")) throw new CollectorError("Use a JSON answer submission.", 415);
  const chunks: Buffer[] = []; let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk); size += buffer.length;
    if (size > 16384) throw new CollectorError("Answer submission is too large.", 413);
    chunks.push(buffer);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { throw new CollectorError("Invalid JSON answer submission.", 400); }
}
export function createCollectorServer(journal: CollectorJournal): Server {
  return createServer(async (request, response) => {
    response.setHeader("cache-control", "no-store"); response.setHeader("x-content-type-options", "nosniff");
    response.setHeader("referrer-policy", "no-referrer");
    try {
      const path = new URL(request.url ?? "/", "http://127.0.0.1").pathname;
      if (request.method === "GET" && path === "/") {
        const nonce = randomBytes(16).toString("base64");
        response.setHeader("content-security-policy", `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'`);
        response.writeHead(200, { "content-type": "text/html; charset=utf-8" }); response.end(collectorHtml(nonce)); return;
      }
      if (request.method === "GET" && path === "/api/next") {
        json(response, 200, journal.next(journal.participant(bearer(request)))); return;
      }
      if (request.method === "POST" && path === "/api/answer") {
        const participant = journal.participant(bearer(request));
        const result = await journal.submit(participant, await submission(request)); json(response, 200, result); return;
      }
      if (request.method === "GET" && (path === "/api/export" || path === "/api/audit")) {
        journal.owner(bearer(request)); const state = journal.snapshot();
        json(response, 200, path === "/api/export" ? state.data : { manifest: state.manifest, events: state.events }); return;
      }
      json(response, 404, { error: "Unknown collection route." });
    } catch (error) {
      if (error instanceof CollectorError) json(response, error.status, { error: error.message });
      else { console.error("Collector request failed; inspect local storage before resuming."); json(response, 503, { error: "The save could not be confirmed. Please retry or contact the study owner." }); }
    }
  });
}
