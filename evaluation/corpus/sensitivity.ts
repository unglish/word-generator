import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { isDeepStrictEqual } from "node:util";
import { sha256 } from "../review/wordlikeness/model.js";
import { openOriginalArchive, originalDraws, ORIGINAL_MANIFEST_DIGEST, readPinnedArchiveJson } from "./archive.js";
import { addCount, addSpelling, histogram } from "./joint.js";
import { JOINT_SOURCE_PATHS, validateJointEnvelope, type JointEnvelope } from "./joint-artifact.js";
import { jsonDigest } from "./identity.js";

type Counts = Record<string, number>;
interface Distance { jensenShannonBits: number | null; missingReferenceMass: number | null; unseenGeneratedMass: number | null }
type Measure = (generated: Counts, reference: Counts) => Distance;
const SENSITIVITY_SOURCES = ["evaluation/corpus/archive.ts", "evaluation/corpus/sensitivity.ts", "evaluation/corpus/sensitivity-cli.ts", "evaluation/corpus/identity.ts", "evaluation/corpus/joint.ts", "evaluation/corpus/joint-artifact.ts", "evaluation/corpus/cmu.ts", "evaluation/review/wordlikeness/model.ts"];
const GENERATED_PROJECTION = {
  id: "legacy-generator-surface-sound-comparison-v1",
  aspiration: "remove-literal-U+02B0-from-sound",
  aliases: { "ɚ": "ɜ", "ʌ": "ə" },
  loss: "aspiration-and-listed-identity-distinctions-merged; stress-not-compared; ambiguous-ɜ-retained",
} as const;
function same(actual: unknown, expected: unknown, message: string): void { if (!isDeepStrictEqual(actual, expected)) throw new Error(message); }
function newCounts() {
  return { words: 0, characters: { letters: histogram(), bigrams: histogram(), trigrams: histogram() },
    lengths: { written: histogram(), phones: histogram(), syllables: histogram() },
    phones: { raw: histogram(), comparison: histogram() }, aspirationEvents: 0,
    projectionPaths: {} as Record<string, { output: string; count: number }> };
}
const sum = (counts: Counts): number => Object.values(counts).reduce((a, b) => a + b, 0);

