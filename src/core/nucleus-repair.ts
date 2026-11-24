import type { StressRules, UnstressedRootNuclei } from "../config/language.js";
import type { Phoneme, Syllable, WordGenerationContext } from "../types.js";
import getWeightedOption from "../utils/getWeightedOption.js";
import {
  isCheckedOpenFinalAllowed,
  isNucleusWordPositionAllowed,
  nucleusWordEdges,
  nucleusWordPositionWeight,
} from "./nucleus-position.js";
import type { WordEdges } from "./nucleus-position.js";
import { permitsRootNucleus } from "./rime-compatibility.js";
import type { RootRimePolicy } from "./rime-compatibility.js";
import type { MorphologyPlan } from "./morphology/plan.js";

export interface NucleusRepairPolicy {
  readonly phonemes: readonly Phoneme[];
  readonly stress: StressRules;
  readonly rimes: RootRimePolicy;
  readonly forbidOpenCheckedFinal: boolean;
}

interface RootSpan {
  readonly syllables: readonly Syllable[];
  readonly start: number;
}

type RepairRule = "repairStressedNuclei" | "repairFinalStressedNuclei" | "repairNucleusWordPositions" | "repairNucleusRime";

function permitsWordPosition(phoneme: Phoneme, edges: WordEdges, policy: NucleusRepairPolicy): boolean {
  return isNucleusWordPositionAllowed(phoneme, edges)
    && (!policy.forbidOpenCheckedFinal || isCheckedOpenFinalAllowed(phoneme, edges));
}

function positionWeight(phoneme: Phoneme, edges: WordEdges, initialSyllable: boolean, finalSyllable: boolean): number {
  const configured = nucleusWordPositionWeight(phoneme, edges);
  if (configured !== undefined) return configured;
  if ((initialSyllable && phoneme.startWord <= 0) || (finalSyllable && phoneme.endWord <= 0)) return 0;
  return (initialSyllable && phoneme.startWord) || (finalSyllable && phoneme.endWord) || phoneme.midWord || 1;
}

function replaceNucleus(
  context: WordGenerationContext,
  policy: NucleusRepairPolicy,
  root: RootSpan,
  syllableIndex: number,
  nucleusIndex: number,
  rule: RepairRule,
): void {
  const word = context.word.syllables;
  const syllable = word[syllableIndex];
  const rootIndex = syllableIndex - root.start;
  const rootSyllable = root.syllables[rootIndex];
  const followingOnset = nucleusIndex === (rootSyllable?.nucleus.length ?? 0) - 1
    ? root.syllables[rootIndex + 1]?.onset
    : undefined;
  const edges = nucleusWordEdges(syllable, syllableIndex, word.length, nucleusIndex);
  const stressRepair = rule === "repairStressedNuclei" || rule === "repairFinalStressedNuclei";
  const stressBan = syllable.stress === "ˈ" ? policy.stress.nucleus.stressedNucleusBan : undefined;
  const options: [Phoneme, number][] = [];
  let positivePairExclusions = 0;
  let totalWeight = 0;

  for (const phoneme of policy.phonemes) {
    if (stressBan?.includes(phoneme.sound) || !permitsWordPosition(phoneme, edges, policy)) continue;
    const weight = stressRepair
      ? phoneme.nucleus ?? 1
      : (phoneme.nucleus ?? 0) * positionWeight(phoneme, edges, syllableIndex === 0, syllableIndex === word.length - 1);
    if (!Number.isFinite(weight) || weight <= 0) continue;
    if (rootSyllable && !permitsRootNucleus(phoneme.sound, rootSyllable, followingOnset, policy.rimes)) {
      positivePairExclusions++;
      continue;
    }
    options.push([phoneme, weight]);
    totalWeight += weight;
  }
  if (!options.length || !Number.isFinite(totalWeight)) {
    const segment = stressRepair ? "stressed nucleus" : "nucleus";
    throw new Error(`No eligible ${segment} with finite positive weight for the realized lexical-root position and retained coda.`);
  }
  const original = syllable.nucleus[nucleusIndex];
  const replacement = getWeightedOption(options, context.rand);
  syllable.nucleus[nucleusIndex] = replacement;
  const detail = stressRepair
    ? `replaced banned stressed nucleus /${original.sound}/`
    : `base syllable ${syllableIndex}, nucleus ${nucleusIndex}; segment initial=${edges.initial}, final=${edges.final}`;
  context.trace?.recordRepair(rule, original.sound, replacement.sound, detail,
    rootSyllable ? {
      domain: "lexical-root", syllableIndex: rootIndex, nucleusIndex,
      coda: rootSyllable.coda.map(phoneme => phoneme.sound), edges,
      weighting: stressRepair ? "nucleus-only" : "nucleus-times-word-position",
      eligibleCandidateEntries: options.length, positivePairExclusions, totalWeight,
    } : undefined);
}

