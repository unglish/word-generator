import { readFileSync } from "node:fs";
import * as api from "../../dist/index.js";
import { checkPilot, checkAdapterContracts, checkAdapterCopies } from "./shared.mjs";
const corpus = JSON.parse(readFileSync(new URL("fixtures.json", import.meta.url), "utf8"));
const url = new URL("../../dist/wasm/unglish_wasm.js", import.meta.url);
const wasm = readFileSync(new URL("unglish_wasm_bg.wasm", url));
const adapterAssertions = await checkAdapterContracts(api, url, wasm);
const adapterCopyAssertions = await checkAdapterCopies(api, url, wasm,
  new URL("../../dist/experimental/rust-repair.js", import.meta.url));
console.log(JSON.stringify({ ...await checkPilot(api, corpus, url, wasm), adapterAssertions, adapterCopyAssertions }, null, 2));
