import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
const root = resolve("dist-demo");
createServer(async (req, res) => {
  const url = new URL(req.url, "http://127.0.0.1");
  if (!url.pathname.startsWith("/word-generator/")) { res.writeHead(404).end(); return; }
  const file = resolve(root, `.${decodeURIComponent(url.pathname.slice("/word-generator".length))}`);
  if (!file.startsWith(root + "/")) { res.writeHead(404).end(); return; }
  try {
    const data = await readFile(file);
    res.setHeader("Content-Type", ({ ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".wasm": "application/wasm" })[extname(file)] ?? "application/octet-stream");
    res.end(data);
  } catch { res.writeHead(404).end(); }
}).listen(4175, "127.0.0.1");
