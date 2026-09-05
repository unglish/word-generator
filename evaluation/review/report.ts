import type { ResponseRow, ReviewExport, Sample } from "./model.js";
import { validAnswer } from "./protocol.js";
import { validateSnapshot } from "./snapshot.js";

export interface ItemSummary {
  spelling: string;
  draws: number;
  ratings: number;
  familiar: number;
  skips: number;
  sessions: number;
  distribution: number[];
  unfamiliar_distribution: number[];
}
interface Distribution {
  eligible_ratings: number;
  covered_spellings: number;
  covered_draws: number;
  total_draws: number;
  proportions: (number | null)[];
  share_4_5: number | null;
  share_1_2: number | null;
}

export function validateExport(data: ReviewExport): void {
  if (data.schema_version !== 1) throw new Error("Unsupported export schema.");
  validateSnapshot({ manifest: data.study.manifest, digest: data.study.digest, samples: data.samples });
  const sessions = new Map(data.sessions.map(session => [session.id, session]));
  const samples = new Map(data.samples.map(sample => [sample.id, sample]));
  if (sessions.size !== data.sessions.length || data.study.id !== data.study.manifest.study_id || data.study.session_length !== data.study.manifest.session_length) throw new Error("Invalid exported study or sessions.");
  const ids = new Set<string>();
  const positions = new Set<string>();
  for (const session of data.sessions) {
    if (session.study_id !== data.study.id || session.assignments.length !== data.study.session_length ||
        session.assignments.some(id => !samples.has(id)) ||
        new Set(session.assignments.map(id => samples.get(id)?.spelling)).size !== session.assignments.length) throw new Error("Invalid exported assignment.");
  }
  for (const response of data.responses) {
    const positionKey = `${response.session_id}:${response.position}`;
    if (!validAnswer(response) || !Number.isInteger(response.position) ||
        sessions.get(response.session_id)?.assignments[response.position] !== response.sample_id ||
        !samples.has(response.sample_id) || ids.has(response.id) || positions.has(positionKey)) throw new Error("Invalid or duplicate exported response.");
    ids.add(response.id);
    positions.add(positionKey);
  }
}

function itemSummaries(data: ReviewExport): ItemSummary[] {
  const items = new Map<string, ItemSummary>();
  const sessions = new Map<string, Set<string>>();
  const samples = new Map(data.samples.map(sample => [sample.id, sample]));
  for (const sample of data.samples) {
    if (!items.has(sample.spelling)) items.set(sample.spelling, {
      spelling: sample.spelling, draws: 0, ratings: 0, familiar: 0, skips: 0, sessions: 0,
      distribution: [0, 0, 0, 0, 0], unfamiliar_distribution: [0, 0, 0, 0, 0],
    });
    items.get(sample.spelling)!.draws++;
  }
  for (const response of data.responses) {
    const spelling = samples.get(response.sample_id)!.spelling;
    const item = items.get(spelling)!;
    if (response.status === "skipped") { item.skips++; continue; }
    item.ratings++;
    item.distribution[response.rating! - 1]++;
    if (response.familiar) item.familiar++;
    else item.unfamiliar_distribution[response.rating! - 1]++;
    if (!sessions.has(spelling)) sessions.set(spelling, new Set());
    sessions.get(spelling)!.add(response.session_id);
  }
  for (const item of items.values()) item.sessions = sessions.get(item.spelling)?.size ?? 0;
  return [...items.values()].sort((a, b) => a.spelling.localeCompare(b.spelling, "en"));
}

function aggregate(samples: Sample[], items: ItemSummary[], unfamiliar: boolean): Distribution {
  const multiplicities = new Map<string, number>();
  for (const sample of samples) multiplicities.set(sample.spelling, (multiplicities.get(sample.spelling) ?? 0) + 1);
  const totals = [0, 0, 0, 0, 0];
  let coveredDraws = 0, coveredSpellings = 0, eligibleRatings = 0;
  for (const item of items) {
    const weight = multiplicities.get(item.spelling) ?? 0;
    const counts = unfamiliar ? item.unfamiliar_distribution : item.distribution;
    const n = counts.reduce((sum, count) => sum + count, 0);
    if (!weight || !n) continue;
    coveredDraws += weight;
    coveredSpellings++;
    eligibleRatings += n;
    counts.forEach((count, index) => { totals[index] += weight * count / n; });
  }
  return {
    eligible_ratings: eligibleRatings, covered_spellings: coveredSpellings, covered_draws: coveredDraws, total_draws: samples.length,
    proportions: totals.map(total => coveredDraws ? total / coveredDraws : null),
    share_4_5: coveredDraws ? (totals[3] + totals[4]) / coveredDraws : null,
    share_1_2: coveredDraws ? (totals[0] + totals[1]) / coveredDraws : null,
  };
}

function morphology(sample: Sample): string {
  const trace = sample.word.trace;
  if (!trace?.summary.morphologyApplied) return "bare";
  const { prefix, suffix } = trace.morphology ?? {};
  if (prefix && suffix) return "prefixed-and-suffixed";
  if (prefix) return "prefixed";
  if (suffix) return "suffixed";
  return "applied-unspecified";
}

