const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { insert, all, get, run } = require("./db");

const STORAGE_ROOT = process.env.STORAGE_PATH || path.join(__dirname, "..", "data", "uploads");
fs.mkdirSync(STORAGE_ROOT, { recursive: true });

class LocalStorageProvider {
  constructor(root) {
    this.root = root;
  }
  save(filename, buffer) {
    const safe = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const full = path.join(this.root, safe);
    fs.writeFileSync(full, buffer);
    return { provider: "local", path: `/uploads/${safe}`, filename: safe };
  }
  read(filename) {
    return fs.readFileSync(path.join(this.root, filename));
  }
}

class PaymentProvider {
  constructor(name) {
    this.name = name;
  }
  async charge({ amount, currency, reference, method }) {
    const ref = `PAY-${this.name.toUpperCase()}-${crypto.randomBytes(6).toString("hex")}`;
    return {
      status: "successful",
      provider: this.name,
      payment_ref: ref,
      amount,
      currency: currency || "INR",
      method: method || "upi",
      reference,
    };
  }
}

const paymentProviders = {
  offline: new PaymentProvider("offline"),
  razorpay: new PaymentProvider("razorpay"),
  stripe: new PaymentProvider("stripe"),
  paypal: new PaymentProvider("paypal"),
  upi: new PaymentProvider("upi"),
};

function getPaymentProvider() {
  const name = (get("SELECT value FROM settings WHERE key = ?", ["payment_provider"]) || {}).value
    || process.env.PAYMENT_PROVIDER
    || "offline";
  return paymentProviders[name] || paymentProviders.offline;
}

class EmailProvider {
  async send({ to, subject, body }) {
    insert("email_log", { to_addr: to, subject, body, status: "logged" });
    return { status: "logged", to, subject };
  }
}

const emailProvider = new EmailProvider();

function notify({ user_id, ngo_id, title, body, channel }) {
  insert("notifications", {
    user_id: user_id || null,
    ngo_id: ngo_id || null,
    channel: channel || "in-app",
    title,
    body,
  });
  if (user_id) {
    const u = get("SELECT email FROM users WHERE id = ?", [user_id]);
    if (u) emailProvider.send({ to: u.email, subject: title, body });
  }
}

function audit({ user, ngo_id, action, object_type, object_id, before, after, ip }) {
  insert("audit_logs", {
    user_id: user ? user.id : null,
    ngo_id: ngo_id || (user && user.ngo_id) || null,
    action,
    object_type: object_type || null,
    object_id: object_id || null,
    before_json: before ? JSON.stringify(before) : null,
    after_json: after ? JSON.stringify(after) : null,
    ip: ip || null,
  });
}

function nextCode(prefix, table, col) {
  const row = get(`SELECT COUNT(*) AS c FROM ${table}`);
  return `${prefix}-${String((row.c || 0) + 1).padStart(5, "0")}`;
}

function receiptNo() {
  return `RCPT-${new Date().getFullYear()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

function qrPayload(kind, id) {
  return `SEVASETU:${kind}:${id}`;
}

function toCsv(rows) {
  if (!rows.length) return "";
  const keys = Object.keys(rows[0]);
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [keys.join(","), ...rows.map((r) => keys.map((k) => esc(r[k])).join(","))].join("\n");
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).map((line) => {
    const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = cols[i];
    });
    return obj;
  });
}

function paginate(items, query) {
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(query.limit || 20)));
  const total = items.length;
  const start = (page - 1) * limit;
  return { data: items.slice(start, start + limit), page, limit, total, pages: Math.ceil(total / limit) || 1 };
}

function filterRows(rows, query, fields) {
  let out = rows;
  const q = (query.q || query.search || "").toLowerCase();
  if (q) {
    out = out.filter((r) =>
      fields.some((f) => String(r[f] ?? "").toLowerCase().includes(q))
    );
  }
  Object.keys(query).forEach((k) => {
    if (["q", "search", "page", "limit", "sort", "order", "export", "scope"].includes(k)) return;
    if (query[k] === undefined || query[k] === "" || query[k] === "all") return;
    out = out.filter((r) => String(r[k]) === String(query[k]));
  });
  const sort = query.sort;
  if (sort && out.length && Object.prototype.hasOwnProperty.call(out[0], sort)) {
    const dir = query.order === "desc" ? -1 : 1;
    out = [...out].sort((a, b) => (a[sort] > b[sort] ? dir : a[sort] < b[sort] ? -dir : 0));
  }
  return out;
}

module.exports = {
  LocalStorageProvider,
  storage: new LocalStorageProvider(STORAGE_ROOT),
  STORAGE_ROOT,
  getPaymentProvider,
  emailProvider,
  notify,
  audit,
  nextCode,
  receiptNo,
  qrPayload,
  toCsv,
  parseCsv,
  paginate,
  filterRows,
  all,
  get,
  run,
};
