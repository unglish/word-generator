import * as api from "../../src/index.js";
import { checkPilot, checkAdapterContracts } from "../../evaluation/repair-pilot/shared.mjs";
self.onmessage = async event => {
  try {
    const url = new URL(event.data.bindingsUrl);
    self.postMessage({ ...await checkPilot(api, event.data.corpus, url), adapterAssertions: await checkAdapterContracts(api, url) });
  }
  catch (error) { self.postMessage({ error: String(error) }); }
};
