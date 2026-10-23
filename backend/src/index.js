const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { wrap, send } = require("./http");
const { handle } = require("./api");
const { seedIfEmpty } = require("./seed");
const { STORAGE_ROOT } = require("./services");

seedIfEmpty();

const PORT = Number(process.env.API_PORT || process.env.PORT || 3001);
const STATIC_DIR = process.env.STATIC_DIR || path.join(__dirname, "..", "..", "frontend", "dist");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".map": "application/json",
};

function serveStatic(req, res) {
  const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
  if (urlPath.startsWith("/uploads/")) {
    const file = path.basename(urlPath);
    const full = path.join(STORAGE_ROOT, file);
    if (!full.startsWith(STORAGE_ROOT) || !fs.existsSync(full)) {
      send(res, 404, { error: "Not found" });
      return true;
    }
    const ext = path.extname(full);
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    fs.createReadStream(full).pipe(res);
    return true;
  }
  if (!fs.existsSync(STATIC_DIR)) return false;
  let rel = urlPath === "/" ? "/index.html" : urlPath;
  let full = path.join(STATIC_DIR, rel);
  if (!full.startsWith(STATIC_DIR)) {
    send(res, 403, { error: "Forbidden" });
    return true;
  }
  if (!fs.existsSync(full) || fs.statSync(full).isDirectory()) {
    full = path.join(STATIC_DIR, "index.html");
  }
  const ext = path.extname(full);
  res.writeHead(200, {
    "Content-Type": MIME[ext] || "application/octet-stream",
    "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=86400",
  });
  fs.createReadStream(full).pipe(res);
  return true;
}

const server = http.createServer((req, res) => {
  wrap(req, res, async (req2, res2) => {
    if (req2.path.startsWith("/api/")) {
      await handle(req2, res2);
      return;
    }
    if (!serveStatic(req2, res2)) {
      send(res2, 404, { error: "Not found" });
    }
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`SevaSetu API listening on ${PORT}`);
});
