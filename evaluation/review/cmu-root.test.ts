import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseCmuRecords, selectCompatibleCmu } from "../corpus/cmu.js";
import { rootAffixes } from "../corpus/root-config.js";
import { stripRoots } from "../corpus/root-stripping.js";

const { arpabetToIpa: ipa } = JSON.parse(readFileSync(new URL("../../data/cmu/phoneme-normalization.json", import.meta.url), "utf8"));
const { entries } = selectCompatibleCmu(parseCmuRecords(`
box B AA1 K S
boxes B AA1 K S AH0 Z
cat K AE1 T
bet B EH1 T
better B EH1 T ER0
good G UH1 D
crackle K R AE1 K AH0 L
crackling K R AE1 K L IH0 NG
unilateral Y UW2 N AH0 L AE1 T ER0 AH0 L
unilaterally Y UW2 N AH0 L AE1 T ER0 AH0 L IY0
cats K AE1 T S
children CH IH1 L D R AH0 N
child CH AY1 L D
red R EH1 D
do D UW1
redo R IY0 D UW1
reredo R IY2 R IY0 D UW1
redos R IY0 D UW1 Z
electric IH0 L EH1 K T R IH0 K
electricity IH0 L EH2 K T R IH1 S AH0 T IY0
face F EY1 S
faces F EY1 S AH0 Z
full F UH1 L
fully F UH1 L IY0
go G OW1
happy HH AE1 P IY0
happily HH AE1 P AH0 L IY0
impossible IH2 M P AA1 S AH0 B AH0 L
possible P AA1 S AH0 B AH0 L
make M EY1 K
making M EY1 K IH0 NG
mike M AY1 K
mikes M AY1 K S
nation N EY1 SH AH0 N
national N AE1 SH AH0 N AH0 L
nationalities N AE2 SH AH0 N AE1 L IH0 T IY0 Z
nationality N AE2 SH AH0 N AE1 L AH0 T IY0
potato P AH0 T EY1 T OW2
potatoes P AH0 T EY1 T OW2 Z
run R AH1 N
running R AH1 N IH0 NG
try T R AY1
tried T R AY1 D
went W EH1 N T
awe AO1
awing AO1 IH0 NG
sprint S P R IH1 N T
sprints S P R IH1 N T S
baked B EY1 K T
sings S IH1 NG S
sing S IH1 NG
`));
const names = new Set(["mike"]);
const common = new Set(entries.map(word => word.spelling).filter(word => !["mike", "sprint"].includes(word)));
const exceptions = new Map([["went", ["go"]], ["children", ["child"]], ["baked", ["bake"]], ["better", ["good"]]]);
const ledger = new Map(stripRoots({ entries, common, names, exceptions, affixes: rootAffixes, ipa })
  .map(row => [row.spelling, row]));

describe("CMU morphology root reference", () => {
  it.each([
    ["cats", "cat", "s", "s", "direct"],
    ["boxes", "box", "s", "es", "direct"],
    ["faces", "face", "s", "s", "shared-e"],
    ["potatoes", "potato", "s", "es", "o-es"],
    ["running", "run", "ing", "ing", "double-consonant"],
    ["tried", "try", "ed", "ed", "y-to-i"],
    ["making", "make", "ing", "ing", "drop-silent-e"],
    ["happily", "happy", "ly", "ly", "y-to-i"],
    ["crackling", "crackle", "ing", "ing", "drop-silent-e"],
    ["unilaterally", "unilateral", "ly", "ly", "direct"],
    ["fully", "full", "ly", "ly", "collapse-triple-letter"],
    ["electricity", "electric", "ity", "ity", "direct"],
    ["impossible", "possible", "in", "im", "direct"],
    ["redo", "do", "re", "re", "direct"],
  ])("strips %s to %s with its observed join", (word, stem, affix, written, join) => {
    expect(ledger.get(word)).toMatchObject({ status: "included", stem, steps: [{ stem, affix, written, join }] });
  });

  it("recurses to an attested terminal root before checking the affix budget", () => {
    expect(ledger.get("nationalities")).toMatchObject({
      status: "too-many-affixes", stem: "nation",
      steps: [
        { affix: "s", written: "es", join: "y-to-i", stem: "nationality" },
        { affix: "ity", stem: "national" },
        { affix: "al", stem: "nation" },
      ],
    });
    expect(ledger.get("nation")).toMatchObject({ status: "included", template: "bare", stem: "nation", steps: [] });
    expect(ledger.get("redos")).toMatchObject({
      status: "included", template: "both", stem: "do", steps: [{ stem: "redo" }, { stem: "do" }],
    });
  });

  it("excludes a chain with two prefixes", () => {
    expect(ledger.get("reredo")).toMatchObject({
      status: "too-many-affixes", stem: "do",
      steps: [{ type: "prefix", stem: "redo" }, { type: "prefix", stem: "do" }],
    });
  });

  it.each([["went", "go"], ["children", "child"], ["baked", "bake"], ["better", "good"]])(
    "records %s as residue with its lexical evidence", (word, lemma) => {
      expect(ledger.get(word)).toMatchObject({ status: "residue", stem: word, steps: [], lemmas: [lemma] });
    },
  );

  it("requires eligible stems and phonologically licensed joins", () => {
    expect(ledger.get("mike")).toMatchObject({ status: "name-or-uppercase", stem: null });
    expect(ledger.get("sprint")).toMatchObject({ status: "outside-common-list", stem: null });
    for (const word of ["red", "mikes", "sprints", "awing", "sings"]) {
      expect(ledger.get(word)).toMatchObject({ status: "included", template: "bare", stem: word, steps: [] });
    }
  });
});
