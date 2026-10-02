import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { test } from "node:test";
import { createGenerator, createSeededRng, englishConfig } from "../../../src/index.js";
import { englishSplitVowelSupports } from "../../../src/elements/graphemes/split-vowels.js";
import { classifyFollowing, createFollowingObserver, followingStratum, interpretFollowing } from "./observe-following.js";

const config = { ...englishConfig, splitVowels: { supports: englishSplitVowelSupports, routes: {
  syllable: { forms: ["ae", "ie", "oe", "ue", "ye"], probability: 95 },
  word: { swaps: englishConfig.silentE!.swaps, probability: 35, monosyllableMultiplier: 2 },
} } };
const fixture = () => JSON.parse(readFileSync(new URL("./exploration/c-before-a-witness.json", import.meta.url), "utf8")).word;

test("written contexts distinguish letters, closed edges and unknown edges", () => {
  const soft = { kind: "following-letter" as const, require: ["e", "i", "y"] };
  for (const origin of ["selection", "shared", "split-vowel", "completion", "rewrite"]) {
    assert.equal(classifyFollowing(soft, { kind: "letter", letter: "a", origin }), "contextual-incompatible");
    assert.equal(classifyFollowing(soft, { kind: "letter", letter: "E", origin }), "contextual-compatible");
  }
  assert.equal(classifyFollowing(soft, { kind: "root-edge" }), "contextual-incompatible");
  assert.equal(classifyFollowing(soft, { kind: "unavailable" }), "context-unavailable");
  assert.equal(classifyFollowing({ kind: "following-letter", forbid: ["e", "i", "y"] }, { kind: "root-edge" }), "contextual-compatible");
  assert.equal(classifyFollowing(undefined, { kind: "root-edge" }), "reading-unavailable");
  assert.equal(classifyFollowing({ kind: "unsupported-construction", reason: "lexical" }, { kind: "letter", letter: "e", origin: "selection" }), "reading-unavailable");
  assert.equal(followingStratum("s", "sc"), "soft-c:sc");
  assert.equal(followingStratum("dʒ", "dge"), "other");
});

test("retained soft-c failure survives final-root analysis despite later reduction", () => {
  const word = fixture();
  assert.equal(word.written.clean, "carowngs");
  const result = createFollowingObserver(config)(word);
  const events = result.events.filter(item => item.phoneId === 0);
  assert.equal(events.length, 2);
  for (const event of events) {
    assert.equal(event.sound, "s");
    assert.equal(event.form, "c");
    assert.equal(event.readingStatus, "contextual-incompatible");
    assert.equal(event.interpretation, "productive-soft-pattern-departure");
    assert.equal(event.finalAssembled, "unavailable");
    assert.deepEqual(event.cellIds, [0]);
    assert.equal(event.context?.kind, "letter");
  }
  assert.equal(result.events.find(item => item.phoneId === 1)?.sound, "æ");
  assert.match(word.pronunciation, /^sə/);
});

test("damaged cells and inventory identities fail authentication before counting", () => {
  const observe = createFollowingObserver(config);
  const badCell = fixture();
  badCell.trace.baseSpelling.cells[0].id = 999999;
  assert.throws(() => observe(badCell));
  const badInventory = fixture();
  badInventory.trace.baseSpelling.units[0].inventoryIndex = 12;
  assert.throws(() => observe(badInventory));
});

test("public generated traces conserve both boundary populations and reading denominators", () => {
  const generator = createGenerator(config);
  const observe = createFollowingObserver(config);
  const rand = createSeededRng(129);
  let contextual = 0;
  let unavailable = 0;
  for (let i = 0; i < 120; i++) {
    const result = observe(generator.generateWord({ rand, trace: true, morphology: i % 2 === 0 }));
    assert.equal(result.events.length, result.counts.phones * 2);
    for (const boundary of ["selection", "final-root"]) {
      const sum = (prefix: string) => Object.entries(result.counts).filter(([key]) => key.startsWith(prefix)).reduce((n, [, count]) => n + count, 0);
      assert.equal(sum(`${boundary}:ownership:`), result.counts.phones);
      assert.equal(sum(`${boundary}:selectionCohort:`), result.counts.phones);
      assert.equal(sum(`${boundary}:reading:`), result.counts[`${boundary}:ownership:single-owned`]);
    }
    assert.equal(Object.entries(result.counts).filter(([key]) => key.startsWith("transition:")).reduce((n, [, count]) => n + count, 0), result.counts.phones);
    contextual += result.events.filter(event => event.reading?.kind === "following-letter").length;
    unavailable += result.counts["final-root:ownership:unavailable"];
    assert.ok(Object.values(result.counts).every(value => Number.isSafeInteger(value) && value >= 0));
  }
  assert.ok(contextual > 0);
  assert.ok(unavailable > 0);
});

