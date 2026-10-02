/** Offsets use JavaScript UTF-16 code units, as RegExp and String.replace do. */
export interface RegexSpellingEdit {
  start: number;
  end: number;
  before: string;
  after: string;
  captures: (string | undefined)[];
  groups?: Record<string, string | undefined>;
}

function substitute(
  template: string, input: string, start: number, match: string,
  captures: readonly (string | undefined)[], groups?: Record<string, string | undefined>,
): string {
  return template.replace(/\$(\$|&|`|'|<[^>]*>|[0-9]{1,2})/g, (token, body: string) => {
    if (body === "$") return "$";
    if (body === "&") return match;
    if (body === "`") return input.slice(0, start);
    if (body === "'") return input.slice(start + match.length);
    if (body.startsWith("<")) return groups === undefined ? token : (groups[body.slice(1, -1)] ?? "");
    const index = Number(body);
    if (index > 0 && index <= captures.length) return captures[index - 1] ?? "";
    const first = Number(body[0]);
    if (body.length === 2 && first > 0 && first <= captures.length) return (captures[first - 1] ?? "") + body[1];
    return token;
  });
}

/** Records the executed matches; it does not infer phonemic ownership of replacements. */
export function replaceWithSpellingEdits(input: string, pattern: RegExp, replacement: string): {
  surface: string; edits: RegexSpellingEdit[];
} {
  const edits: RegexSpellingEdit[] = [];
  const surface = input.replace(pattern, (...args: unknown[]) => {
    const hasGroups = typeof args[args.length - 1] === "object";
    const groups = hasGroups ? args[args.length - 1] as Record<string, string | undefined> : undefined;
    const offsetIndex = args.length - (hasGroups ? 3 : 2);
    const start = args[offsetIndex] as number;
    const before = args[0] as string;
    const captures = args.slice(1, offsetIndex) as (string | undefined)[];
    const after = substitute(replacement, input, start, before, captures, groups);
    edits.push({ start, end: start + before.length, before, after, captures,
      ...(groups === undefined ? {} : { groups: { ...groups } }) });
    return after;
  });
  return { surface, edits };
}

/** Reconstruct recorded mutations without regex matching or edit-distance alignment. */
export function replaySpellingEdits(input: string, edits: readonly RegexSpellingEdit[]): string {
  let cursor = 0;
  const pieces: string[] = [];
  for (const edit of edits) {
    if (!Number.isSafeInteger(edit.start) || !Number.isSafeInteger(edit.end) ||
        edit.start < cursor || edit.end < edit.start || edit.end > input.length ||
        input.slice(edit.start, edit.end) !== edit.before) throw new Error("Invalid spelling edit span");
    pieces.push(input.slice(cursor, edit.start), edit.after);
    cursor = edit.end;
  }
  pieces.push(input.slice(cursor));
  return pieces.join("");
}
