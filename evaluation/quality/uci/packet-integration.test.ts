import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { captureRun } from "../capture.js";
import { git } from "../git.js";
import type { Protocol } from "../model.js";
import { writePacket, type DrawEvidence, type Packet } from "./packet.js";
import { loadReference, ROOT } from "./reference.js";
import { renderPacket } from "./report.js";

async function captureFixture(protocol: Protocol, configOverrides: string) {
  const directory = await mkdtemp(join(tmpdir(), "unglish-uci-packet-"));
  const generator = join(directory, "generator");
  const before = join(directory, "before"), after = join(directory, "after"), out = join(directory, "packet");
  const protocolPath = join(directory, "protocol.json");
  try {
    await writeFile(protocolPath, JSON.stringify(protocol));
    await cp(join(ROOT, "src"), join(generator, "src"), { recursive: true });
    await writeFile(join(generator, "package.json"), JSON.stringify({ type: "module" }));
    await writeFile(join(generator, "src/index.ts"), `
import { englishConfig as original } from "./config/english.js";
import { createGenerator } from "./core/generate.js";
export { createSeededRng } from "./utils/random.js";
export const englishConfig = { ...original, ${configOverrides} };
export const { generateWord } = createGenerator(englishConfig);
`);
    git(generator, "init", "-q");
    git(generator, "add", "src", "package.json");
    git(generator, "-c", "user.name=Quality Test", "-c", "user.email=quality@example.invalid", "-c", "commit.gpgsign=false",
      "commit", "--no-verify", "-qm", protocol.id);
    await captureRun({ root: ROOT, protocol, cohort: "development", out: before, id: "fixture-before" });
    await captureRun({ root: ROOT, protocol, cohort: "development", generatorRoot: generator, out: after, id: "fixture-after" });
    await writePacket({ before, after, protocolPath, engineLabels: { before: "legacy-weighted" } }, out);
    const packet: Packet = JSON.parse(await readFile(join(out, "packet.json"), "utf8"));
    const markdown = await readFile(join(out, "packet.md"), "utf8");
    return { packet, markdown };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

it("carries an aspiration-only change from public generator captures through both packet formats", async () => {
  const protocol: Protocol = {
    schemaVersion: 1, id: "aspiration-fixture", wordsPerReplicate: 12, reviewDrawsPerReplicate: 1,
    profiles: [{ id: "lexicon-default", options: { mode: "lexicon", morphology: true },
      seeds: { development: [69212153, 43], validation: [44, 45] } }],
  };
  const { packet, markdown } = await captureFixture(protocol, `
    pronunciation: { ...original.pronunciation, aspiration: { ...original.pronunciation.aspiration, fallbackProbability: 0,
      rules: original.pronunciation.aspiration.rules.map(rule => ({ ...rule, probability: 0 })) } }`);
  const ipaChanges = packet.draws.filter(draw => draw.before.ipa !== draw.after.ipa);
  expect(pairKey(packet.draws[1])).toEqual({
    profile: "lexicon-default", seed: 69212153, drawIndex: 1, random: { scheme: "stage-streams/1", key: "3af246b906060881" },
  });
  expect(ipaChanges.length).toBeGreaterThan(0);
  expect(packet.summaries.pooled.outputChanges.overall).toMatchObject({
    draws: 24, any: ipaChanges.length, ipa: ipaChanges.length, spelling: 0, projectedPhones: 0, comparableProjections: 24,
  });
  expect(packet.changedDraws.map(change => packet.draws[change.rowIndex])).toEqual(ipaChanges);
  expect(packet.changedDraws.every(change => change.fields.join() === "ipa")).toBe(true);
  const first = ipaChanges[0];
  expect(packet.changedDraws[0].trace.attemptComparison).toEqual({
    scope: "same-attempt", before: first.before.selectedAttempt, after: first.after.selectedAttempt,
  });
  expect(packet.draws.map(draw => draw.before.surface)).toEqual(packet.draws.map(draw => draw.after.surface));
  expect(packet.movers.flatMap(bucket => [...bucket.positive, ...bucket.negative])).toEqual([]);
  expect(packet.generatedPairs.pairs.every(pair => pair.delta === 0)).toBe(true);
  expect(markdown).toContain(`/${first.before.ipa}/`);
  expect(markdown).toContain(`/${first.after.ipa}/`);
  expect(markdown).toContain(`| All | 24 | ${ipaChanges.length} | 0 | ${ipaChanges.length} | 0/24 |`);
  expect(markdown).toContain(`| IPA | Same winning attempt ${first.before.selectedAttempt} ·`);
  expect(markdown).toContain("aspiration events differ");
  expect(markdown).toContain("Higher pair percentile");
  expect(markdown).toContain("All pair counts match");
  expect(packet.captures.before.rootEngine).toEqual({ status: "declared", label: "legacy-weighted" });
  expect(packet.captures.after.rootEngine).toEqual({ status: "unverified" });
});

type PairKey = Pick<DrawEvidence, "profile" | "seed" | "drawIndex" | "random">;
function pairKey({ profile, seed, drawIndex, random }: PairKey): PairKey {
  return { profile, seed, drawIndex, random };
}

it("distinguishes different winning attempts and explains scored movers through both packet formats", async () => {
  // Only the acceptance schedule changes. The stream keys are independent of the words selected.
  const seeds = [8672, 10, 230];
  const protocol: Protocol = {
    schemaVersion: 1, id: "acceptance-fixture", wordsPerReplicate: 1, reviewDrawsPerReplicate: 1,
    profiles: [{ id: "lexicon-default", options: { mode: "lexicon", morphology: false, syllableCount: 1 },
      seeds: { development: seeds, validation: [44, 45] } }],
  };
  const { packet, markdown } = await captureFixture(protocol,
    "syllableStructure: { ...original.syllableStructure, letterLengthRelaxedAfter: { 1: { 2: 0 } } }");
  const keys = ["d0fe2239bb0cec68", "80828c69eae06a4e", "4dd9af6811c9eaa9"].map((key, i) => ({
    profile: "lexicon-default", seed: seeds[i], drawIndex: 0, random: { scheme: "stage-streams/1", key },
  }));
  expect(packet.schemaVersion).toBe(3);
  expect(packet.guide.bySeed.map(seed => seed.seed)).toEqual(seeds);
  expect(packet.guide.pooled.before.draws).toBe(seeds.length);
  expect(packet.metric.guide.rarePair.reference).toEqual({ numerator: 488, denominator: 45904, rate: 488 / 45904 });
  expect(markdown).toContain("## Guide metrics");
  for (const draw of packet.draws) {
    for (const side of [draw.before, draw.after]) {
      if (side.surface.kind !== "scored") throw new Error("Fixture draws should project.");
      expect(markdown).toContain(`T ${side.surface.guide.trigram.raw.toFixed(3)} / `);
    }
  }
  expect(packet.draws.map(pairKey)).toEqual(keys);
  expect(packet.examples.map(pairKey)).toEqual(keys);
  expect(packet.changedDraws.map(pairKey)).toEqual(keys);
  for (const change of packet.changedDraws) expect(pairKey(packet.draws[change.rowIndex])).toEqual(pairKey(change));

  const winnerOnly = packet.changedDraws.find(change => change.fields.join() === "selectedAttempt");
  if (!winnerOnly) throw new Error("Fixture needs a changed winner with identical output.");
  const draw = packet.draws[winnerOnly.rowIndex];
  expect(draw.before.selectedAttempt).not.toBe(draw.after.selectedAttempt);
  expect(draw.before).toEqual({ ...draw.after, selectedAttempt: draw.before.selectedAttempt });
  expect(winnerOnly.trace.attemptComparison).toEqual({
    scope: "different-winners", before: draw.before.selectedAttempt, after: draw.after.selectedAttempt,
  });
  expect(winnerOnly.trace.firstStageDifference?.kind).toBe("phone");
  const label = `Different winning attempts (before ${draw.before.selectedAttempt}, after ${draw.after.selectedAttempt})`;
  expect(markdown).toContain(`| winning attempt | ${label} ·`);

  const { rows } = await loadReference();
  const reaching = rows.filter(row => row.length >= 2);
  const movers = packet.movers.flatMap(bucket => [...bucket.positive, ...bucket.negative]);
  expect(movers.map(pairKey)).toEqual(expect.arrayContaining(keys.filter(key => key.seed !== winnerOnly.seed)));
  expect(movers).toHaveLength(2);
  const modelComparisons = new Set<boolean>();
  const positionalCount = (phones: string[]) => reaching.filter(row => row[0] === phones[0] && row[1] === phones[1]).length;
  const pair = (phones: string[], count: number) => `\`${phones.slice(0, 2).join(" ")}\` ${count}/${reaching.length}`;
  for (const mover of movers) {
    const left = mover.before.surface, right = mover.after.surface;
    if (left.kind !== "scored" || right.kind !== "scored") throw new Error("Expected a scored mover.");
    expect(mover.traces.before.selection?.selectedAttempt).toBe(mover.before.selectedAttempt);
    expect(mover.traces.after.selection?.selectedAttempt).toBe(mover.after.selectedAttempt);
    expect(mover.traces.before.random).toEqual(mover.random);
    expect(mover.traces.after.random).toEqual(mover.random);
    expect(mover.changes.attemptComparison.scope).toBe("different-winners");
    const before = positionalCount(left.phones), after = positionalCount(right.phones);
    expect(mover.changedReferencePairs[0]).toMatchObject({ position: 0,
      before: { symbols: left.phones.slice(0, 2), count: before, reaching: reaching.length },
      after: { symbols: right.phones.slice(0, 2), count: after, reaching: reaching.length } });
    expect(mover.contributions.before.bigram[0].symbols).toEqual(left.phones.slice(0, 2));
    expect(mover.contributions.after.bigram[0].symbols).toEqual(right.phones.slice(0, 2));
    const raw = (right.score.bigram.raw - left.score.bigram.raw).toFixed(6);
    const crossFold = left.score.fold !== right.score.fold;
    const rawCell = crossFold ? `${raw} (different held-out models, folds ${left.score.fold} → ${right.score.fold})` : raw;
    modelComparisons.add(crossFold);
    expect(markdown).toContain(`| ${rawCell} | Position 1 · ${pair(left.phones, before)} → ${pair(right.phones, after)} | Different winning attempts`);
  }
  expect(modelComparisons).toEqual(new Set([false, true]));

  // Packets written before attempt comparisons existed render identically.
  const withoutAttempts = JSON.parse(JSON.stringify(packet, (key, value: unknown) => key === "attemptComparison" ? undefined : value));
  expect(renderPacket(withoutAttempts)).toBe(markdown);
});
