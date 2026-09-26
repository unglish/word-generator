/** Source parsing is independent of population selection and phone projection. */
export const CMU_PARSER_VERSION = "cmu-lossless-records-v1";
export const CMU_COMPATIBILITY_POLICY = "cmu-ascii-first-v1";
export const CMU_COMPATIBILITY_DEFINITION = {
  id: CMU_COMPATIBILITY_POLICY,
  exclusionOrder: ["alternate_pronunciation", "non_ascii_spelling", "unsupported_pronunciation", "no_vowel", "duplicate_spelling"],
  spelling: "lowercase-ascii-letters",
  pronunciation: "first-valid-unlabelled-entry-in-source-order",
  weighting: "equal-selected-spelling-types",
  phoneProjection: "original-arpabet-with-explicit-vowel-stress",
} as const;
export const VOWELS = new Set("AA AE AH AO AW AY EH ER EY IH IY OW OY UH UW".split(" "));
export const CONSONANTS = new Set("B CH D DH F G HH JH K L M N NG P R S SH T TH V W Y Z ZH".split(" "));

export type CmuPhone =
  | { kind: "vowel"; raw: string; base: string; stress: 0 | 1 | 2 }
  | { kind: "consonant"; raw: string; base: string };

export interface CmuToken {
  raw: string;
  phone: CmuPhone | null;
}

interface SourceLine {
  line: number;
  raw: string;
  ending: "" | "\n" | "\r\n";
}

export interface CmuEntryRecord extends SourceLine {
  kind: "entry";
  label: string;
  /** Literal numbered variant label, without interpreting its frequency. */
  variant: string | null;
  headword: string | null;
  spelling: string | null;
  /** Exact suffix starting with the whitespace before an inline # comment. */
  comment: { offset: number; text: string } | null;
  tokens: CmuToken[];
}

export type CmuRecord = CmuEntryRecord | (SourceLine & { kind: "blank" | "comment" });

export type CmuExclusion = "alternate_pronunciation" | "non_ascii_spelling"
  | "unsupported_pronunciation" | "no_vowel" | "duplicate_spelling";

export interface SelectedCmuEntry {
  line: number;
  label: string;
  spelling: string;
  tokens: string[];
  phones: CmuPhone[];
}

export interface CmuSelection {
  policy: typeof CMU_COMPATIBILITY_POLICY;
  entries: SelectedCmuEntry[];
  excluded: Partial<Record<CmuExclusion, number>>;
  rejections: Array<{ line: number; label: string; reason: CmuExclusion }>;
}

export const normalizeSpelling = (spelling: string): string | null => /^[a-z]+$/i.test(spelling) ? spelling.toLowerCase() : null;

export function parseCmuPhone(raw: string): CmuPhone | null {
  if (CONSONANTS.has(raw)) return { kind: "consonant", raw, base: raw };
  const base = raw.slice(0, -1);
  if (/^[A-Z]+[012]$/.test(raw) && VOWELS.has(base)) {
    return { kind: "vowel", raw, base, stress: Number(raw.at(-1)) as 0 | 1 | 2 };
  }
  return null;
}

export const validCmuToken = (token: string): boolean => parseCmuPhone(token) !== null;

function parseEntry(source: SourceLine, trimmed: string): CmuEntryRecord {
  const commentMatch = /\s+#/.exec(trimmed);
  const body = commentMatch ? trimmed.slice(0, commentMatch.index) : trimmed;
  const [label, ...tokens] = body.split(/\s+/);
  const variant = /\((\d+)\)$/.exec(label);
  const offset = commentMatch ? source.raw.length - source.raw.trimStart().length + commentMatch.index : -1;
  return {
    ...source, kind: "entry", label,
    variant: variant?.[1] ?? null,
    headword: normalizeSpelling(variant ? label.slice(0, variant.index) : label),
    spelling: normalizeSpelling(label),
    comment: offset < 0 ? null : { offset, text: source.raw.slice(offset) },
    tokens: tokens.map(raw => ({ raw, phone: parseCmuPhone(raw) })),
  };
}

/** Concatenating raw + ending for all records reproduces the input exactly. */
export function parseCmuRecords(text: string): CmuRecord[] {
  const lines = text.match(/[^\n]*\n|[^\n]+$/g) ?? [];
  return lines.map((fragment, index) => {
    const ending = fragment.endsWith("\r\n") ? "\r\n" : fragment.endsWith("\n") ? "\n" : "";
    const raw = ending ? fragment.slice(0, -ending.length) : fragment;
    const source: SourceLine = { line: index + 1, raw, ending };
    const trimmed = raw.trim();
    if (!trimmed) return { ...source, kind: "blank" };
    if (trimmed.startsWith(";;;")) return { ...source, kind: "comment" };
    return parseEntry(source, trimmed);
  });
}

/** The first applicable exclusion preserves the exact #304 population contract. */
function exclusion(record: CmuEntryRecord, seen: ReadonlySet<string>): CmuExclusion | null {
  if (record.variant !== null) return "alternate_pronunciation";
  if (record.spelling === null) return "non_ascii_spelling";
  if (!record.tokens.length || record.tokens.some(token => token.phone === null)) return "unsupported_pronunciation";
  if (!record.tokens.some(token => token.phone?.kind === "vowel")) return "no_vowel";
  if (seen.has(record.spelling)) return "duplicate_spelling";
  return null;
}

/** Selects detached entries without modifying records or dropping invalid phones. */
export function selectCompatibleCmu(records: readonly CmuRecord[]): CmuSelection {
  const result: CmuSelection = { policy: CMU_COMPATIBILITY_POLICY, entries: [], excluded: {}, rejections: [] };
  const seen = new Set<string>();
  for (const record of records) {
    if (record.kind !== "entry") continue;
    const reason = exclusion(record, seen);
    if (reason) {
      result.excluded[reason] = (result.excluded[reason] ?? 0) + 1;
      result.rejections.push({ line: record.line, label: record.label, reason });
      continue;
    }
    const spelling = record.spelling!;
    seen.add(spelling);
    result.entries.push({ line: record.line, label: record.label, spelling,
      tokens: record.tokens.map(token => token.raw),
      phones: record.tokens.map(token => ({ ...token.phone! })),
    });
  }
  return result;
}
