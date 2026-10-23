const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const os = require("node:os");
const fs = require("node:fs");
const http = require("node:http");

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "sevasetu-"));
process.env.DATABASE_PATH = path.join(tmp, "test.db");
process.env.STORAGE_PATH = path.join(tmp, "uploads");
process.env.BACKUP_PATH = path.join(tmp, "backups");
process.env.JWT_SECRET = "test-secret";

const { wrap } = require("../src/http");
const { handle } = require("../src/api");
const { seedIfEmpty } = require("../src/seed");

seedIfEmpty();

function request(method, urlPath, body, token) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      wrap(req, res, (req2, res2) => handle(req2, res2));
    });
    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      const data = body ? JSON.stringify(body) : null;
      const req = http.request(
        {
          hostname: "127.0.0.1",
          port,
          path: urlPath,
          method,
          headers: {
            "Content-Type": "application/json",
            ...(data ? { "Content-Length": Buffer.byteLength(data) } : {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        },
        (res) => {
          const chunks = [];
          res.on("data", (c) => chunks.push(c));
          res.on("end", () => {
            server.close();
            const text = Buffer.concat(chunks).toString();
            let json = null;
            try {
              json = JSON.parse(text);
            } catch {
              json = text;
            }
            resolve({ status: res.statusCode, json });
          });
        }
      );
      req.on("error", reject);
      if (data) req.write(data);
      req.end();
    });
  });
}

test("health", async () => {
  const r = await request("GET", "/api/v1/health");
  assert.equal(r.status, 200);
  assert.equal(r.json.ok, true);
});

test("login admin", async () => {
  const r = await request("POST", "/api/v1/auth/login", {
    email: "admin@abcyz.in",
    password: "ChangeMe_Admin_123",
  });
  assert.equal(r.status, 200);
  assert.ok(r.json.token);
});

test("reject bad login", async () => {
  const r = await request("POST", "/api/v1/auth/login", {
    email: "admin@abcyz.in",
    password: "wrong",
  });
  assert.equal(r.status, 401);
});

test("tenant isolation", async () => {
  const a = await request("POST", "/api/v1/auth/login", {
    email: "admin@gyan-jyoti.org",
    password: "Seva@12345",
  });
  const b = await request("POST", "/api/v1/auth/login", {
    email: "admin@annapurna-seva.org",
    password: "Seva@12345",
  });
  const listA = await request("GET", "/api/v1/beneficiaries?limit=100", null, a.json.token);
  const listB = await request("GET", "/api/v1/beneficiaries?limit=100", null, b.json.token);
  const idsA = new Set(listA.json.data.map((x) => x.id));
  for (const row of listB.json.data) {
    assert.equal(idsA.has(row.id), false);
  }
});

test("public donation", async () => {
  const camps = await request("GET", "/api/v1/campaigns");
  const camp = camps.json.data[0];
  const r = await request("POST", "/api/v1/donations/public", {
    campaign_id: camp.id,
    amount: 500,
    name: "Test Donor",
    email: "testdonor@abcyz.in",
    frequency: "one-time",
  });
  assert.equal(r.status, 201);
  assert.equal(r.json.donation.status, "successful");
  assert.ok(r.json.receipt);
});

test("inventory stock movement", async () => {
  const login = await request("POST", "/api/v1/auth/login", {
    email: "admin@gyan-jyoti.org",
    password: "Seva@12345",
  });
  const items = await request("GET", "/api/v1/inventory?limit=1", null, login.json.token);
  const item = items.json.data[0];
  const r = await request(
    "POST",
    "/api/v1/inventory/stock",
    { item_id: item.id, type: "in", quantity: 5 },
    login.json.token
  );
  assert.equal(r.status, 200);
  assert.equal(r.json.available, item.available + 5);
});