export function buildReport(data: ReviewExport) {
  validateExport(data);
  const items = itemSummaries(data);
  const totalRatings = items.reduce((sum, item) => sum + item.ratings, 0);
  const familiarRatings = items.reduce((sum, item) => sum + item.familiar, 0);
  const responseCounts = new Map<string, number>();
  data.responses.forEach(response => responseCounts.set(response.session_id, (responseCounts.get(response.session_id) ?? 0) + 1));
  const strata = Object.fromEntries(Object.entries({
    written_length: (sample: Sample) => String([...sample.spelling].length),
    syllable_count: (sample: Sample) => String(sample.word.syllables.length),
    morphology,
  }).map(([name, classify]) => {
    const groups = new Map<string, Sample[]>();
    data.samples.forEach(sample => { const key = classify(sample); groups.set(key, [...groups.get(key) ?? [], sample]); });
    return [name, Object.fromEntries([...groups].map(([key, samples]) => [key, {
      all: aggregate(samples, items, false), unfamiliar: aggregate(samples, items, true),
    }]))];
  }));
  return {
    rubric: data.study.manifest.rubric, study_id: data.study.id, snapshot_digest: data.study.digest, exported_at: data.exported_at,
    coverage: {
      draws: data.samples.length, distinct_spellings: items.length, rated_spellings: items.filter(item => item.ratings > 0).length,
      sessions_started: data.sessions.length, sessions_completed: data.sessions.filter(session => responseCounts.get(session.id) === session.assignments.length).length,
      ratings: totalRatings, skips: items.reduce((sum, item) => sum + item.skips, 0),
      spellings_with_three_sessions: items.filter(item => item.sessions >= 3).length,
    },
    familiarity: { flagged: familiarRatings, ratings: totalRatings, response_rate: totalRatings ? familiarRatings / totalRatings : null },
    all: aggregate(data.samples, items, false), unfamiliar: aggregate(data.samples, items, true), strata, items,
  };
}

const percentage = (value: number | null) => value === null ? "—" : `${(value * 100).toFixed(1)}%`;
const cell = (value: string) => value.replace(/\|/g, "\\|").replace(/[\r\n]/g, " ");

export function reportMarkdown(report: ReturnType<typeof buildReport>): string {
  const lines = [
    `# Written wordlikeness: ${report.study_id}`, "", `Rubric: ${report.rubric.version} — ${report.rubric.question}`, "", report.rubric.labels.map((label, i) => `${i + 1}: ${label}`).join("; "), "", `Snapshot: ${report.snapshot_digest}`, "",
    "Descriptive pilot data. Sessions are not verified distinct people. Missing ratings are not failures; skips are excluded from score denominators. Aggregate distributions weight each spelling by its original draw multiplicity. No population estimate or generator acceptance threshold is implied.", "",
    "## Coverage", "", `- ${report.coverage.rated_spellings}/${report.coverage.distinct_spellings} spellings rated across ${report.coverage.draws} draws.`,
    `- ${report.coverage.sessions_completed}/${report.coverage.sessions_started} sessions completed; ${report.coverage.ratings} ratings and ${report.coverage.skips} skips.`,
    `- ${report.coverage.spellings_with_three_sessions}/${report.coverage.distinct_spellings} spellings have ratings from at least three sessions (collection target).`,
    `- Familiarity flagged on ${report.familiarity.flagged}/${report.familiarity.ratings} ratings (${percentage(report.familiarity.response_rate)}; response-weighted).`, "",
    "## Rating distributions", "", "| View | Rated spellings | Covered draws | Ratings | 1 | 2 | 3 | 4 | 5 | 4–5 | 1–2 |", "|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|",
  ];
  const row = (label: string, d: Distribution) => `| ${label} | ${d.covered_spellings} | ${d.covered_draws}/${d.total_draws} | ${d.eligible_ratings} | ${d.proportions.map(percentage).join(" | ")} | ${percentage(d.share_4_5)} | ${percentage(d.share_1_2)} |`;
  lines.push(row("All", report.all), row("Unfamiliar only", report.unfamiliar));
  for (const [name, groups] of Object.entries(report.strata)) {
    lines.push("", `## ${name.replace(/_/g, " ")}`, "", "| Stratum / view | Rated spellings | Covered draws | Ratings | 1 | 2 | 3 | 4 | 5 | 4–5 | 1–2 |", "|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|");
    for (const [key, group] of Object.entries(groups)) lines.push(row(`${key} / all`, group.all), row(`${key} / unfamiliar`, group.unfamiliar));
  }
  lines.push("", "## Individual spellings", "", "Histograms retain disagreement rather than collapsing it into one average. Where multiple draws share a spelling, their judgments are shared across those draws, including in strata.", "", "| Spelling | Draws | Ratings | Sessions | Skips | Familiar | Counts 1 / 2 / 3 / 4 / 5 | Unfamiliar counts |", "|---|---:|---:|---:|---:|---:|---|---|");
  for (const item of report.items) lines.push(`| ${cell(item.spelling)} | ${item.draws} | ${item.ratings} | ${item.sessions} | ${item.skips} | ${item.familiar} | ${item.distribution.join(" / ")} | ${item.unfamiliar_distribution.join(" / ")} |`);
  return `${lines.join("\n")}\n`;
}

function csvCell(value: unknown): string {
  const text = String(value ?? "");
  const safe = /^[=+@\-\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, "\"\"")}"`;
}

export function responseCsv(data: ReviewExport): string {
  validateExport(data);
  const samples = new Map(data.samples.map(sample => [sample.id, sample]));
  const headers = ["study_id", "snapshot_digest", "session_id", "response_id", "position", "sample_id", "spelling", "draw_indices", "status", "rating", "familiar", "comment", "received_at"];
  const rows = data.responses.map((r: ResponseRow) => {
    const spelling = samples.get(r.sample_id)!.spelling;
    return [data.study.id, data.study.digest, r.session_id, r.id, r.position, r.sample_id, spelling,
      data.samples.filter(sample => sample.spelling === spelling).map(sample => sample.draw_index).join(";"),
      r.status, r.rating, r.familiar, r.comment, r.received_at];
  });
  return `${[headers, ...rows].map(row => row.map(csvCell).join(",")).join("\r\n")}\r\n`;
}
