const { URL } = require("node:url");

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  header.split(";").forEach((p) => {
    const i = p.indexOf("=");
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (c) => {
      size += c.length;
      if (size > 12 * 1024 * 1024) {
        reject(Object.assign(new Error("Payload too large"), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => {
      const raw = Buffer.concat(chunks);
      const ct = req.headers["content-type"] || "";
      if (!raw.length) return resolve({});
      if (ct.includes("application/json")) {
        try {
          resolve(JSON.parse(raw.toString("utf8")));
        } catch {
          reject(Object.assign(new Error("Invalid JSON"), { status: 400 }));
        }
        return;
      }
      if (ct.includes("application/x-www-form-urlencoded")) {
        const params = new URLSearchParams(raw.toString("utf8"));
        resolve(Object.fromEntries(params.entries()));
        return;
      }
      resolve({ raw, contentType: ct });
    });
    req.on("error", reject);
  });
}

function send(res, status, data, extraHeaders) {
  const body = typeof data === "string" ? data : JSON.stringify(data);
  const headers = {
    "Content-Type": typeof data === "string" ? "text/plain; charset=utf-8" : "application/json; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    ...extraHeaders,
  };
  res.writeHead(status, headers);
  res.end(body);
}

function cors(req, res) {
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Credentials", "true");
}

function clientIp(req) {
  return (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.socket.remoteAddress || "";
}

async function wrap(req, res, fn) {
  try {
    cors(req, res);
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    req.path = decodeURIComponent(url.pathname);
    req.query = Object.fromEntries(url.searchParams.entries());
    req.cookies = parseCookies(req.headers.cookie);
    if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
      req.body = await parseBody(req);
    } else {
      req.body = {};
    }
    await fn(req, res);
  } catch (err) {
    const status = err.status || 500;
    send(res, status, { error: err.message || "Server error", status });
  }
}

function match(path, pattern) {
  const pa = path.split("/").filter(Boolean);
  const pb = pattern.split("/").filter(Boolean);
  if (pa.length !== pb.length) return null;
  const params = {};
  for (let i = 0; i < pb.length; i++) {
    if (pb[i].startsWith(":")) params[pb[i].slice(1)] = pa[i];
    else if (pb[i] !== pa[i]) return null;
  }
  return params;
}

module.exports = { wrap, send, match, clientIp, cors };
