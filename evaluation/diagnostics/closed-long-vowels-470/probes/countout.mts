// Output-based #470 count: the issue rule applied to the written (base-spelling) letters.
// A single vowel letter split by an e marker reads short across two coda consonants
// (except /eɪ/ + n dʒ or s t: change, paste) or a held digraph consonant.
// Usage: node --import tsx countout.mts <pr-checkout> [N] [firstSeed] [--examples]
const root = process.argv[2]; // <main-checkout> or <pr-checkout>
const N = Number(process.argv[3] ?? 20000), first = Number(process.argv[4] ?? 2_000_000);
const { generateWord } = await import(`${root}/src/index.ts`);
const LONG = new Set(["aɪ", "eɪ", "i:", "u"]);
const HELD = new Set(["ŋ", "ʃ", "tʃ", "θ", "ð"]);
const OK = /^(nd|ld|nt|st|lt|ll|gn|gh|ght)$/;
const SPLIT_OK: Record<string, string[]> = { "eɪ": ["n dʒ", "s t"] };
const isVowel = (c: string) => /[aeiouy]/.test(c);
const tally: Record<string, number> = {}; const ex: Record<string, string[]> = {}; let words = 0;
for (let seed = first; seed < first + N; seed++) {
  const w: any = generateWord({ seed, trace: true });
  const b = w.trace.baseSpelling; if (!b) continue;
  const owner = (c: any) => c.origin.kind === "rewrite" ? (c.origin.sourceUnitIds[0] ?? -1) : c.origin.unitId;
  const phone = (id: number) => b.phones[id];
  const parts = w.trace.morphology?.realization?.emittedParts;
  const suffixFirst = parts?.find((p: any) => p.role === "suffix")?.text?.[0];
  const lastSyl = Math.max(...b.phones.map((p: any) => p.syllableIndex));
  let hit = false;
  for (const nuc of b.phones) {
    if (nuc.segment !== "nucleus" || !LONG.has(nuc.soundAtSpelling) || nuc.segmentIndex !== 0) continue;
    const si = nuc.syllableIndex;
    const codaPhones = b.phones.filter((p: any) => p.syllableIndex === si && p.segment === "coda");
    if (!codaPhones.length) continue;
    // Letters of this syllable's rime, in order, with roles.
    const idx = b.cells.map((c: any, i: number) => ({ c, i, o: owner(c) }));
    const nucCells = idx.filter((x: any) => x.o >= 0 && phone(x.o).syllableIndex === si && phone(x.o).segment === "nucleus");
    const codaCells = idx.filter((x: any) => x.o >= 0 && phone(x.o).syllableIndex === si && phone(x.o).segment === "coda");
    if (!nucCells.length || !codaCells.length) continue;
    const firstCoda = codaCells[0].i, lastCoda = codaCells[codaCells.length - 1].i;
    const lettersBefore = nucCells.filter((x: any) => x.i < firstCoda);
    const codaSounds = codaPhones.map((p: any) => p.soundAtSpelling);
    const codaLetters = codaCells.map((x: any) => x.c.text).join("");
    // Split marker: a nucleus e after the coda (magic-e), an unowned e right after the coda (silent-e), or a coda spelling ending in e.
    const after = b.cells[lastCoda + 1];
    const marker = nucCells.some((x: any) => x.i > lastCoda && x.c.text === "e")
      || (after && after.text === "e" && owner(after) < 0)
      || /e$/.test(codaLetters);
    // An unsplit closed /aɪ/ ie or /u/ ue reads /i:/ or /ju/ (wielkar, puruechial).
    const vowelText = lettersBefore.map((x: any) => x.c.text).join("");
    if (!marker && ((nuc.soundAtSpelling === "aɪ" && vowelText === "ie") || (nuc.soundAtSpelling === "u" && vowelText === "ue"))) {
      const k = `${nuc.soundAtSpelling}\tunsplit ${vowelText} (coda ${codaLetters})`;
      tally[k] = (tally[k] ?? 0) + 1; (ex[k] ??= []).length < 6 && ex[k].push(`${seed}:${w.written.clean}`); hit = true;
      continue;
    }
    // A digraph (ee, ew, oo) reads long; only a single vowel letter can read short.
    if (lettersBefore.length !== 1 || !isVowel(lettersBefore[0].c.text)) continue;
    // A digraph selection shortened by a join (ume + eas) is not a long-vowel letter choice.
    const sel = w.trace.graphemeSelections.find((g: any) => g.index === nuc.id);
    if (sel && sel.selected.length > 1 && !marker) continue;
    let short: boolean, kind: string;
    if (marker) {
      const one = codaSounds.length === 1 && !HELD.has(codaSounds[0]);
      const okCluster = (SPLIT_OK[nuc.soundAtSpelling] ?? []).includes(codaSounds.join(" "));
      short = !(one || okCluster || (codaSounds.length === 1 && codaSounds[0] === "dʒ"));
      kind = codaSounds.length > 1 ? "split across cluster" : "split across held digraph";
    } else {
      const letters = codaLetters;
      let next: string;
      if (si === lastSyl) next = suffixFirst === undefined ? "#" : (isVowel(suffixFirst) ? "V" : "C");
      else next = b.phones.some((p: any) => p.syllableIndex === si + 1 && p.segment === "onset") ? "C" : "V";
      short = !OK.test(letters) && !(next === "V" && letters.length === 1);
      kind = "bare closed";
    }
    if (!short) continue;
    hit = true;
    const k = `${nuc.soundAtSpelling}\t${kind}`;
    tally[k] = (tally[k] ?? 0) + 1;
    (ex[k] ??= []).length < 6 && ex[k].push(`${seed}:${w.written.clean}`);
  }
  if (hit) words++;
}
const total = Object.values(tally).reduce((a, b) => a + b, 0);
console.log(`${root.split("/").slice(-2).join("/")}: cases ${total}, words ${words}`);
for (const k of Object.keys(tally).sort()) console.log(`  ${tally[k]}\t${k}${process.argv.includes("--examples") ? "\t" + ex[k].join(" ") : ""}`);