test("linguistic interpretation does not equate custom rule mismatch with an English pattern departure", () => {
  const event = { boundary: "selection" as const, phoneId: 0, sound: "g", selected: "g", form: "g",
    stratum: "hard-g:g", selectionStratum: "hard-g:g", ownership: "single-owned" as const,
    context: { kind: "letter" as const, letter: "e", origin: "selection" },
    readingStatus: "contextual-incompatible" as const, interpretation: "", finalAssembled: "unavailable" as const };
  assert.equal(interpretFollowing(event), "hard-g-exception-sensitive");
  assert.equal(interpretFollowing({ ...event, sound: "s", form: "c", stratum: "soft-c:c" }), "other-declared-context-departure");
  assert.equal(interpretFollowing({ ...event, sound: "s", form: "c", stratum: "soft-c:c",
    readingStatus: "contextual-compatible", context: { ...event.context, letter: "a" } }), "productive-soft-pattern-departure");
});

test("historical root ownership stays outside scope without dropping selection cohorts", () => {
  const historical = { ...englishConfig, sharedSpellings: undefined };
  const word = createGenerator(historical).generateWord({ seed: 129, trace: true });
  assert.equal(word.trace!.baseSpelling!.version, 3);
  const result = createFollowingObserver(historical)(word);
  assert.equal(result.counts["final-root:ownership:outside-supported-version"], result.counts.phones);
  assert.equal(result.events.filter(event => event.boundary === "final-root").every(event => event.readingStatus === undefined), true);
});

test("cross-syllable written context is not mistaken for a root edge", () => {
  const rows = gunzipSync(readFileSync(new URL("./accounting-v2/pilot.jsonl.gz", import.meta.url))).toString("utf8").trim().split("\n").map(line => JSON.parse(line));
  const row = rows.find(row => row.kind === "observation" && row.name === "default" && row.coordinate.index === 79);
  assert.equal(row.word.written.clean, "brucyildeeg");
  const result = createFollowingObserver(englishConfig)(row.word);
  const event = result.events.find(event => event.boundary === "final-root" && event.phoneId === 3)!;
  const cells = row.word.trace.baseSpelling.cells;
  const end = cells.findIndex((cell: { id: number }) => cell.id === event.cellIds!.at(-1)) + 1;
  assert.notEqual(cells[end].partId, cells[end - 1].partId);
  assert.deepEqual(event.context, { kind: "letter", letter: "y", origin: "selection" });
  assert.equal(event.readingStatus, "contextual-incompatible");
});

test("empty historical ledger has zero denominators and no fabricated events", () => {
  // Deliberately empty ledger fixture; this is not a generated-word sample.
  const word = fixture();
  word.trace.baseSpelling = { version: 1, scope: "root-before-morphology", surface: "",
    phones: [], units: [], cells: [], edits: [], unresolvedCells: 0 };
  const result = createFollowingObserver(englishConfig)(word);
  assert.deepEqual(result.events, []);
  assert.equal(result.counts.phones, 0);
  assert.ok(Object.entries(result.counts).every(([key, value]) => value === (key === "words" ? 1 : 0)));
});


test("observer authenticates enabled selection law and binds it to base units", () => {
  const enabled = { ...config, followingLetters: { targets: [
    { phoneme: "s", form: "c" }, { phoneme: "s", form: "sc" }, { phoneme: "dʒ", form: "g" },
  ] } };
  const word = createGenerator(enabled).generateWord({ seed: 129, trace: true });
  const observe = createFollowingObserver(enabled);
  assert.equal(observe(word).counts.words, 1);
  assert.throws(() => createFollowingObserver(config)(word), /declared configuration/);
  const altered = structuredClone(word);
  altered.trace!.graphemeSelections[0].conditionedSelection!.logConditionalProbability += 0.5;
  assert.throws(() => observe(altered), /Invalid sequence evidence/);
  const detached = structuredClone(word);
  detached.trace!.graphemeSelections[0].conditionedSelection!.choice.inventoryIndex = -1;
  assert.throws(() => observe(detached), /disagrees with base evidence/);
  const absent = structuredClone(word);
  delete absent.trace!.graphemeSelections[0].conditionedSelection;
  assert.throws(() => observe(absent), /disagrees with base evidence/);
});


test("generic rewrite guard preserves soft c and replay rejects a falsified guard decision", () => {
  const enabled = { ...config, followingLetters: { targets: [
    { phoneme: "s", form: "c" }, { phoneme: "s", form: "sc" }, { phoneme: "dʒ", form: "g" },
  ] }, spellingRules: [...(config.spellingRules ?? []), {
    name: "adversarial-soft-context", pattern: "(?<=c)e", replacement: "a", scope: "word" as const,
  }] };
  const generator = createGenerator(enabled);
  const word = generator.generateWord({ seed: 464, trace: true });
  assert.equal(word.written.clean, "unceff");
  assert.deepEqual(word.written, generator.generateWord({ seed: 464 }).written);
  const observer = createFollowingObserver(enabled);
  const observation = observer(word);
  assert.equal(observation.counts["final-root:stratum:soft-c:c:reading:contextual-incompatible"], 0);
  const guards = word.trace!.baseSpelling!.followingGuards!;
  const index = guards.findIndex(guard => guard.edits.some(edit => edit.rule === "spellingRule:adversarial-soft-context"));
  assert.ok(index >= 0);
  assert.equal(guards[index].decision.status, "refused");
  const corrupted = structuredClone(word);
  corrupted.trace!.baseSpelling!.followingGuards![index].decision.status = "preserved";
  assert.throws(() => observer(corrupted), /trace mismatch/);
});
