import { readFileSync } from "node:fs";
import * as api from "../../dist/index.js";
import { checkPilot } from "./shared.mjs";
const corpus = JSON.parse(readFileSync(new URL("fixtures.json", import.meta.url), "utf8"));
const url = new URL("../../dist/wasm/unglish_wasm.js", import.meta.url);
const wasm = readFileSync(new URL("unglish_wasm_bg.wasm", url));
console.log(JSON.stringify(await checkPilot(api, corpus, url, wasm), null, 2));
