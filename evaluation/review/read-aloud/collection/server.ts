import { randomBytes } from "node:crypto";
import { createServer } from "node:http";
import type { IncomingMessage, Server, ServerResponse } from "node:http";
import { CollectorError } from "../../comparison/collection/collection-core.js";
import { ReadAloudJournal } from "./journal.js";
import { readAloudHtml } from "./ui.js";
import { recorderWorklet } from "./worklet.js";

function bearer(request: IncomingMessage): string {
  const match = /^Bearer ([a-f0-9]{64})$/.exec(request.headers.authorization ?? "");
  if (!match) throw new CollectorError("Authentication required.", 401);
  return match[1];
}
function json(response: ServerResponse, status: number, value: unknown): void {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" }); response.end(JSON.stringify(value));
}
async function body(request: IncomingMessage, type: string, maximum: number): Promise<Buffer> {
  if ((request.headers["content-type"] ?? "").toLowerCase().split(";")[0].trim() !== type) throw new CollectorError(`Use ${type} content.`, 415);
  const chunks: Buffer[] = []; let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk); size += buffer.length;
    if (size > maximum) throw new CollectorError("Submission exceeds its registered size limit.", 413);
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}
async function submission(request: IncomingMessage): Promise<unknown> {
  const bytes = await body(request, "application/json", 16384);
  try { return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); }
  catch { throw new CollectorError("Invalid JSON submission.", 400); }
}
export function createReadAloudServer(journal: ReadAloudJournal): Server {
  const contract = journal.snapshot().manifest.comparison.registration.recording;
  const maximumWavBytes = 44 + Math.floor(contract.sample_rate * contract.maximum_seconds) * 2;
  return createServer(async (request, response) => {
    response.setHeader("cache-control", "no-store"); response.setHeader("x-content-type-options", "nosniff"); response.setHeader("referrer-policy", "no-referrer");
    try {
      const path = new URL(request.url ?? "/", "http://127.0.0.1").pathname;
      if (request.method === "GET" && path === "/") {
        const nonce = randomBytes(16).toString("base64");
        response.setHeader("content-security-policy", `default-src 'none'; script-src 'self' 'nonce-${nonce}'; style-src 'nonce-${nonce}'; connect-src 'self'; worker-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'`);
        response.setHeader("permissions-policy", "microphone=(self)");
        response.writeHead(200, { "content-type": "text/html; charset=utf-8" }); response.end(readAloudHtml(nonce)); return;
      }
      if (request.method === "GET" && path === "/recorder-worklet.js") {
        response.writeHead(200, { "content-type": "text/javascript; charset=utf-8" }); response.end(recorderWorklet); return;
      }
      if (request.method === "GET" && path === "/api/next") {
        json(response, 200, journal.next(journal.participant(bearer(request)))); return;
      }
      if (request.method === "POST" && (path === "/api/presentation" || path === "/api/failure")) {
        const participant = journal.participant(bearer(request)), value = await submission(request);
        const result = path === "/api/presentation" ? await journal.present(participant, value) : await journal.fail(participant, value);
        json(response, 200, result); return;
      }
      const recording = /^\/api\/recording\/([a-f0-9]{64})$/.exec(path);
      if (request.method === "POST" && recording) {
        const participant = journal.participant(bearer(request));
        json(response, 200, await journal.record(participant, recording[1], await body(request, "audio/wav", maximumWavBytes))); return;
      }
      if (request.method === "GET" && ["/api/export", "/api/audit", "/api/materials"].includes(path)) {
        journal.owner(bearer(request)); const state = journal.snapshot();
        if (path === "/api/export") json(response, 200, state.data);
        else if (path === "/api/audit") json(response, 200, { manifest: state.manifest, events: state.events });
        else json(response, 200, await journal.materialInventory());
        return;
      }
      json(response, 404, { error: "Unknown read-aloud route." });
    } catch (error) {
      if (error instanceof CollectorError) json(response, error.status, { error: error.message });
      else {
        console.error("Read-aloud request failed; inspect local storage before resuming.");
        json(response, 503, { error: "The request could not be confirmed. Retry the same recording or contact the study owner." });
      }
    }
  });
}
