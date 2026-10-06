// Andi static server + same-origin Ollama proxy (Node, no dependencies).
// Run on Andi1:  node serve.js   -> http://0.0.0.0:8088
// POST /v1/* and GET /v1/models, /api/tags are forwarded to Ollama at 127.0.0.1:11434,
// so the browser never needs OLLAMA_HOST / OLLAMA_ORIGINS changes.
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.ANDI_PORT || 8088);
const OLLAMA = new URL(process.env.ANDI_OLLAMA || "http://127.0.0.1:11434");
const ROOT = __dirname;
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".png": "image/png", ".svg": "image/svg+xml",
  ".ico": "image/x-icon", ".json": "application/json", ".webmanifest": "application/manifest+json" };
const PUBLIC = new Set([".html", ".js", ".css", ".png", ".svg", ".ico", ".json", ".webmanifest", ".jpg", ".jpeg", ".webp"]);

function proxy(req, res) {
  const up = http.request({ hostname: OLLAMA.hostname, port: OLLAMA.port || 80, path: req.url,
    method: req.method, headers: { "content-type": "application/json" }, timeout: 300000 }, (r) => {
    res.writeHead(r.statusCode, { "content-type": r.headers["content-type"] || "application/json", "cache-control": "no-store" });
    r.pipe(res);
  });
  up.on("timeout", () => up.destroy(new Error("timeout")));
  up.on("error", (e) => {
    if (!res.headersSent) res.writeHead(502, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "ollama unreachable: " + e.message }));
  });
  let size = 0;
  req.on("data", (c) => { size += c.length; if (size > 1e6) { req.destroy(); up.destroy(); } });
  req.pipe(up);
}

http.createServer((req, res) => {
  const url = req.url.split("?")[0];
  if ((req.method === "POST" && url.startsWith("/v1/")) ||
      (req.method === "GET" && (url === "/v1/models" || url === "/api/tags"))) return proxy(req, res);
  if (req.method !== "GET" && req.method !== "HEAD") { res.writeHead(405); return res.end(); }
  let rel = decodeURIComponent(url);
  if (rel.endsWith("/")) rel += "index.html";
  const file = path.normalize(path.join(ROOT, rel));
  const ext = path.extname(file).toLowerCase();
  if (!file.startsWith(ROOT + path.sep) || !PUBLIC.has(ext)) { res.writeHead(404); return res.end("Not found"); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end("Not found"); }
    res.writeHead(200, { "content-type": TYPES[ext] || "application/octet-stream", "cache-control": "no-cache" });
    res.end(req.method === "HEAD" ? undefined : data);
  });
}).listen(PORT, "0.0.0.0", () => console.log(`Andi on http://0.0.0.0:${PORT}  (Ollama: ${OLLAMA.origin})`));
