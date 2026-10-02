import { createReadStream } from "node:fs";
import { readFile } from "node:fs/promises";
import { createInterface } from "node:readline";
import { createGunzip } from "node:zlib";
import { englishConfig } from "/Users/ryanbetts/.codex/worktrees/linguistic-q02-resumed/word-generator/src/index.ts";
import { verifyLexicalSpellingOperations } from "/Users/ryanbetts/.codex/worktrees/linguistic-q02-resumed/word-generator/src/core/lexical-spelling-evidence.ts";
import { verifyFinalWordSourceLinks } from "/Users/ryanbetts/.codex/worktrees/linguistic-q02-resumed/word-generator/src/core/final-word-sources.ts";
import { verifyConfiguredAllomorphs } from "/Users/ryanbetts/.codex/worktrees/linguistic-q02-resumed/word-generator/src/core/morphology/allomorph-evidence.ts";
const r = JSON.parse(await readFile("/Users/ryanbetts/.codex/worktrees/linguistic-q02-resumed/word-generator/evaluation/experiments/final-word-ownership/measurement.json"));
const config = structuredClone({ ...englishConfig, ...r.configuration }); delete config.base;
const reader = createInterface({ input: createReadStream("/private/tmp/q02-final-word-provenance-v1/words/lexicon-default-69212153.jsonl.gz").pipe(createGunzip()), crlfDelay: Infinity });
let count = 0;
for await (const line of reader) {
 const row = JSON.parse(line);
 try { verifyLexicalSpellingOperations(row.word, config); verifyFinalWordSourceLinks(row.word); verifyConfiguredAllomorphs(row.word, config); }
 catch (error) { console.error(`Failure at ${row.profile}/${row.seed}/${row.drawIndex}`); throw error; }
 if (++count === 1000) break;
}
console.log(`${count} captured active-policy records pass production operation/source/allomorph replay. Provisional subset.`);
