/**
 * Issue #450 step 4 — locate spelling shortfall mechanisms (probe only).
 * Ungated generator traces vs CMU mono alignments from step3.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import {
  createGenerator,
  englishConfig,
  createSeededRng,
} from "/agent/repos/word-generator/src/index.ts";
import type { LanguageConfig } from "/agent/repos/word-generator/src/types.ts";

const OUT =
  process.env.OUT_DIR ??
  "/cursor/stores/bc-01a13b7c-29e9-792a-a41d-d3389db3cfc3/internal/issue-450/packets/spelling-shortfall";
mkdirSync(OUT, { recursive: true });

const CONSONANT_DIGRAPHS = new Set(["sh", "ch", "th", "ng", "wh", "ph"]);
const DOUBLE_LIKE = new Set(["ck", "tch", "dge"]);
const SEEDS = [42, 43, 44] as const;
const TARGET_KEPT = Number(process.env.TRACE_KEPT ?? 12_000); // per seed pool → ~36k monos

function ungatedConfig(): LanguageConfig {
  return {
    ...englishConfig,
    syllableStructure: {
      ...englishConfig.syllableStructure,
      letterLengthTargets: undefined,
    },
  };
}

type MechAcc = {
  words: number;
  letters: number;
  phones: number;
  silentFinalE: number; // letters
  silentOther: number;
  doublingExtra: number; // extra letters from doubling / ck/tch/dge beyond 1
  vowelPolyExtra: number;
  consDigraphExtra: number;
  otherMultiExtra: number;
  byPos: Record<string, { phones: number; letters: number; multi: number }>;
  examples: Record<string, string[]>;
};

function emptyMech(): MechAcc {
  return {
    words: 0,
    letters: 0,
    phones: 0,
    silentFinalE: 0,
    silentOther: 0,
    doublingExtra: 0,
    vowelPolyExtra: 0,
    consDigraphExtra: 0,
    otherMultiExtra: 0,
    byPos: {
      onset: { phones: 0, letters: 0, multi: 0 },
      nucleus: { phones: 0, letters: 0, multi: 0 },
      coda: { phones: 0, letters: 0, multi: 0 },
    },
    examples: {
      silentFinalE: [],
      doubling: [],
      vowelPoly: [],
      consDigraph: [],
      otherMulti: [],
    },
  };
}

function pushEx(acc: MechAcc, key: string, word: string) {
  const list = acc.examples[key];
  if (list && list.length < 8 && !list.includes(word)) list.push(word);
}

const gen = createGenerator(ungatedConfig());
const genMech = emptyMech();
const genDiMech = emptyMech();

function observeGen(acc: MechAcc, word: ReturnType<typeof gen.generateWord>, sylCount: number) {
  if (word.syllables.length !== sylCount) return false;
  const spelling = word.written.clean;
  const selections = word.trace?.graphemeSelections ?? [];
  if (!selections.length) return false;

  acc.words++;
  acc.letters += spelling.length;

  let phoneLetters = 0;
  for (const g of selections) {
    const form = (g.emitted || g.selected || "").toLowerCase();
    if (!form) continue;
    acc.phones++;
    phoneLetters += form.length;
    const pos = g.position === "onset" || g.position === "nucleus" || g.position === "coda" ? g.position : null;
    if (pos) {
      acc.byPos[pos].phones++;
      acc.byPos[pos].letters += form.length;
      if (form.length > 1) acc.byPos[pos].multi++;
    }
    const doubled = Boolean(g.doubled) || form !== (g.selected || "").toLowerCase();
    if (doubled || DOUBLE_LIKE.has(form) || /([a-z])\1/.test(form)) {
      acc.doublingExtra += Math.max(0, form.length - 1);
      pushEx(acc, "doubling", spelling);
    } else if (pos === "nucleus" && form.length >= 2) {
      acc.vowelPolyExtra += form.length - 1;
      pushEx(acc, "vowelPoly", spelling);
    } else if (CONSONANT_DIGRAPHS.has(form)) {
      acc.consDigraphExtra += form.length - 1;
      pushEx(acc, "consDigraph", spelling);
    } else if (form.length >= 2) {
      acc.otherMultiExtra += form.length - 1;
      pushEx(acc, "otherMulti", spelling);
    }
  }

  // Silent letters = surface letters not in emitted grapheme units
  const emittedConcat = selections.map((g) => (g.emitted || g.selected || "").toLowerCase()).join("");
  // silent e and repairs may add letters after selections
  if (spelling.endsWith("e") && !emittedConcat.endsWith("e")) {
    // count trailing e not in selections
    let silentE = 0;
    let i = spelling.length - 1;
    const emit = emittedConcat;
    // compare from end
    if (spelling.length > emit.length) {
      const extra = spelling.slice(emit.length);
      if (extra.endsWith("e")) {
        silentE = (extra.match(/e$/g) || []).length;
        // more carefully: number of e in extra suffix
        silentE = [...extra].filter((ch) => ch === "e").length;
        // if extra is just "e"
        if (extra === "e") silentE = 1;
      }
    }
    // Fallback: orthographic magic-e / silentE — if surface has final e and last selection isn't e
    if (spelling.endsWith("e") && !emittedConcat.endsWith("e")) {
      silentE = Math.max(silentE, 1);
    }
    if (silentE) {
      acc.silentFinalE += silentE;
      pushEx(acc, "silentFinalE", spelling);
    }
  } else if (spelling.length > phoneLetters) {
    acc.silentOther += spelling.length - phoneLetters;
  }

  return true;
}

for (const seed of SEEDS) {
  const rand = createSeededRng(seed);
  let kept = 0;
  let keptDi = 0;
  // draw until we have TARGET_KEPT monos; also collect dis along the way
  let draws = 0;
  const maxDraws = TARGET_KEPT * 20;
  while ((kept < TARGET_KEPT || keptDi < TARGET_KEPT) && draws < maxDraws) {
    draws++;
    const word = gen.generateWord({ rand, mode: "lexicon", morphology: false, trace: true });
    if (word.syllables.length === 1 && kept < TARGET_KEPT) {
      if (observeGen(genMech, word, 1)) kept++;
    } else if (word.syllables.length === 2 && keptDi < TARGET_KEPT) {
      if (observeGen(genDiMech, word, 2)) keptDi++;
    }
  }
  console.error(`[trace] seed=${seed} mono=${kept} di=${keptDi} draws=${draws}`);
}

// CMU mono from step3 alignments
const aligned = JSON.parse(readFileSync(`${OUT}/step3-mono-aligned.json`, "utf8")) as {
  spelling: string;
  units: [string, string, string | null, string, number][];
}[];

const cmuMech = emptyMech();
for (const row of aligned) {
  cmuMech.words++;
  cmuMech.letters += row.spelling.length;
  for (const [kind, form, phoneme, position, letters] of row.units) {
    if (kind === "silent-final-e") {
      cmuMech.silentFinalE += letters;
      pushEx(cmuMech, "silentFinalE", row.spelling);
    } else if (kind === "silent-e-before-coda") {
      cmuMech.silentFinalE += letters; // count with silent-e family
      pushEx(cmuMech, "silentFinalE", row.spelling);
    } else if (kind.startsWith("silent")) {
      cmuMech.silentOther += letters;
    } else if (kind === "geminate-extra") {
      cmuMech.doublingExtra += letters;
      pushEx(cmuMech, "doubling", row.spelling);
    } else if (position === "onset" || position === "nucleus" || position === "coda") {
      if (phoneme) cmuMech.phones++;
      cmuMech.byPos[position].phones++;
      cmuMech.byPos[position].letters += letters;
      if (letters > 1) cmuMech.byPos[position].multi++;
      if (DOUBLE_LIKE.has(form) || /([a-z])\1/.test(form)) {
        cmuMech.doublingExtra += Math.max(0, letters - 1);
        pushEx(cmuMech, "doubling", row.spelling);
      } else if (position === "nucleus" && letters >= 2) {
        cmuMech.vowelPolyExtra += letters - 1;
        pushEx(cmuMech, "vowelPoly", row.spelling);
      } else if (CONSONANT_DIGRAPHS.has(form)) {
        cmuMech.consDigraphExtra += letters - 1;
        pushEx(cmuMech, "consDigraph", row.spelling);
      } else if (letters >= 2) {
        cmuMech.otherMultiExtra += letters - 1;
        pushEx(cmuMech, "otherMulti", row.spelling);
      }
    }
  }
}

function perWord(acc: MechAcc) {
  const w = acc.words || 1;
  return {
    words: acc.words,
    letterMean: acc.letters / w,
    phoneMean: acc.phones / w,
    silentFinalE: acc.silentFinalE / w,
    silentOther: acc.silentOther / w,
    doublingExtra: acc.doublingExtra / w,
    vowelPolyExtra: acc.vowelPolyExtra / w,
    consDigraphExtra: acc.consDigraphExtra / w,
    otherMultiExtra: acc.otherMultiExtra / w,
    byPos: Object.fromEntries(
      Object.entries(acc.byPos).map(([k, v]) => [
        k,
        {
          meanLPerPhone: v.phones ? v.letters / v.phones : null,
          multiShare: v.phones ? v.multi / v.phones : null,
          phones: v.phones,
        },
      ]),
    ),
    examples: acc.examples,
  };
}

const cmuPw = perWord(cmuMech);
const genPw = perWord(genMech);
const genDiPw = perWord(genDiMech);

// Contributions = CMU rate − gen rate (positive = CMU has more of that extra-letter source)
const contributions = {
  silent_e_family: cmuPw.silentFinalE - genPw.silentFinalE,
  silent_other: cmuPw.silentOther - genPw.silentOther,
  doubling_ck_tch_dge: cmuPw.doublingExtra - genPw.doublingExtra,
  vowel_polygraph: cmuPw.vowelPolyExtra - genPw.vowelPolyExtra,
  consonant_digraph: cmuPw.consDigraphExtra - genPw.consDigraphExtra,
  other_multiletter: cmuPw.otherMultiExtra - genPw.otherMultiExtra,
};

const contribSum = Object.values(contributions).reduce((a, b) => a + b, 0);

// Gaps from step1/step2
const step1 = JSON.parse(readFileSync(`${OUT}/step1-ungated-lgp.json`, "utf8"));
const step2 = JSON.parse(readFileSync(`${OUT}/step2-inflection.json`, "utf8"));
const gapAll = -step1.mono.letterMean.gap; // positive shortfall
const gapNeither = -step2.gaps.ungatedBareVsNeitherCmu.letterMeanGap;

const packet = {
  meta: {
    arm: "ungated",
    traceKeptPerSeedTarget: TARGET_KEPT,
    seeds: [...SEEDS],
    cmuAlignedN: cmuMech.words,
    note: "Mechanism extras are letters beyond one-per-phone (or silent units). Contribution = CMU_per_word − gen_per_word.",
  },
  positional: {
    cmuMono: cmuPw.byPos,
    genMono: genPw.byPos,
    genDi: genDiPw.byPos,
  },
  ratesPerWord: {
    cmuMono: cmuPw,
    genMono: genPw,
    genDi: genDiPw,
  },
  contributionsLettersPerWord: contributions,
  contributionSum: contribSum,
  targetGapNeither: gapNeither,
  targetGapAllCmu: gapAll,
  residualVsNeither: gapNeither - contribSum,
  residualVsAll: gapAll - contribSum,
  governingCode: {
    silentFinalE: "src/config/english.ts silentE; src/core/write.ts applySilentE (2× rate for monosyllables)",
    magicE: "src/config/english.ts spellingRules name magic-e",
    doubling: "src/config/english.ts doubling; src/core/spelling-doubling.ts tryDoubling; src/elements/graphemes/doubling.ts",
    ck_tch_dge: "src/elements/graphemes/stops.ts (ck); affricates.ts (tch, dge)",
    vowelPolygraphs: "src/elements/graphemes/vowels.ts, diphthongs.ts; selection src/core/grapheme-selection.ts",
    consonantDigraphs: "src/elements/graphemes/fricatives.ts, nasals.ts, glides.ts, affricates.ts",
  },
};

writeFileSync(`${OUT}/step4-mechanisms.json`, JSON.stringify(packet, null, 2));
console.log(
  JSON.stringify(
    {
      genMonoWords: genPw.words,
      cmuWords: cmuPw.words,
      rates: {
        silentE: { cmu: cmuPw.silentFinalE, gen: genPw.silentFinalE },
        doubling: { cmu: cmuPw.doublingExtra, gen: genPw.doublingExtra },
        vowelPoly: { cmu: cmuPw.vowelPolyExtra, gen: genPw.vowelPolyExtra },
        consDigraph: { cmu: cmuPw.consDigraphExtra, gen: genPw.consDigraphExtra },
        otherMulti: { cmu: cmuPw.otherMultiExtra, gen: genPw.otherMultiExtra },
        silentOther: { cmu: cmuPw.silentOther, gen: genPw.silentOther },
      },
      contributions,
      sum: contribSum,
      gapNeither,
      residual: gapNeither - contribSum,
      positional: packet.positional,
    },
    null,
    2,
  ),
);
