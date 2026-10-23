const crypto = require("node:crypto");
const { get, run, insert } = require("./db");

const JWT_SECRET = process.env.JWT_SECRET || "dev-sevasetu-change-me";
const JWT_EXPIRES = process.env.JWT_EXPIRES_IN || "12h";
const MAX_ATTEMPTS = Number(process.env.LOGIN_MAX_ATTEMPTS || 5);
const LOCK_MINUTES = Number(process.env.LOGIN_LOCK_MINUTES || 15);

function parseExpiry(str) {
  const m = String(str).match(/^(\d+)([smhd])$/);
  if (!m) return 12 * 3600;
  const n = Number(m[1]);
  const unit = { s: 1, m: 60, h: 3600, d: 86400 }[m[2]];
  return n * unit;
}

function hashPassword(password, salt) {
  const s = salt || crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, s, 64).toString("hex");
  return { hash, salt: s };
}

function verifyPassword(password, hash, salt) {
  const check = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(check, "hex"));
}

function b64url(buf) {
  return Buffer.from(buf)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function signToken(payload) {
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = {
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + parseExpiry(JWT_EXPIRES),
  };
  const data = b64url(JSON.stringify(body));
  const sig = b64url(crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${data}`).digest());
  return `${header}.${data}.${sig}`;
}

function verifyToken(token) {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [h, d, s] = parts;
  const expected = b64url(crypto.createHmac("sha256", JWT_SECRET).update(`${h}.${d}`).digest());
  if (s.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(s), Buffer.from(expected))) return null;
  const payload = JSON.parse(Buffer.from(d.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString());
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

function sanitizeUser(u) {
  if (!u) return null;
  const { password_hash, salt, two_factor_secret, ...rest } = u;
  return rest;
}

function createUser({ email, password, name, role, ngo_id, phone, status }) {
  const existing = get("SELECT id FROM users WHERE email = ?", [email.toLowerCase()]);
  if (existing) throw Object.assign(new Error("Email already registered"), { status: 409 });
  const { hash, salt } = hashPassword(password);
  return insert("users", {
    email: email.toLowerCase(),
    phone: phone || null,
    password_hash: hash,
    salt,
    name,
    role,
    ngo_id: ngo_id || null,
    status: status || "active",
    email_verified: 1,
  });
}

function login(email, password) {
  const user = get("SELECT * FROM users WHERE email = ?", [email.toLowerCase()]);
  if (!user) throw Object.assign(new Error("Invalid credentials"), { status: 401 });
  if (user.status === "locked" || (user.locked_until && new Date(user.locked_until) > new Date())) {
    throw Object.assign(new Error("Account locked. Try later."), { status: 423 });
  }
  if (user.status === "inactive" || user.status === "suspended") {
    throw Object.assign(new Error("Account is not active"), { status: 403 });
  }
  let ok = false;
  try {
    ok = verifyPassword(password, user.password_hash, user.salt);
  } catch {
    ok = false;
  }
  if (!ok) {
    const fails = (user.failed_logins || 0) + 1;
    const patch = { failed_logins: fails };
    if (fails >= MAX_ATTEMPTS) {
      patch.status = "locked";
      patch.locked_until = new Date(Date.now() + LOCK_MINUTES * 60000).toISOString();
    }
    run(
      `UPDATE users SET failed_logins = ?, status = COALESCE(?, status), locked_until = ? WHERE id = ?`,
      [patch.failed_logins, patch.status || user.status, patch.locked_until || null, user.id]
    );
    throw Object.assign(new Error("Invalid credentials"), { status: 401 });
  }
  run("UPDATE users SET failed_logins = 0, locked_until = NULL, status = 'active' WHERE id = ?", [user.id]);
  const token = signToken({ sub: user.id, role: user.role, ngo_id: user.ngo_id, email: user.email });
  return { token, user: sanitizeUser(user) };
}

function requireAuth(req) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : (req.cookies && req.cookies.token) || "";
  const payload = verifyToken(token);
  if (!payload) throw Object.assign(new Error("Unauthorized"), { status: 401 });
  const user = get("SELECT * FROM users WHERE id = ?", [payload.sub]);
  if (!user || user.status !== "active") throw Object.assign(new Error("Unauthorized"), { status: 401 });
  return user;
}

function requireRole(user, roles) {
  if (!roles.includes(user.role) && user.role !== "super_admin") {
    throw Object.assign(new Error("Permission denied"), { status: 403 });
  }
}

function tenantNgoId(user, requested) {
  if (user.role === "super_admin") return requested ? Number(requested) : null;
  return user.ngo_id;
}

function assertNgoAccess(user, ngoId) {
  if (user.role === "super_admin") return;
  if (!ngoId || Number(ngoId) !== Number(user.ngo_id)) {
    throw Object.assign(new Error("Tenant isolation: access denied"), { status: 403 });
  }
}

function randomToken() {
  return crypto.randomBytes(24).toString("hex");
}

function otpCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

module.exports = {
  hashPassword,
  verifyPassword,
  signToken,
  verifyToken,
  sanitizeUser,
  createUser,
  login,
  requireAuth,
  requireRole,
  tenantNgoId,
  assertNgoAccess,
  randomToken,
  otpCode,
};
