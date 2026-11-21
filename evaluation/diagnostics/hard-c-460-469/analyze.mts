// Classify every /k/ (and /s/) written `c` in the final written word, using exact
// base-spelling cell ownership from the trace. Same function on both sides.
const VOWEL = /[aeiouy]/;

export interface COcc {
  sound: "k" | "s";
  /** Index in the final word. */
  pos: number;
  next: string; // next letter or "$"
  rest: string; // letters after c in final word
  where: "root-internal" | "root-final+suffix" | "root-final+transform" | "word-final" | "root-final-bare";
  nextOwner?: string; // owner phoneme(s) of the next cell (root-internal)
  nextRule?: string; // rewrite rule that produced the next cell
  prev: string;
  prev2: string;
  /** prev is a single nucleus vowel letter (prev2 is not a letter of the same vowel phone). */
  singleVowel: boolean;
  suffix?: string;
}

function ownerPhones(bs: any, cell: any): any[] {
  const o = cell?.origin;
  if (!o) return [];
  const units: number[] = o.kind === "rewrite" ? o.sourceUnitIds.filter((u: number) => bs.units[u].afterDoubling.includes(cell.text)) : [o.unitId];
  return units.flatMap((u: number) => bs.units[u].phoneIds.map((p: number) => bs.phones[p]));
}

function ownerSounds(bs: any, cell: any): string[] {
  const o = cell.origin;
  const units: number[] = o.kind === "rewrite" ? o.sourceUnitIds : [o.unitId];
  return units.flatMap((u: number) => bs.units[u].phoneIds.map((p: number) => bs.phones[p].soundAtSpelling));
}

export function analyze(word: any): { occ: COcc[]; skipped?: string } {
  const t = word.trace;
  const bs = t?.baseSpelling;
  if (!bs) return { occ: [], skipped: "no-base" };
  const base: string = bs.surface;
  const final: string = word.written.clean;
  const parts = t.morphology?.realization?.assembledParts as { role: string; text: string }[] | undefined;
  let prefixLen = 0;
  let root = final;
  let suffix = "";
  if (parts && t.morphology.template !== "bare") {
    prefixLen = parts.filter((p) => p.role === "prefix").reduce((n, p) => n + p.text.length, 0);
    root = parts.find((p) => p.role === "root")!.text;
    suffix = parts.find((p) => p.role === "suffix")?.text ?? "";
    if (prefixLen + root.length + suffix.length !== final.length) return { occ: [], skipped: "parts-mismatch" };
  } else if (base !== final) return { occ: [], skipped: "bare-mismatch" };
  let common = 0;
  while (common < base.length && common < root.length && base[common] === root[common]) common++;
  const occ: COcc[] = [];
  bs.cells.forEach((cell: any, i: number) => {
    if (cell.text !== "c") return;
    // A root-final /k/ that an affix rule re-sounds (-ity: /s/) reads as the new sound.
    const resound = t.morphology?.alternations?.find((a: any) => a.boundary === "root-suffix" && a.soundBefore === "k" && a.soundAfter);
    const sounds = ownerPhones(bs, cell).map((p: any) => resound && p.id === bs.phones.length - 1 ? resound.soundAfter : p.soundAtSpelling);
    const sound = sounds.includes("k") && !sounds.includes("s") ? "k" : sounds.includes("s") && !sounds.includes("k") ? "s" : undefined;
    if (!sound) return;
    if (i >= common) return; // changed by a boundary/morphophonemic transform
    const pos = prefixLen + i;
    const next = final[pos + 1] ?? "$";
    let where: COcc["where"];
    let nextOwner: string | undefined;
    let nextRule: string | undefined;
    if (i < base.length - 1) {
      if (i + 1 < common) {
        where = "root-internal";
        const nc = bs.cells[i + 1];
        nextOwner = ownerSounds(bs, nc).join("+");
        if (nc.origin.kind === "rewrite") nextRule = bs.edits.find((e: any) => e.id === nc.origin.editId)?.rule ?? "rewrite";
      } else where = "root-final+transform";
    } else if (pos + 1 >= final.length) where = "word-final";
    else if (i + 1 < root.length) where = "root-final+transform";
    else where = "root-final+suffix";
    const v = ownerPhones(bs, bs.cells[i - 1]), v2 = ownerPhones(bs, bs.cells[i - 2]);
    const singleVowel = v.length === 1 && v[0].segment === "nucleus" && /[aeiouy]/.test(base[i - 1] ?? "") &&
      !(v2.length === 1 && v2[0].id === v[0].id && /[aeiouy]/.test(base[i - 2] ?? ""));
    occ.push({
      singleVowel,
      sound, pos, next, rest: final.slice(pos + 1), where, nextOwner, nextRule,
      prev: final[pos - 1] ?? "^", prev2: final[pos - 2] ?? "^",
      suffix: suffix || undefined,
    });
  });
  return { occ };
}

export const isSoftLetter = (ch: string) => ch === "e" || ch === "i" || ch === "y";

/** -ic / -ac: a single i or a before the c. */
export function isIcAc(o: COcc): boolean {
  return (o.prev === "i" || o.prev === "a") && o.singleVowel;
}

/** #469 target: /k/ c at the end of the word or before an inflectional s/es/ed/se tail, outside -ic/-ac. */
export function finalTail(o: COcc): boolean {
  return /^(s|se|ses|sed|es|ed)?$/.test(o.rest);
}

export function finalBucket(o: COcc): string {
  if (o.prev === "s") return "after-s";
  if (o.prev === "l" || o.prev === "r") return "after-l/r";
  if (VOWEL.test(o.prev) && !o.singleVowel) return "after-vowel-digraph-or-long";
  if (!VOWEL.test(o.prev)) return "after-other-consonant";
  return "after-single-vowel-" + o.prev;
}