/** Two references score the same archived words. There is no candidate generation. */
export async function writeSensitivity(root: string, baseline: string, referencePath: string, distancePath: string, out: string): Promise<void> {
  const sourceFiles = await Promise.all(SENSITIVITY_SOURCES.map(async path => ({ path, content: await readFile(resolve(root, path), "utf8") })));
  const referenceBytes = await readFile(referencePath, "utf8");
  const envelope = JSON.parse(referenceBytes) as JointEnvelope;
  const expectedSources = await Promise.all(JOINT_SOURCE_PATHS.map(async path => ({ path, content: await readFile(resolve(root, path), "utf8") })));
  validateJointEnvelope(envelope, expectedSources);
  const { artifact } = envelope, { reference } = artifact;
  const archive = await openOriginalArchive(baseline);
  const legacy = <T>(name: string): T => JSON.parse(archive.sources.references.find(file => file.path === `data/cmu/${name}.json`)!.content) as T;
  same(archive.sources.references, [...artifact.legacy.artifacts].sort((a, b) => a.path.localeCompare(b.path, "en")), "Joint legacy files differ from the original benchmark reference bytes.");
  const normalization = legacy<{ generatedAliases: Record<string, string> }>("phoneme-normalization");
  same(normalization.generatedAliases, GENERATED_PROJECTION.aliases, "Generated comparison aliases changed.");
  const distanceSource = archive.sources.evaluator.find(file => file.path === "evaluation/quality/distribution.ts")!;
  same(await readFile(distancePath, "utf8"), distanceSource.content, "Distance module is not the original frozen evaluator.");
  const { distributionDistance } = await import(pathToFileURL(distancePath).href) as { distributionDistance: Measure };
  const saved = await readPinnedArchiveJson<Record<string, { phonemes: Counts; trigrams: Counts }>>(baseline, archive.manifest, "distributions.json.gz");
  const legacyLengths = legacy<{ total: number; byLen: Counts; bySyl: Counts }>("cmu-length-baseline");
  const references = {
    letters: { legacy: legacy<Counts>("cmu-lexicon-letters"), joint: reference.characters.letters.counts },
    bigrams: { legacy: legacy<Counts>("cmu-lexicon-bigrams"), joint: reference.characters.bigrams.counts },
    trigrams: { legacy: legacy<Counts>("cmu-lexicon-trigrams"), joint: reference.characters.trigrams.counts },
    writtenLength: { legacy: legacyLengths.byLen, joint: reference.lengths.written.counts },
    syllables: { legacy: legacyLengths.bySyl, joint: reference.lengths.syllables.counts },
    phones: { legacy: legacy<Counts>("cmu-lexicon-phonemes"), joint: artifact.comparisonProjection.mapped.counts },
  };
  const compare = (counts: ReturnType<typeof newCounts>) => {
    const generated = { letters: counts.characters.letters.counts, bigrams: counts.characters.bigrams.counts,
      trigrams: counts.characters.trigrams.counts, writtenLength: counts.lengths.written.counts,
      syllables: counts.lengths.syllables.counts, phones: counts.phones.comparison.counts };
    return Object.fromEntries(Object.entries(references).map(([name, views]) => {
      const values = generated[name as keyof typeof generated], oldScore = distributionDistance(values, views.legacy), newScore = distributionDistance(values, views.joint);
      return [name, { generatedEvents: sum(values), legacy: oldScore, joint: newScore,
        deltaJointMinusLegacy: Object.fromEntries(Object.keys(oldScore).map(key => {
          const before = oldScore[key as keyof Distance], after = newScore[key as keyof Distance];
          return [key, before === null || after === null ? null : after - before];
        })) }];
    }));
  };
  const profiles = [];
  for (const profile of archive.manifest.protocol.profiles) {
    const counts = newCounts(), streams = [];
    for (const seed of profile.seeds.development) {
      const stream = newCounts();
      for await (const { word } of originalDraws(baseline, archive.manifest, profile.id, seed)) {
        const spelling = word.written.clean.toLowerCase();
        if (!/^[a-z]+$/.test(spelling)) throw new Error("Non-ASCII spelling needs an explicit missing-data policy.");
        const phones = word.syllables.flatMap(syllable => [...syllable.onset, ...syllable.nucleus, ...syllable.coda]);
        for (const target of [counts, stream]) {
          target.words++; addSpelling(target.characters, spelling);
          addCount(target.lengths.written, String(word.written.clean.length)); addCount(target.lengths.phones, String(phones.length));
          addCount(target.lengths.syllables, String(word.syllables.length));
          for (const phone of phones) {
            const deaspirated = phone.sound.replace(/ʰ/g, "");
            const normalized = GENERATED_PROJECTION.aliases[deaspirated as keyof typeof GENERATED_PROJECTION.aliases] ?? deaspirated;
            addCount(target.phones.raw, phone.sound); addCount(target.phones.comparison, normalized);
            if (deaspirated !== phone.sound) target.aspirationEvents++;
            const path = target.projectionPaths[phone.sound] ??= { output: normalized, count: 0 }; path.count++;
          }
        }
      }
      streams.push({ seed, counts: stream, sensitivity: compare(stream) });
    }
    same(counts.phones.comparison.counts, saved[profile.id].phonemes, "Frozen phone counts do not reproduce.");
    same(counts.characters.trigrams.counts, saved[profile.id].trigrams, "Frozen trigram counts do not reproduce.");
    const summary = archive.summary.profiles.find(item => item.id === profile.id)!;
    same(counts.words, summary.words, "Frozen word count differs.");
    same(counts.lengths.phones.counts, summary.phonemeLengths, "Frozen phone-length counts differ.");
    same(counts.lengths.syllables.counts, summary.syllableCounts, "Frozen syllable counts differ.");
    profiles.push({ id: profile.id, counts, streams, sensitivity: compare(counts) });
    console.log(`${profile.id}: ${counts.words} archived draws verified and compared`);
  }
  const report = {
    version: "cmu-reference-sensitivity-v1", interpretation: "reference-sensitivity-only; identical-generated-draws; no-output-quality-claim",
    baseline: { manifestDigest: ORIGINAL_MANIFEST_DIGEST, manifest: archive.manifest },
    reference: { artifactDigest: envelope.digest, fileSha256: sha256(referenceBytes), population: reference.population,
      legacyReferenceDigest: archive.manifest.referenceDigest },
    evaluator: { implementationDigest: jsonDigest(sourceFiles), sources: sourceFiles, frozenDistance: { ...distanceSource, sha256: sha256(distanceSource.content) } },
    generatedProjection: { ...GENERATED_PROJECTION, digest: jsonDigest(GENERATED_PROJECTION) },
    referenceTables: references,
    referenceUnits: { characters: "integer-character-occurrences", jointLengths: "integer-selected-entry-counts", legacyLengths: "integer-pronunciation-line-counts",
      jointPhones: "integer-phone-occurrences", legacyPhones: "rounded-percentage; corpus-event-denominator-unknown", legacyPhoneWeightSum: sum(references.phones.legacy) },
    limitations: ["No source token frequency or root/familiarity/POS labels", "CMU includes names, loans and inflected forms", "Bare generator roots are not matched dictionary stems",
      "Phone comparison uses a lossy legacy projection, not a dialect or identity judgment", "Five stream results are descriptive, not confidence intervals"],
    profiles,
  };
  for (const source of [...sourceFiles, ...expectedSources]) same(await readFile(resolve(root, source.path), "utf8"), source.content, "Analysis source changed during comparison.");
  same(await readFile(distancePath, "utf8"), distanceSource.content, "Frozen distance changed during comparison.");
  same(await readFile(referencePath, "utf8"), referenceBytes, "Reference changed during comparison.");
  await writeFile(out, JSON.stringify({ digest: jsonDigest(report), report }) + "\n", { flag: "wx" });
}
