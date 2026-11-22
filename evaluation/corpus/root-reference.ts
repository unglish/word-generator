import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { CMU_REVISION, CMU_SHA256, sha256 } from "../review/wordlikeness/model.js";
import { CMU_PARSER_VERSION, parseCmuRecords, selectCompatibleCmu, type SelectedCmuEntry } from "./cmu.js";
import { jsonDigest } from "./identity.js";
import { JOINT_ENTRY_DIGEST, JOINT_VERSION, addCount, histogram } from "./joint.js";
import { rootAffixes, rootConfig } from "./root-config.js";
import { stripRoots, type LedgerRow } from "./root-stripping.js";

const VERSION = "cmu-common-root-reference-v1";
const SCOWL = {
  version: "2020.12.07",
  url: "https://deb.debian.org/debian/pool/main/s/scowl/scowl_2020.12.07.orig.tar.gz",
  sha256: "5587667caa20c4891390c2d42dbb4d5c4c3f41bee77af1457ece3ba23fb859cc",
  license: "scowl-2020.12.07/Copyright",
  size: 60,
};
const WORDNET = {
  version: "3.0",
  url: "https://wordnetcode.princeton.edu/3.0/WordNet-3.0.tar.gz",
  sha256: "640db279c949a88f61f851dd54ebbb22d003f8b90b85267042ef85a3781d3a52",
  license: "WordNet-3.0/LICENSE",
};
const CMU = {
  revision: CMU_REVISION,
  url: `https://raw.githubusercontent.com/cmusphinx/cmudict/${CMU_REVISION}/cmudict.dict`,
  sha256: CMU_SHA256,
  license: "evaluation/review/wordlikeness/artifacts/CMUDICT-LICENSE.txt",
};
const PROJECTION = "data/cmu/phoneme-normalization.json";
const SOURCES = [
  "evaluation/corpus/cmu.ts", "evaluation/corpus/identity.ts", "evaluation/corpus/joint.ts",
  "evaluation/corpus/root-cli.ts", "evaluation/corpus/root-reference.ts", "evaluation/corpus/root-stripping.ts",
  "evaluation/corpus/root-config.ts", "evaluation/review/wordlikeness/model.ts",
  "src/config/english.ts", "src/config/weights.ts", "src/elements/phonemes.ts",
  PROJECTION, CMU.license,
];

const bytesDigest = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");
const asciiWord = /^[a-z]+$/;
const readPinned = async (path: string, expected: string) => {
  const bytes = await readFile(path);
  if (bytesDigest(bytes) !== expected) throw new Error(`Raw input differs from pinned SHA-256: ${path}`);
  return bytes;
};

function archiveFiles(bytes: Buffer, members: string[]): string {
  return execFileSync("tar", ["-xzOf", "-", ...members], { input: bytes, encoding: "latin1", maxBuffer: 8 * 1024 * 1024 });
}

function scowlLists(bytes: Buffer) {
  const levels = [10, 20, 35, 40, 50, 55, SCOWL.size];
  const names = execFileSync("tar", ["-tzf", "-"], { input: bytes, encoding: "utf8" }).split("\n");
  const members = (categories: string[]) => names.filter(member => {
    const match = /\/final\/(?:english|american)-(words|proper-names|upper)\.(\d+)$/.exec(member);
    return match && categories.includes(match[1]) && levels.includes(Number(match[2]));
  });
  const ordinary = archiveFiles(bytes, members(["words"])).split(/\r?\n/);
  const proper = archiveFiles(bytes, members(["proper-names", "upper"])).split(/\r?\n/);
  return {
    common: new Set(ordinary.filter(word => asciiWord.test(word))),
    names: new Set(proper.map(word => word.toLowerCase()).filter(word => asciiWord.test(word))),
  };
}

function wordnetExceptions(bytes: Buffer): Map<string, string[]> {
  const members = ["adj", "adv", "noun", "verb"].map(part => `WordNet-${WORDNET.version}/dict/${part}.exc`);
  const exceptions = new Map<string, Set<string>>();
  for (const row of archiveFiles(bytes, members).split(/\r?\n/)) {
    const [word, ...lemmas] = row.trim().split(/ +/);
    if (!asciiWord.test(word)) continue;
    const bases = lemmas.filter(lemma => lemma !== word && asciiWord.test(lemma));
    if (!bases.length) continue;
    const recorded = exceptions.get(word) ?? new Set<string>();
    bases.forEach(base => recorded.add(base));
    exceptions.set(word, recorded);
  }
  return new Map([...exceptions].map(([word, bases]) => [word, [...bases].sort()]));
}

