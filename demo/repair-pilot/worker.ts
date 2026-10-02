import * as api from "../../src/index.js";
import { checkPilot } from "../../evaluation/repair-pilot/shared.mjs";
self.onmessage = async event => {
  try { self.postMessage(await checkPilot(api, event.data.corpus, new URL(event.data.bindingsUrl))); }
  catch (error) { self.postMessage({ error: String(error) }); }
};
