import { describe, expect, it } from "vitest";
import { createGenerator, englishConfig, createSeededRng } from "../index.js";
import type { LanguageConfig, GeneratedWord } from "../types.js";

const SEEDS = [42, 43, 44] as const;
const PER_SEED = 4_000;

function ungated(): LanguageConfig {
  return {
    ...englishConfig,
    syllableStructure: {
      ...englishConfig.syllableStructure,
      letterLengthTargets: undefined,
      letterLengthRelaxedAfter: undefined,
    },
  };
}

/** Final nucleus letters after base-spelling rewrites (surface), not selected/emitted. */
function surfaceNucleusForms(word: GeneratedWord): {
  phone: string;
  selected: string;
  surface: string;
  split: boolean;
}[] {
  const base = word.trace!.baseSpelling!;
  const out: { phone: string; selected: string; surface: string; split: boolean }[] = [];
  for (const unit of base.units) {
    const phoneMeta = base.phones[unit.phoneIds[0]];
    if (phoneMeta.segment !== "nucleus") continue;
    let form =
      typeof unit.afterDoubling === "string"
        ? unit.afterDoubling
        : String(unit.afterDoubling ?? unit.selected);
    const selected = unit.selected;
    let split = false;
    for (const edit of base.edits ?? []) {
      if (edit.rule === "spellingRule:oa-to-split" && selected === "oa") {
        form = "o";
        split = true;
        continue;
      }
      if (edit.rule === "silentE:swap" && edit.before === form) {
        form = edit.after;
        continue;
      }
      if (edit.rule === "silentE:marker") {
        const hadSwap = (base.edits ?? []).some(
          (e) => e.rule === "silentE:swap" && (e.before === selected || e.after === form),
        );
        if (hadSwap || form.length === 1) split = true;
        continue;
      }
      if (typeof edit.before === "string" && typeof edit.after === "string" && edit.before === form) {
        form = edit.after;
      }
    }
    out.push({ phone: phoneMeta.soundAtSpelling, selected, surface: form, split });
  }
  return out;
}

describe("monosyllable vowel spelling distribution (#450)", () => {
  it("bounds surface /ɛ/ /ɔ/ /ʊ/ /əʊ/ /i:/ forms and aw/ow closed leaks", () => {
    const gen = createGenerator(ungated());
    const byPhoneForm: Record<string, Record<string, number>> = {};
    let awCluster = 0;
    let auCluster = 0;
    let oTotal = 0;
    let owClosed = 0;
    let oaCluster = 0;
    let ouTotal = 0;
    let eeSurface = 0;
    let iTotal = 0;

    for (const seed of SEEDS) {
      const rand = createSeededRng(seed);
      let kept = 0;
      let draws = 0;
      while (kept < PER_SEED && draws < PER_SEED * 40) {
        draws++;
        const word = gen.generateWord({
          rand,
          mode: "lexicon",
          morphology: false,
          trace: true,
        });
        if (word.syllables.length !== 1) continue;
        kept++;
        const syl = word.syllables[0];
        const closed = syl.coda.length > 0;
        const cluster = syl.coda.length >= 2;
        for (const f of surfaceNucleusForms(word)) {
          const key = f.split ? `${f.surface}+e` : f.surface;
          byPhoneForm[f.phone] ??= {};
          byPhoneForm[f.phone][key] = (byPhoneForm[f.phone][key] ?? 0) + 1;
          if (f.phone === "ɔ") {
            oTotal++;
            if (f.surface === "aw" && cluster) awCluster++;
            if (f.surface === "au" && !f.split) {
              expect(closed, word.written.clean).toBe(true);
              if (cluster) auCluster++;
            }
          }
          if (f.phone === "əʊ") {
            ouTotal++;
            if (f.surface === "ow" && closed) owClosed++;
            if (f.surface === "oa" && !f.split) {
              expect(closed, word.written.clean).toBe(true);
              if (cluster) oaCluster++;
            }
          }
          if (f.phone === "i:") {
            iTotal++;
            if (f.surface === "ee" && !f.split) eeSurface++;
          }
        }
      }
      expect(kept).toBe(PER_SEED);
    }

    function share(phone: string, form: string): number {
      const row = byPhoneForm[phone] ?? {};
      const n = Object.values(row).reduce((a, b) => a + b, 0) || 1;
      return (row[form] ?? 0) / n;
    }

    // Surface bands (isolated-weight lever; silentE rewrites counted as +e).
    expect(share("ɛ", "ea")).toBeGreaterThan(0.05);
    expect(share("ɛ", "ea")).toBeLessThan(0.20);
    expect(share("ʊ", "oo")).toBeGreaterThan(0.45);
    expect(share("ʊ", "oo")).toBeLessThan(0.80);
    expect(share("ɔ", "aw")).toBeGreaterThan(0.05);
    expect(share("ɔ", "aw")).toBeLessThan(0.40);
    // #455: the uninflected CMU comparator has 18.8% oa among /əʊ/ forms
    // and 11.2% au among /ɔ/ forms. Count the surviving digraphs.
    expect(share("əʊ", "oa")).toBeGreaterThan(0.08);
    expect(share("əʊ", "oa")).toBeLessThan(0.35);
    expect(share("ɔ", "au")).toBeGreaterThan(0.04);
    expect(share("ɔ", "au")).toBeLessThan(0.22);
    expect(oaCluster).toBeGreaterThan(0);
    expect(auCluster).toBeGreaterThan(0);
    // /aɪ/ "ai" must stay unlicensed on monos.
    expect(share("aɪ", "ai") + share("aɪ", "ai+e")).toBe(0);

    // aw before consonant clusters: comparator ~0%. The count is about 5 of
    // ~850 /ɔ/ per seed triple, so the bound is calibrated like the phoneme
    // gate (worst + 3 SD, rounded outward): on main 81df038c, 30 triples
    // (seeds 1000–1089) gave mean 0.58%, SD 0.22%, worst 0.94%, and this
    // triple 0.92%. A 1% bound failed spelling-only RNG reshuffles.
    expect(oTotal).toBeGreaterThan(0);
    expect(awCluster / oTotal).toBeLessThan(0.016);

    // Closed-syllable surface "ow" for /əʊ/: comparator ~4% of /əʊ/ (single only).
    expect(ouTotal).toBeGreaterThan(0);
    expect(owClosed / ouTotal).toBeLessThan(0.08);

    // /i:/ "ee" must appear on monos (was zeroed before iso weights).
    expect(iTotal).toBeGreaterThan(0);
    expect(eeSurface / iTotal).toBeGreaterThan(0.10);
  });
});
