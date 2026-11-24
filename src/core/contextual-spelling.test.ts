import { beforeAll, describe, expect, it } from "vitest";
import { createSeededRng, generateWords } from "../index.js";
import type { BaseSpellingTrace, SpellingPhone } from "../index.js";

const CK_OR_K_NEIGHBOURS = new Set(["b", "d", "f", "g", "h", "m", "n", "p"]);
const OW_NEIGHBOURS = new Set(["n", "l", "d", "z", "r"]);
const TARGETS = new Set(["k", "aʊ", "j", "dʒ"]);

interface Realization {
  phone: SpellingPhone;
  next?: SpellingPhone;
  codaLength: number;
  selected: string;
  written?: string;
}

function surfaceSpellings(base: BaseSpellingTrace): Map<number, string> {
  const spellings = new Map<number, string>();
  for (const { origin, text } of base.cells) {
    if (origin.kind === "rewrite") continue;
    spellings.set(origin.unitId, (spellings.get(origin.unitId) ?? "") + text);
  }
  return spellings;
}

describe("English contextual spelling (#501)", () => {
  const realized: Realization[] = [];

  beforeAll(() => {
    const rand = createSeededRng(20261123);
    for (let batch = 0; batch < 40; batch++) {
      for (const { trace, lexical } of generateWords(500, { rand, trace: true })) {
        const base = trace!.baseSpelling!;
        const surface = surfaceSpellings(base);
        for (const unit of base.units) {
          const phone = base.phones[unit.phoneIds[0]];
          if (!TARGETS.has(phone.soundAtSpelling)) continue;
          realized.push({
            phone,
            next: base.phones[phone.id + 1],
            codaLength: lexical!.root[phone.syllableIndex].coda.length,
            selected: unit.selected,
            written: surface.get(unit.id),
          });
        }
      }
    }
  }, 30_000);

  it("uses ck and k at medial joins while retaining common ct spellings", () => {
    const medial = realized.filter(({ phone, next }) =>
      phone.soundAtSpelling === "k" && phone.segment === "coda" && next?.segment === "onset");
    const alternatives = ({ written }: Realization) => written === "ck" || written === "k";
    const preferred = medial.filter(({ next, codaLength }) =>
      codaLength === 1 && CK_OR_K_NEIGHBOURS.has(next!.soundAtSpelling));
    const beforeT = medial.filter(({ next }) => next!.soundAtSpelling === "t");
    expect(medial.length).toBeGreaterThan(400);
    expect(medial.filter(alternatives).length / medial.length).toBeGreaterThan(0.2);
    expect(preferred.length).toBeGreaterThan(100);
    expect(preferred.filter(alternatives).length / preferred.length).toBeGreaterThan(0.6);
    expect(beforeT.length).toBeGreaterThan(100);
    expect(beforeT.filter(r => r.written === "c").length / beforeT.length).toBeGreaterThan(0.7);
  });

  it("reserves /aʊ/ ow for licensed contexts, including open ends and clusters", () => {
    const aw = realized.filter(r => r.phone.soundAtSpelling === "aʊ");
    const restricted = aw.filter(({ next }) =>
      next && next.segment !== "nucleus" && !OW_NEIGHBOURS.has(next.soundAtSpelling));
    expect(restricted.length).toBeGreaterThan(75);
    expect(restricted.filter(r => r.selected === "ow" || r.written === "ow")).toEqual([]);
    expect(aw.filter(r => !r.next && r.written === "ow").length).toBeGreaterThan(30);
    expect(aw.filter(r => r.codaLength > 1 && r.written === "ow").length).toBeGreaterThan(0);
  });

  it("writes the glide /j/ with y and retains j for the affricate", () => {
    const glide = realized.filter(r => r.phone.soundAtSpelling === "j");
    expect(glide.filter(r => r.written === "y").length).toBeGreaterThan(400);
    expect(glide.filter(r => r.selected === "j" || r.written === "j")).toEqual([]);
    expect(realized.filter(r => r.phone.soundAtSpelling === "dʒ" && r.written === "j").length).toBeGreaterThan(50);
  });
});
