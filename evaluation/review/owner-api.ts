import { digest, validateSnapshot } from "./snapshot.js";
import type { ResponseRow, ReviewExport, Sample, SessionRow, Snapshot, StudyRow } from "./model.js";

export class OwnerApi {
  constructor(private readonly url: string, private readonly key: string, private readonly transport: typeof fetch = fetch) {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(parsed.hostname)) throw new Error("Use HTTPS for a hosted database.");
    if (!key) throw new Error("SUPABASE_SECRET_KEY is required for owner commands.");
  }

  async request<T>(resource: string, method = "GET", body?: unknown): Promise<T> {
    const response = await this.transport(`${this.url.replace(/\/$/, "")}/rest/v1/${resource}`, {
      method,
      headers: { apikey: this.key, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) throw new Error(`Database ${method} failed (${response.status}). Check credentials, migrations, and study content.`);
    const text = await response.text();
    return text ? JSON.parse(text) as T : undefined as T;
  }

  async rows<T>(table: string, filters: Record<string, string> = {}, select = "*", pageSize = 500): Promise<T[]> {
    const rows: T[] = [];
    let lastId: string | undefined;
    for (;;) {
      const params = new URLSearchParams({ ...filters, select, order: "id.asc", limit: String(pageSize) });
      // Keyset pagination remains stable when other sessions insert rows during an export.
      if (lastId) params.append("id", `gt.${lastId}`);
      const page = await this.request<(T & { id: string })[]>(`${table}?${params}`);
      rows.push(...page);
      if (!page.length) return rows;
      lastId = page[page.length - 1].id;
    }
  }

  async importStudy(snapshot: Snapshot): Promise<void> {
    validateSnapshot(snapshot);
    const id = snapshot.manifest.study_id;
    const existing = await this.rows<StudyRow>("review_studies", { id: `eq.${id}` });
    if (existing.length && (existing[0].digest !== snapshot.digest || digest(existing[0].manifest) !== digest(snapshot.manifest))) {
      throw new Error("This study ID already contains different frozen content. Create a new study ID.");
    }
    if (!existing.length) await this.request("review_studies", "POST", {
      id, manifest: snapshot.manifest, digest: snapshot.digest, session_length: snapshot.manifest.session_length, enrollment_open: false,
    });
    const uploaded = await this.rows<Sample>("review_samples", { study_id: `eq.${id}` });
    const expected = new Map(snapshot.samples.map(sample => [sample.id, sample]));
    for (const sample of uploaded) {
      if (digest(expected.get(sample.id) ?? null) !== digest(sample)) throw new Error("Uploaded samples differ from the snapshot.");
    }
    const uploadedIds = new Set(uploaded.map(sample => sample.id));
    const missing = snapshot.samples.filter(sample => !uploadedIds.has(sample.id));
    if (missing.length && existing[0]?.enrollment_open) throw new Error("An open study is incomplete. Close enrollment before repairing the import.");
    for (let i = 0; i < missing.length; i += 20) await this.request("review_samples", "POST", missing.slice(i, i + 20));
    const verified = await this.rows<Sample>("review_samples", { study_id: `eq.${id}` });
    validateSnapshot({ ...snapshot, samples: verified.sort((a, b) => a.draw_index - b.draw_index) });
    await this.request(`review_studies?${new URLSearchParams({ id: `eq.${id}` })}`, "PATCH", { enrollment_open: true });
  }

  async exportStudy(id: string): Promise<ReviewExport> {
    const studies = await this.rows<StudyRow>("review_studies", { id: `eq.${id}` });
    if (studies.length !== 1) throw new Error("Study not found.");
    const exportedAt = new Date().toISOString();
    const samples = await this.rows<Sample>("review_samples", { study_id: `eq.${id}` });
    samples.sort((a, b) => a.draw_index - b.draw_index);
    validateSnapshot({ manifest: studies[0].manifest, digest: studies[0].digest, samples });
    const sessions = await this.rows<SessionRow>("review_sessions", { study_id: `eq.${id}`, created_at: `lte.${exportedAt}` }, "id,study_id,assignments,created_at,completed_at");
    const responses: ResponseRow[] = [];
    // Select by session in bounded groups, so unrelated studies never enter an export.
    for (let i = 0; i < sessions.length; i += 50) {
      responses.push(...await this.rows<ResponseRow>("review_responses", {
        session_id: `in.(${sessions.slice(i, i + 50).map(session => session.id).join(",")})`, received_at: `lte.${exportedAt}`,
      }));
    }
    return { schema_version: 1, exported_at: exportedAt, study: studies[0], samples, sessions, responses };
  }
}
