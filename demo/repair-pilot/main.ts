import * as api from "../../src/index.js";
import { checkPilot } from "../../evaluation/repair-pilot/shared.mjs";

const root = new URL(import.meta.env.BASE_URL, location.href);
const bindingsUrl = new URL("repair-wasm/unglish_wasm.js", root);
const result = document.querySelector("#result")!;
async function run() {
  const response = await fetch(new URL("repair-wasm/fixtures.json", root));
  if (!response.ok) throw new Error(`Fixture loading failed: ${response.status}`);
  const corpus = await response.json();
  const first = await checkPilot(api, corpus, bindingsUrl);
  const second = await checkPilot(api, corpus, bindingsUrl);
  const worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
  try {
    const workerResult = await new Promise((resolve, reject) => {
      worker.onmessage = event => event.data.error ? reject(new Error(event.data.error)) : resolve(event.data);
      worker.onerror = event => reject(new Error(event.message));
      worker.postMessage({ corpus, bindingsUrl: bindingsUrl.href });
    });
    result.textContent = JSON.stringify({ main: first, repeated: second, worker: workerResult }, null, 2);
    result.setAttribute("data-status", "passed");
  } finally { worker.terminate(); }
}
run().catch(error => { result.textContent = String(error); result.setAttribute("data-status", "failed"); });