function readProjection(text: string): Record<string, string> {
  const data: unknown = JSON.parse(text);
  if (data === null || typeof data !== "object" || !("arpabetToIpa" in data)) throw new Error("Missing IPA projection");
  const mapping = data.arpabetToIpa;
  if (mapping === null || typeof mapping !== "object") throw new Error("Invalid IPA projection");
  const entries = Object.entries(mapping).map(([base, ipa]) => {
    if (typeof ipa !== "string") throw new Error(`Invalid IPA projection for ${base}`);
    return [base, ipa] satisfies [string, string];
  });
  return Object.fromEntries(entries);
}

const entryIdentity = ({ line, label, spelling, tokens }: SelectedCmuEntry) => ({ line, label, spelling, tokens });

function summarize(entries: readonly SelectedCmuEntry[], ledger: readonly LedgerRow[], ipa: Record<string, string>) {
  const byWord = new Map(entries.map(entry => [entry.spelling, entry]));
  const rootSpellings = new Set<string>();
  const outcomes = histogram(), templates = histogram(), affixes = histogram(), allStrips = histogram();
  const suffixByFinal: Record<string, ReturnType<typeof histogram>> = {};
  const syllables = histogram(), phones = histogram(), syllablesByPhones: Record<number, ReturnType<typeof histogram>> = {};
  const codas = { full: histogram(), common: histogram(), roots: histogram() };

  const addCoda = (table: ReturnType<typeof histogram>, entry: SelectedCmuEntry) => {
    let lastVowel = entry.phones.length - 1;
    while (lastVowel >= 0 && entry.phones[lastVowel].kind !== "vowel") lastVowel--;
    const coda = entry.phones.slice(lastVowel + 1).map(phone => ipa[phone.base]);
    addCount(table, coda.join(" "));
  };

  for (const [index, row] of ledger.entries()) {
    addCoda(codas.full, entries[index]);
    addCount(outcomes, row.status);
    if (row.stem === null) continue;
    addCoda(codas.common, entries[index]);
    for (const step of row.steps) addCount(allStrips, `${step.type}:${step.affix}`);
    if (row.status !== "included") continue;
    rootSpellings.add(row.stem);
    addCount(templates, row.template);
    for (const step of row.steps) {
      addCount(affixes, `${step.type}:${step.affix}`);
      if (step.type === "suffix") {
        const final = byWord.get(row.stem)?.phones.at(-1)?.base;
        if (!final) throw new Error(`Missing final phone for ${row.stem}`);
        addCount(suffixByFinal[step.affix] ??= histogram(), ipa[final]);
      }
    }
  }

  const roots = entries.filter(entry => rootSpellings.has(entry.spelling));
  for (const entry of roots) {
    const syllableCount = entry.phones.filter(phone => phone.kind === "vowel").length;
    addCount(syllables, String(syllableCount));
    addCount(phones, String(entry.phones.length));
    addCount(syllablesByPhones[entry.phones.length] ??= histogram(), String(syllableCount));
    addCoda(codas.roots, entry);
  }
  return {
    roots: roots.map(entryIdentity),
    tables: { outcomes, templates, affixes, allStrips, suffixByFinal, syllables, phones, syllablesByPhones, codas },
  };
}

export async function writeRootReference(root: string, options: { source: string; scowl: string; wordnet: string; out: string }) {
  const [source, scowl, wordnet, implementation] = await Promise.all([
    readPinned(options.source, CMU.sha256), readPinned(options.scowl, SCOWL.sha256),
    readPinned(options.wordnet, WORDNET.sha256),
    Promise.all(SOURCES.map(async path => ({ path, sha256: bytesDigest(await readFile(resolve(root, path))) }))),
  ]);
  const { entries } = selectCompatibleCmu(parseCmuRecords(source.toString("utf8")));
  const entryDigest = sha256(JSON.stringify(entries.map(entryIdentity)));
  if (entryDigest !== JOINT_ENTRY_DIGEST) throw new Error("Selected entries differ from the pinned joint population.");

  const ipa = readProjection(await readFile(resolve(root, PROJECTION), "utf8"));
  const ledger = stripRoots({ entries, ...scowlLists(scowl), exceptions: wordnetExceptions(wordnet), affixes: rootAffixes, ipa });
  const artifact = {
    version: VERSION,
    sources: { cmu: CMU, scowl: SCOWL, wordnet: WORDNET },
    population: { version: JOINT_VERSION, parser: CMU_PARSER_VERSION, selected: entries.length, entryDigest },
    implementation,
    config: rootConfig,
    ledger,
    ...summarize(entries, ledger, ipa),
  };
  const digest = jsonDigest(artifact);
  await writeFile(options.out, JSON.stringify({ digest, artifact }) + "\n", { flag: "wx" });
  return { digest, selected: entries.length, roots: artifact.roots.length, outcomes: artifact.tables.outcomes.counts };
}