export function repairStressedNuclei(
  context: WordGenerationContext,
  policy: NucleusRepairPolicy,
  retainedRoot?: RootSpan,
): void {
  const ban = policy.stress.nucleus.stressedNucleusBan;
  if (!ban?.length) return;
  const root = retainedRoot ?? { syllables: context.word.syllables, start: 0 };
  const rule = retainedRoot ? "repairFinalStressedNuclei" : "repairStressedNuclei";
  for (const [index, syllable] of context.word.syllables.entries()) {
    const nucleus = syllable.nucleus[0];
    if (syllable.stress === "ˈ" && nucleus && ban.includes(nucleus.sound)) {
      replaceNucleus(context, policy, root, index, 0, rule);
    }
  }
}

export function repairRootNuclei(context: WordGenerationContext, policy: NucleusRepairPolicy): void {
  const syllables = context.word.syllables;
  const root = { syllables, start: 0 };
  for (const [si, syllable] of syllables.entries()) {
    for (const [ni, nucleus] of syllable.nucleus.entries()) {
      const edges = nucleusWordEdges(syllable, si, syllables.length, ni);
      const followingOnset = ni === syllable.nucleus.length - 1 ? syllables[si + 1]?.onset : undefined;
      if (!permitsWordPosition(nucleus, edges, policy)) {
        replaceNucleus(context, policy, root, si, ni, "repairNucleusWordPositions");
      } else if (!permitsRootNucleus(nucleus.sound, syllable, followingOnset, policy.rimes)) {
        replaceNucleus(context, policy, root, si, ni, "repairNucleusRime");
      }
    }
  }
}

function alternateUnstressedNucleus(
  context: WordGenerationContext,
  policy: NucleusRepairPolicy,
  index: number,
  alternations: UnstressedRootNuclei,
): void {
  const syllables = context.word.syllables;
  const syllable = syllables[index];
  if (syllable.stress || syllable.nucleus.length !== 1) return;
  const codaInitial = syllable.coda[0]?.sound;
  if (codaInitial && alternations.preserveCodaInitials?.includes(codaInitial)) return;

  const rules = index === 0 ? alternations.initial : alternations.final;
  const source = syllable.nucleus[0].sound;
  const rule = rules.find(alternation => alternation.source === source);
  if (!rule) return;

  const neighbor = syllables[index === 0 ? 1 : index - 1];
  // This calibration must not add a repeated nucleus to the lexical root.
  if (rule.target === neighbor.nucleus[0]?.sound) return;

  const edges = nucleusWordEdges(syllable, index, syllables.length, 0);
  const target = policy.phonemes.find(phoneme =>
    phoneme.sound === rule.target && permitsWordPosition(phoneme, edges, policy),
  );
  if (!target || !permitsRootNucleus(target.sound, syllable, syllables[index + 1]?.onset, policy.rimes)) return;
  if (context.rand() * 100 >= rule.probability) return;

  syllable.nucleus[0] = target;
  context.trace?.recordRepair("alternateUnstressedRootNucleus", source, target.sound, `root syllable ${index}`);
}

export function alternateUnstressedRootNuclei(
  context: WordGenerationContext,
  policy: NucleusRepairPolicy,
  alternations: UnstressedRootNuclei,
  affixes?: Pick<MorphologyPlan, "prefix" | "suffix">,
): void {
  const length = context.word.syllables.length;
  if (length < 2) return;
  // An attaching affix can retain or resound the stem vowel at its own edge.
  if (!affixes?.prefix) alternateUnstressedNucleus(context, policy, 0, alternations);
  if (!affixes?.suffix) alternateUnstressedNucleus(context, policy, length - 1, alternations);
}
