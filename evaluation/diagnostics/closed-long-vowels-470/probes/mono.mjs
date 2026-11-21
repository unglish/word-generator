// Monosyllable rime spellings per 50k (quality:pr monosyllables-bare archive).
import { readFileSync, readdirSync } from "node:fs"; import { gunzipSync } from "node:zlib";
for (const d of process.argv.slice(2)) {
  const ws = [];
  for (const f of readdirSync(d + "/words").filter(f => f.startsWith("monosyllables-bare")))
    for (const l of gunzipSync(readFileSync(d + "/words/" + f)).toString().trim().split("\n")) ws.push(JSON.parse(l).word.written.clean);
  const c = re => ws.filter(w => re.test(w)).length;
  console.log(d, ws.length, JSON.stringify({ eing: c(/eing/), aing: c(/aing/), oong: c(/oong/), iing: c(/iing/), ier: c(/ier/), ies: c(/ies/), eer: c(/eer/), ear: c(/ear/) }));
}
