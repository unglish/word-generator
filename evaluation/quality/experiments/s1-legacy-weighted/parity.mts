import { strict as assert } from "node:assert";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
async function load(dir) {
  const file = name => pathToFileURL(resolve(dir, "src", name)).href;
  const api = await import(file("index.ts"));
  const { withStageDraws } = await import(file("test-support/stage-stream-probe.ts"));
  const e = api.englishConfig;
  const custom = api.createGenerator({ ...e,
    generationWeights: { ...e.generationWeights, boundaryPolicy: { equalSonorityDrop: 50, risingCodaDrop: 50 },
      codaLength: { ...e.generationWeights.codaLength, rootFinalByMode: undefined }},
    hiatusPolicy: { ...e.hiatusPolicy, planGuardProbability: 0, fallbackBridgeOnsets: [["h",1],["j",1]] },
    phonemeMaps: { ...e.phonemeMaps, nucleus: new Map([...e.phonemeMaps.nucleus].filter(([sound]) => ["i:","ɑ","u"].includes(sound))) },
    forbidOpenCheckedFinal: false,
  });
  const impossible = api.createGenerator({...e, phonemeMaps:{...e.phonemeMaps, nucleus:new Map()}});
  return {
    single: options => withStageDraws(() => api.generateWord(options)),
    batch: options => withStageDraws(() => api.generateWords(12, options)),
    custom: options => withStageDraws(() => custom.generateWord(options)),
    impossible: () => {try {impossible.generateWord({seed:1});return "no error"} catch(error) {return error.message}},
  };
}
const [a,b] = await Promise.all(process.argv.slice(2).map(load));
const digest = createHash("sha256");
let comparisons=0, words=0;
for (const mode of ["text","lexicon"]) for (const morphology of [true,false]) for (const trace of [true,false]) {
  for (let seed=0;seed<96;seed++) {
    const options={seed,mode,morphology,trace,syllableCount: seed%8};
    for (const kind of ["single","custom",...(seed%12===0?["batch"]:[])]) {
      const before=JSON.stringify(a[kind](options)), after=JSON.stringify(b[kind](options));
      assert.ok(before===after, JSON.stringify({kind,options}));
      digest.update(after); comparisons++; words+=kind==="batch"?12:1;
    }
  }
}
assert.match(a.impossible(), /No eligible nucleus/);
assert.equal(a.impossible(),b.impossible());
console.log(JSON.stringify({comparisons,words,fullWordsTracesAndDrawCounts:"identical",impossibleNucleus:a.impossible(),digest:digest.digest("hex")},null,2));
