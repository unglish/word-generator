import { readAloudBrowser } from "./browser.js";
import { encodeMonoWav } from "./encoding.js";

export function readAloudHtml(nonce: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Read words aloud</title><style nonce="${nonce}">
body{font:18px/1.5 system-ui,sans-serif;max-width:42rem;margin:3rem auto;padding:0 1.25rem;color:#16202a;background:#fafafa}
button{font:inherit;padding:.7rem 1rem;margin:.4rem .4rem .4rem 0;cursor:pointer}button:disabled{cursor:default}
#word{font-size:2.5rem;min-height:4rem;margin:1.5rem 0;overflow-wrap:anywhere}#notice{min-height:3rem}
#fixture{color:#6b3b09;font-weight:600}#word:focus{outline:2px solid #53687c;outline-offset:.3rem}
</style></head><body><main><h1>Read words aloud</h1><p id="instruction"></p><p id="fixture"></p>
<p id="progress"></p><p id="word" tabindex="-1"></p><div id="actions"></div><p id="notice" role="status" aria-live="polite"></p>
<p>Recording uses your first reading only. Keep this tab open while saving. A saved recording can be retried; a lost recording cannot be replaced.</p>
</main><script nonce="${nonce}">const __name = (target, name) => Object.defineProperty(target, "name", { value:name, configurable:true }); void (${readAloudBrowser.toString()})(${encodeMonoWav.toString()});</script></body></html>`;
}
