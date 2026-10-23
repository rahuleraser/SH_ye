const { all, get, run, insert, update } = require("./db");
const auth = require("./auth");
const svc = require("./services");
const { send, match, clientIp } = require("./http");
const fs = require("node:fs");
const path = require("node:path");

function ok(res, data) {
  send(res, 200, data);
}

function created(res, data) {
  send(res, 201, data);
}

function userFrom(req) {
  return auth.requireAuth(req);
}

function scoped(user, queryNgo) {
  const ngoId = auth.tenantNgoId(user, queryNgo);
  return ngoId;
}

function whereNgo(user, query, alias) {
  const id = scoped(user, query.ngo_id);
  if (!id) return { sql: "1=1", params: [] };
  return { sql: `${alias ? alias + "." : ""}ngo_id = ?`, params: [id] };
}

function listTable(table, user, query, searchFields, extraWhere) {
  const w = whereNgo(user, query);
  let sql = `SELECT * FROM ${table} WHERE ${w.sql}`;
  const params = [...w.params];
  if (extraWhere) {
    sql += ` AND ${extraWhere.sql}`;
    params.push(...extraWhere.params);
  }
  sql += " ORDER BY id DESC";
  let rows = all(sql, params);
  rows = svc.filterRows(rows, query, searchFields);
  if (query.export === "csv") return { csv: svc.toCsv(rows), rows };
  return svc.paginate(rows, query);
}

function crudGet(table, id, user) {
  const row = get(`SELECT * FROM ${table} WHERE id = ?`, [id]);
  if (!row) throw Object.assign(new Error("Not found"), { status: 404 });
  if (row.ngo_id) auth.assertNgoAccess(user, row.ngo_id);
  return row;
}

async function handle(req, res) {
  const p = req.path.replace(/\/+$/, "") || "/";
  const m = req.method;
  const q = req.query;
  const b = req.body || {};

  if (p === "/api/v1/health") {
    return ok(res, { ok: true, name: "SevaSetu", time: new Date().toISOString() });
  }

  if (p === "/api/v1/settings/public" && m === "GET") {
    const rows = all("SELECT key, value FROM settings");
    const map = {};
    rows.forEach((r) => {
      map[r.key] = r.value;
    });
    return ok(res, map);
  }

  if (p === "/api/v1/impact" && m === "GET") {
    return ok(res, {
      ngos: get("SELECT COUNT(*) c FROM ngos WHERE approval_status='approved'").c,
      beneficiaries: get("SELECT COUNT(*) c FROM beneficiaries").c,
      students: get("SELECT COUNT(*) c FROM students").c,
      scholarships: get("SELECT COUNT(*) c FROM scholarship_applications WHERE status='approved'").c,
      books: get("SELECT COALESCE(SUM(distributed),0) c FROM inventory_items WHERE category='Books'").c,
      clothes: get("SELECT COALESCE(SUM(distributed),0) c FROM inventory_items WHERE category IN ('Clothes','Uniforms')").c,
      meals: get("SELECT COALESCE(SUM(distributed),0) c FROM inventory_items WHERE category='Food'").c,
      volunteers: get("SELECT COUNT(*) c FROM volunteers WHERE status='active'").c,
      donors: get("SELECT COUNT(*) c FROM donors").c,
      funds: get("SELECT COALESCE(SUM(amount),0) c FROM donations WHERE status='successful' AND type='money'").c,
      campaigns: get("SELECT COUNT(*) c FROM campaigns").c,
      events: get("SELECT COUNT(*) c FROM events").c,
      monthly: all(
        `SELECT substr(created_at,1,7) month, SUM(amount) total FROM donations WHERE status='successful' GROUP BY month ORDER BY month`
      ),
      by_state: all(
        `SELECT state, COUNT(*) c FROM beneficiaries GROUP BY state`
      ),
    });
  }

  if (p === "/api/v1/ngos" && m === "GET" && q.scope !== "admin") {
    let rows = all("SELECT * FROM ngos WHERE approval_status = 'approved'");
    rows = svc.filterRows(rows, q, ["name", "city", "state", "cause", "ngo_type"]);
    return ok(res, svc.paginate(rows, q));
  }

  let mm;
  if ((mm = match(p, "/api/v1/ngos/:slug")) && m === "GET" && !/^\d+$/.test(mm.slug)) {
    const ngo = get("SELECT * FROM ngos WHERE slug = ?", [mm.slug]);
    if (!ngo) throw Object.assign(new Error("NGO not found"), { status: 404 });
    const campaigns = all("SELECT * FROM campaigns WHERE ngo_id = ? AND status='active'", [ngo.id]);
    const events = all("SELECT * FROM events WHERE ngo_id = ?", [ngo.id]);
    const stories = all("SELECT * FROM blog_posts WHERE ngo_id = ? OR ngo_id IS NULL LIMIT 6", [ngo.id]);
    return ok(res, { ngo, campaigns, events, stories });
  }

  if (p === "/api/v1/campaigns" && m === "GET" && q.scope !== "admin") {
    let rows = all(
      `SELECT c.*, n.name AS ngo_name, n.slug AS ngo_slug FROM campaigns c JOIN ngos n ON n.id=c.ngo_id WHERE c.status='active'`
    );
    rows = svc.filterRows(rows, q, ["name", "location", "ngo_name"]);
    return ok(res, svc.paginate(rows, q));
  }

  if ((mm = match(p, "/api/v1/campaigns/:slug")) && m === "GET" && !/^\d+$/.test(mm.slug)) {
    const c = get(
      `SELECT c.*, n.name AS ngo_name, n.slug AS ngo_slug FROM campaigns c JOIN ngos n ON n.id=c.ngo_id WHERE c.slug = ?`,
      [mm.slug]
    );
    if (!c) throw Object.assign(new Error("Campaign not found"), { status: 404 });
    const donors = all(
      `SELECT d.amount, d.created_at, dr.name AS donor_name FROM donations d LEFT JOIN donors dr ON dr.id=d.donor_id WHERE d.campaign_id=? AND d.status='successful' ORDER BY d.id DESC LIMIT 20`,
      [c.id]
    );
    return ok(res, { campaign: c, donors });
  }

  if (p === "/api/v1/events/public" && m === "GET") {
    return ok(res, all(`SELECT e.*, n.name AS ngo_name FROM events e JOIN ngos n ON n.id=e.ngo_id ORDER BY e.date`));
  }

  if (p === "/api/v1/blog" && m === "GET") {
    let rows = all("SELECT * FROM blog_posts WHERE status='published' ORDER BY publish_date DESC");
    if (q.type) rows = rows.filter((r) => r.type === q.type);
    return ok(res, rows);
  }

  if ((mm = match(p, "/api/v1/blog/:slug")) && m === "GET") {
    const post = get("SELECT * FROM blog_posts WHERE slug = ?", [mm.slug]);
    if (!post) throw Object.assign(new Error("Not found"), { status: 404 });
    return ok(res, post);
  }

  if (p === "/api/v1/cms" && m === "GET") {
    if (q.slug) return ok(res, get("SELECT * FROM cms_pages WHERE slug = ?", [q.slug]));
    return ok(res, all("SELECT slug, title FROM cms_pages"));
  }

  if (p === "/api/v1/auth/register" && m === "POST") {
    const { email, password, name, role, phone } = b;
    if (!email || !password || !name) throw Object.assign(new Error("email, password, name required"), { status: 400 });
    const allowed = ["donor", "volunteer", "beneficiary", "public", "student"];
    const r = allowed.includes(role) ? role : "donor";
    const user = auth.createUser({ email, password, name, role: r, phone, ngo_id: b.ngo_id || null });
    svc.audit({ user, action: "register", object_type: "user", object_id: user.id, ip: clientIp(req) });
    const token = auth.signToken({ sub: user.id, role: user.role, ngo_id: user.ngo_id, email: user.email });
    return created(res, { token, user: auth.sanitizeUser(user) });
  }

  if (p === "/api/v1/auth/login" && m === "POST") {
    const result = auth.login(b.email || "", b.password || "");
    svc.audit({ user: result.user, action: "login", object_type: "user", object_id: result.user.id, ip: clientIp(req) });
    return ok(res, result);
  }

  if (p === "/api/v1/auth/forgot" && m === "POST") {
    const user = get("SELECT * FROM users WHERE email = ?", [(b.email || "").toLowerCase()]);
    if (user) {
      const token = auth.randomToken();
      insert("password_resets", {
        user_id: user.id,
        token,
        expires_at: new Date(Date.now() + 3600000).toISOString(),
      });
      svc.emailProvider.send({
        to: user.email,
        subject: "SevaSetu password reset",
        body: `Reset token: ${token}`,
      });
    }
    return ok(res, { ok: true, message: "If the email exists, a reset token was sent." });
  }

  if (p === "/api/v1/auth/reset" && m === "POST") {
    const row = get("SELECT * FROM password_resets WHERE token = ? AND used = 0", [b.token]);
    if (!row || new Date(row.expires_at) < new Date()) throw Object.assign(new Error("Invalid token"), { status: 400 });
    const { hash, salt } = auth.hashPassword(b.password);
    run("UPDATE users SET password_hash=?, salt=? WHERE id=?", [hash, salt, row.user_id]);
    run("UPDATE password_resets SET used=1 WHERE id=?", [row.id]);
    return ok(res, { ok: true });
  }

  if (p === "/api/v1/auth/otp/request" && m === "POST") {
    const code = auth.otpCode();
    insert("otp_codes", {
      email: b.email || null,
      phone: b.phone || null,
      code,
      purpose: b.purpose || "verify",
      expires_at: new Date(Date.now() + 10 * 60000).toISOString(),
    });
    if (b.email) svc.emailProvider.send({ to: b.email, subject: "SevaSetu OTP", body: `Your code is ${code}` });
    return ok(res, { ok: true, demo_code: code });
  }

  if (p === "/api/v1/auth/otp/verify" && m === "POST") {
    const row = get(
      "SELECT * FROM otp_codes WHERE code = ? AND used = 0 AND (email = ? OR phone = ?) ORDER BY id DESC",
      [b.code, b.email || "", b.phone || ""]
    );
    if (!row || new Date(row.expires_at) < new Date()) throw Object.assign(new Error("Invalid OTP"), { status: 400 });
    run("UPDATE otp_codes SET used=1 WHERE id=?", [row.id]);
    if (row.email) run("UPDATE users SET email_verified=1 WHERE email=?", [row.email]);
    return ok(res, { ok: true });
  }

  // Authenticated routes below
  const needAuth =
    p.startsWith("/api/v1/") &&
    ![
      "/api/v1/health",
      "/api/v1/settings/public",
      "/api/v1/impact",
      "/api/v1/ngos",
      "/api/v1/campaigns",
      "/api/v1/events/public",
      "/api/v1/blog",
      "/api/v1/cms",
      "/api/v1/auth/register",
      "/api/v1/auth/login",
      "/api/v1/auth/forgot",
      "/api/v1/auth/reset",
      "/api/v1/auth/otp/request",
      "/api/v1/auth/otp/verify",
    ].includes(p) &&
    !p.startsWith("/api/v1/ngos/") &&
    !p.startsWith("/api/v1/campaigns/") &&
    !p.startsWith("/api/v1/blog/");

  if (p === "/api/v1/donations/public" && m === "POST") {
    const campaign = b.campaign_id ? get("SELECT * FROM campaigns WHERE id = ?", [b.campaign_id]) : null;
    const provider = svc.getPaymentProvider();
    const pay = await provider.charge({ amount: Number(b.amount || 0), reference: "public-donate", method: b.method });
    let donor = null;
    if (b.email) {
      donor = get("SELECT * FROM donors WHERE email = ?", [b.email]);
      if (!donor) {
        donor = insert("donors", {
          ngo_id: campaign ? campaign.ngo_id : null,
          name: b.name || "Guest Donor",
          email: b.email,
          phone: b.phone || null,
          city: b.city || null,
        });
      }
    }
    const receipt = svc.receiptNo();
    const donation = insert("donations", {
      ngo_id: campaign ? campaign.ngo_id : null,
      donor_id: donor ? donor.id : null,
      campaign_id: campaign ? campaign.id : null,
      type: "money",
      amount: Number(b.amount || 0),
      frequency: b.frequency || "one-time",
      status: pay.status,
      payment_provider: pay.provider,
      payment_ref: pay.payment_ref,
      notes: b.notes || null,
      receipt_no: receipt,
    });
    insert("donation_receipts", {
      donation_id: donation.id,
      receipt_no: receipt,
      issued_on: new Date().toISOString().slice(0, 10),
    });
    if (campaign) {
      run("UPDATE campaigns SET raised_amount = raised_amount + ? WHERE id = ?", [donation.amount, campaign.id]);
    }
    svc.notify({
      ngo_id: donation.ngo_id,
      title: "Donation successful",
      body: `Receipt ${receipt} for INR ${donation.amount}`,
    });
    return created(res, { donation, receipt, payment: pay });
  }

  if (p === "/api/v1/volunteers/apply" && m === "POST") {
    const v = insert("volunteers", {
      ngo_id: b.ngo_id || null,
      name: b.name,
      email: b.email,
      phone: b.phone,
      city: b.city,
      skills: b.skills,
      education: b.education,
      profession: b.profession,
      languages: b.languages,
      availability: b.availability,
      emergency_contact: b.emergency_contact,
      experience: b.experience,
      interests: b.interests,
      status: "applied",
    });
    return created(res, v);
  }

  if (p === "/api/v1/support/apply" && m === "POST") {
    const ngoId = Number(b.ngo_id);
    if (!ngoId) throw Object.assign(new Error("ngo_id required"), { status: 400 });
    const ben = insert("beneficiaries", {
      ngo_id: ngoId,
      code: svc.nextCode("BEN", "beneficiaries"),
      name: b.name,
      phone: b.phone,
      city: b.city,
      state: b.state,
      guardian_name: b.guardian_name,
      education_status: "applied",
      verification_status: "pending",
      qr_code: svc.qrPayload("beneficiary", Date.now()),
    });
    return created(res, { ok: true, code: ben.code, message: "Application submitted for NGO review." });
  }

  if (p === "/api/v1/contact" && m === "POST") {
    svc.emailProvider.send({
      to: "hello@abcyz.in",
      subject: `Contact: ${b.subject || "Website"}`,
      body: `${b.name} <${b.email}>: ${b.message}`,
    });
    return ok(res, { ok: true });
  }

  let user = null;
  const publicOk =
    (p.startsWith("/api/v1/ngos/") && m === "GET") ||
    (p.startsWith("/api/v1/campaigns/") && m === "GET") ||
    (p.startsWith("/api/v1/blog/") && m === "GET") ||
    p === "/api/v1/donations/public" ||
    p === "/api/v1/volunteers/apply" ||
    p === "/api/v1/support/apply" ||
    p === "/api/v1/contact";

  if (!publicOk && p.startsWith("/api/v1/") && !p.startsWith("/api/v1/auth/") && p !== "/api/v1/health") {
    const open = [
      "/api/v1/settings/public",
      "/api/v1/impact",
      "/api/v1/ngos",
      "/api/v1/campaigns",
      "/api/v1/events/public",
      "/api/v1/blog",
      "/api/v1/cms",
    ];
    if (!open.includes(p)) user = userFrom(req);
  }

  if (p === "/api/v1/auth/me" && m === "GET") {
    user = userFrom(req);
    return ok(res, auth.sanitizeUser(user));
  }

  if (p === "/api/v1/auth/logout" && m === "POST") {
    user = userFrom(req);
    svc.audit({ user, action: "logout", object_type: "user", object_id: user.id, ip: clientIp(req) });
    return ok(res, { ok: true });
  }

  if (p === "/api/v1/auth/password" && m === "POST") {
    user = userFrom(req);
    const full = get("SELECT * FROM users WHERE id = ?", [user.id]);
    if (!auth.verifyPassword(b.current || "", full.password_hash, full.salt)) {
      throw Object.assign(new Error("Current password incorrect"), { status: 400 });
    }
    const { hash, salt } = auth.hashPassword(b.password);
    run("UPDATE users SET password_hash=?, salt=? WHERE id=?", [hash, salt, user.id]);
    return ok(res, { ok: true });
  }

  if (p === "/api/v1/profile" && m === "PUT") {
    user = userFrom(req);
    const u = update("users", user.id, {
      name: b.name || user.name,
      phone: b.phone || user.phone,
      language: b.language || user.language,
      avatar: b.avatar || user.avatar,
    });
    return ok(res, auth.sanitizeUser(u));
  }

  user = user || null;
  const authed = () => {
    if (!user) user = userFrom(req);
    return user;
  };

  if (p === "/api/v1/dashboard" && m === "GET") {
    const u = authed();
    const ngoFilter = u.role === "super_admin" ? "" : " AND ngo_id = " + Number(u.ngo_id);
    const cards = {
      ngos: get("SELECT COUNT(*) c FROM ngos").c,
      pending_ngos: get("SELECT COUNT(*) c FROM ngos WHERE approval_status='pending'").c,
      users: get("SELECT COUNT(*) c FROM users").c,
      beneficiaries: get(`SELECT COUNT(*) c FROM beneficiaries WHERE 1=1${u.role === "super_admin" ? "" : " AND ngo_id=" + u.ngo_id}`).c,
      students: get(`SELECT COUNT(*) c FROM students WHERE 1=1${u.role === "super_admin" ? "" : " AND ngo_id=" + u.ngo_id}`).c,
      donors: get(`SELECT COUNT(*) c FROM donors WHERE 1=1${u.role === "super_admin" ? "" : " AND ngo_id=" + u.ngo_id}`).c,
      volunteers: get(`SELECT COUNT(*) c FROM volunteers WHERE 1=1${u.role === "super_admin" ? "" : " AND ngo_id=" + u.ngo_id}`).c,
      donations: get(`SELECT COALESCE(SUM(amount),0) c FROM donations WHERE status='successful'${u.role === "super_admin" ? "" : " AND ngo_id=" + u.ngo_id}`).c,
      month_donations: get(
        `SELECT COALESCE(SUM(amount),0) c FROM donations WHERE status='successful' AND substr(created_at,1,7)=substr(datetime('now'),1,7)${u.role === "super_admin" ? "" : " AND ngo_id=" + u.ngo_id}`
      ).c,
      inventory: get(`SELECT COUNT(*) c FROM inventory_items WHERE 1=1${u.role === "super_admin" ? "" : " AND ngo_id=" + u.ngo_id}`).c,
      low_stock: get(`SELECT COUNT(*) c FROM inventory_items WHERE available <= low_stock_at${u.role === "super_admin" ? "" : " AND ngo_id=" + u.ngo_id}`).c,
      campaigns: get(`SELECT COUNT(*) c FROM campaigns WHERE 1=1${u.role === "super_admin" ? "" : " AND ngo_id=" + u.ngo_id}`).c,
      events: get(`SELECT COUNT(*) c FROM events WHERE 1=1${u.role === "super_admin" ? "" : " AND ngo_id=" + u.ngo_id}`).c,
      pending_requests: get(`SELECT COUNT(*) c FROM item_requests WHERE status IN ('requested','under_review')${u.role === "super_admin" ? "" : " AND ngo_id=" + u.ngo_id}`).c,
      expenses: get(`SELECT COALESCE(SUM(amount),0) c FROM expenses WHERE status='paid'${u.role === "super_admin" ? "" : " AND ngo_id=" + u.ngo_id}`).c,
    };
    const trends = all(
      `SELECT substr(created_at,1,7) month, SUM(amount) total FROM donations WHERE status='successful'${u.role === "super_admin" ? "" : " AND ngo_id=" + u.ngo_id} GROUP BY month`
    );
    return ok(res, { user: auth.sanitizeUser(u), cards, trends });
  }

  if (p === "/api/v1/search" && m === "GET") {
    const u = authed();
    const term = `%${q.q || ""}%`;
    const ngo = u.role === "super_admin" ? null : u.ngo_id;
    const add = ngo ? " AND ngo_id = " + ngo : "";
    return ok(res, {
      ngos: all("SELECT id,name,slug,city FROM ngos WHERE name LIKE ? LIMIT 8", [term]),
      beneficiaries: all(`SELECT id,code,name,city FROM beneficiaries WHERE name LIKE ?${add} LIMIT 8`, [term]),
      students: all(`SELECT id,name,roll_no FROM students WHERE name LIKE ?${add} LIMIT 8`, [term]),
      donors: all(`SELECT id,name,email FROM donors WHERE name LIKE ?${add} LIMIT 8`, [term]),
      inventory: all(`SELECT id,item_name,category FROM inventory_items WHERE item_name LIKE ?${add} LIMIT 8`, [term]),
      campaigns: all(`SELECT id,name,slug FROM campaigns WHERE name LIKE ?${add} LIMIT 8`, [term]),
      events: all(`SELECT id,name,date FROM events WHERE name LIKE ?${add} LIMIT 8`, [term]),
    });
  }

  if (p === "/api/v1/notifications" && m === "GET") {
    const u = authed();
    const rows = all(
      "SELECT * FROM notifications WHERE user_id = ? OR (ngo_id = ? AND user_id IS NULL) OR (user_id IS NULL AND ngo_id IS NULL) ORDER BY id DESC LIMIT 50",
      [u.id, u.ngo_id]
    );
    return ok(res, rows);
  }

  if ((mm = match(p, "/api/v1/notifications/:id/read")) && m === "POST") {
    authed();
    run("UPDATE notifications SET read = 1 WHERE id = ?", [mm.id]);
    return ok(res, { ok: true });
  }

  if (p === "/api/v1/messages" && m === "GET") {
    const u = authed();
    return ok(res, all("SELECT * FROM messages WHERE from_user_id = ? OR to_user_id = ? ORDER BY id DESC LIMIT 100", [u.id, u.id]));
  }
  if (p === "/api/v1/messages" && m === "POST") {
    const u = authed();
    return created(res, insert("messages", {
      ngo_id: u.ngo_id,
      from_user_id: u.id,
      to_user_id: b.to_user_id || null,
      to_role: b.to_role || null,
      subject: b.subject || "",
      body: b.body,
    }));
  }

  // Generic resource router
  const resources = {
    users: { table: "users", search: ["name", "email", "role"], roles: ["super_admin"] },
    ngos: { table: "ngos", search: ["name", "city", "state", "cause"], roles: ["super_admin", "ngo_admin"] },
    beneficiaries: { table: "beneficiaries", search: ["name", "code", "city"] },
    students: { table: "students", search: ["name", "roll_no"] },
    schools: { table: "schools", search: ["name", "city"] },
    classes: { table: "classes", search: ["name"] },
    subjects: { table: "subjects", search: ["name"] },
    attendance: { table: "attendance", search: ["date", "status"] },
    assignments: { table: "assignments", search: ["title"] },
    exams: { table: "exams", search: ["name"] },
    results: { table: "results", search: ["grade"] },
    certificates: { table: "certificates", search: ["title"] },
    donors: { table: "donors", search: ["name", "email", "city"] },
    donations: { table: "donations", search: ["type", "status", "receipt_no"] },
    campaigns: { table: "campaigns", search: ["name", "status"] },
    sponsorships: { table: "sponsorships", search: ["type", "status"] },
    warehouses: { table: "warehouses", search: ["name", "address"] },
    inventory: { table: "inventory_items", search: ["item_name", "category", "barcode"] },
    "inventory-transactions": { table: "inventory_transactions", search: ["type", "reference"] },
    requests: { table: "item_requests", search: ["item_type", "status"] },
    distributions: { table: "distribution_events", search: ["name", "location"] },
    "distribution-records": { table: "distribution_records", search: ["item_name"] },
    volunteers: { table: "volunteers", search: ["name", "email", "skills", "city"] },
    events: { table: "events", search: ["name", "type", "location"] },
    scholarships: { table: "scholarships", search: ["name"] },
    "scholarship-applications": { table: "scholarship_applications", search: ["status"] },
    documents: { table: "documents", search: ["category", "filename"] },
    expenses: { table: "expenses", search: ["category", "status"] },
    vendors: { table: "vendors", search: ["name", "company"] },
    "purchase-orders": { table: "purchase_orders", search: ["po_no", "status"] },
    assets: { table: "assets", search: ["name", "asset_code"] },
    "blog-posts": { table: "blog_posts", search: ["title", "type"] },
    "cms-pages": { table: "cms_pages", search: ["title", "slug"] },
    "audit-logs": { table: "audit_logs", search: ["action", "object_type"], roles: ["super_admin"] },
  };

  for (const [key, conf] of Object.entries(resources)) {
    const base = `/api/v1/${key}`;
    if (p === base && m === "GET") {
      const u = authed();
      if (conf.roles) auth.requireRole(u, conf.roles);
      const result = listTable(conf.table, u, q, conf.search);
      if (result.csv) {
        send(res, 200, result.csv, { "Content-Type": "text/csv", "Content-Disposition": `attachment; filename=${key}.csv` });
        return;
      }
      return ok(res, result);
    }
    if (p === base && m === "POST") {
      const u = authed();
      if (conf.roles) auth.requireRole(u, conf.roles);
      const payload = { ...b };
      if (conf.table !== "users" && conf.table !== "cms_pages" && conf.table !== "blog_posts" && conf.table !== "audit_logs") {
        payload.ngo_id = payload.ngo_id || u.ngo_id;
        if (u.role !== "super_admin") payload.ngo_id = u.ngo_id;
      }
      if (conf.table === "users") {
        const createdU = auth.createUser(payload);
        svc.audit({ user: u, action: "create", object_type: "user", object_id: createdU.id, after: { email: createdU.email }, ip: clientIp(req) });
        return created(res, auth.sanitizeUser(createdU));
      }
      if (conf.table === "beneficiaries" && !payload.code) payload.code = svc.nextCode("BEN", "beneficiaries");
      if (conf.table === "campaigns" && !payload.slug) payload.slug = String(payload.name || "campaign").toLowerCase().replace(/[^a-z0-9]+/g, "-");
      if (conf.table === "ngos" && !payload.slug) payload.slug = String(payload.name || "ngo").toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const row = insert(conf.table, payload);
      svc.audit({ user: u, action: "create", object_type: conf.table, object_id: row.id, after: row, ip: clientIp(req) });
      return created(res, row);
    }
    if ((mm = match(p, `${base}/:id`)) && m === "GET") {
      const u = authed();
      return ok(res, crudGet(conf.table, mm.id, u));
    }
    if ((mm = match(p, `${base}/:id`)) && (m === "PUT" || m === "PATCH")) {
      const u = authed();
      const before = crudGet(conf.table, mm.id, u);
      const row = update(conf.table, mm.id, b);
      svc.audit({ user: u, action: "update", object_type: conf.table, object_id: row.id, before, after: row, ip: clientIp(req) });
      return ok(res, row);
    }
    if ((mm = match(p, `${base}/:id`)) && m === "DELETE") {
      const u = authed();
      const before = crudGet(conf.table, mm.id, u);
      run(`DELETE FROM ${conf.table} WHERE id = ?`, [mm.id]);
      svc.audit({ user: u, action: "delete", object_type: conf.table, object_id: Number(mm.id), before, ip: clientIp(req) });
      return ok(res, { ok: true });
    }
  }

  if ((mm = match(p, "/api/v1/ngos/:id/approve")) && m === "POST") {
    const u = authed();
    auth.requireRole(u, ["super_admin"]);
    const row = update("ngos", mm.id, { approval_status: b.status || "approved", approval_reason: b.reason || "", verification_status: b.status === "approved" ? "verified" : "pending" });
    svc.audit({ user: u, action: b.status || "approve", object_type: "ngos", object_id: row.id, after: row, ip: clientIp(req) });
    return ok(res, row);
  }

  if (p === "/api/v1/inventory/stock" && m === "POST") {
    const u = authed();
    const item = crudGet("inventory_items", b.item_id, u);
    const qty = Number(b.quantity);
    const type = b.type;
    let available = item.available;
    let reserved = item.reserved;
    let distributed = item.distributed;
    let quantity = item.quantity;
    if (type === "in") {
      available += qty;
      quantity += qty;
    } else if (type === "out") {
      available -= qty;
      quantity -= qty;
    } else if (type === "reserve") {
      available -= qty;
      reserved += qty;
    } else if (type === "distribute") {
      if (reserved >= qty) reserved -= qty;
      else available -= qty;
      distributed += qty;
    } else if (type === "return") {
      available += qty;
      distributed = Math.max(0, distributed - qty);
    } else if (type === "adjust") {
      available = qty;
      quantity = qty + reserved + distributed;
    } else if (type === "damaged" || type === "lost") {
      available -= qty;
      quantity -= qty;
    }
    const updated = update("inventory_items", item.id, { available, reserved, distributed, quantity, updated_at: new Date().toISOString() });
    insert("inventory_transactions", {
      ngo_id: item.ngo_id,
      item_id: item.id,
      type,
      quantity: qty,
      from_warehouse_id: b.from_warehouse_id || null,
      to_warehouse_id: b.to_warehouse_id || null,
      reference: b.reference || null,
      notes: b.notes || null,
      user_id: u.id,
    });
    if (type === "transfer" && b.from_warehouse_id && b.to_warehouse_id) {
      insert("inventory_transactions", {
        ngo_id: item.ngo_id,
        item_id: item.id,
        type: "transfer",
        quantity: qty,
        from_warehouse_id: b.from_warehouse_id,
        to_warehouse_id: b.to_warehouse_id,
        user_id: u.id,
      });
    }
    if (updated.available <= updated.low_stock_at) {
      svc.notify({ ngo_id: item.ngo_id, title: "Low stock", body: `${item.item_name} is low (${updated.available})` });
    }
    return ok(res, updated);
  }

  if ((mm = match(p, "/api/v1/requests/:id/workflow")) && m === "POST") {
    const u = authed();
    const row = crudGet("item_requests", mm.id, u);
    const next = b.status;
    const allowed = ["requested", "under_review", "approved", "reserved", "scheduled", "distributed", "completed", "rejected"];
    if (!allowed.includes(next)) throw Object.assign(new Error("Invalid status"), { status: 400 });
    const updated = update("item_requests", row.id, { status: next, reason: b.reason || row.reason, updated_at: new Date().toISOString() });
    return ok(res, updated);
  }

  if ((mm = match(p, "/api/v1/scholarships/:id/workflow")) && m === "POST") {
    const u = authed();
    const row = crudGet("scholarship_applications", mm.id, u);
    const updated = update("scholarship_applications", row.id, { status: b.status, notes: b.notes || row.notes, updated_at: new Date().toISOString() });
    if (b.status === "approved") svc.notify({ ngo_id: row.ngo_id, title: "Scholarship approved", body: `Application #${row.id} approved` });
    return ok(res, updated);
  }

  if ((mm = match(p, "/api/v1/expenses/:id/workflow")) && m === "POST") {
    const u = authed();
    const row = crudGet("expenses", mm.id, u);
    return ok(res, update("expenses", row.id, { status: b.status }));
  }

  if ((mm = match(p, "/api/v1/volunteers/:id/status")) && m === "POST") {
    const u = authed();
    const row = crudGet("volunteers", mm.id, u);
    const updated = update("volunteers", row.id, { status: b.status });
    if (b.status === "approved" || b.status === "active") {
      svc.notify({ ngo_id: row.ngo_id, title: "Volunteer approved", body: `${row.name} is now ${b.status}` });
    }
    return ok(res, updated);
  }

  if (p === "/api/v1/distributions/record" && m === "POST") {
    const u = authed();
    const rec = insert("distribution_records", {
      ngo_id: u.ngo_id || b.ngo_id,
      event_id: b.event_id || null,
      beneficiary_id: b.beneficiary_id,
      item_id: b.item_id || null,
      item_name: b.item_name,
      quantity: Number(b.quantity || 1),
      size: b.size || null,
      location: b.location || null,
      staff_id: u.id,
      volunteer_id: b.volunteer_id || null,
      acknowledgement: b.acknowledgement || "recorded",
      synced: b.synced === 0 ? 0 : 1,
    });
    if (b.item_id) {
      const item = get("SELECT * FROM inventory_items WHERE id = ?", [b.item_id]);
      if (item) {
        update("inventory_items", item.id, {
          available: item.available - Number(b.quantity || 1),
          distributed: item.distributed + Number(b.quantity || 1),
        });
      }
    }
    return created(res, rec);
  }

  if (p === "/api/v1/sync/offline" && m === "POST") {
    const u = authed();
    const records = Array.isArray(b.records) ? b.records : [];
    const saved = [];
    for (const r of records) {
      saved.push(
        insert("distribution_records", {
          ngo_id: u.ngo_id || r.ngo_id,
          event_id: r.event_id || null,
          beneficiary_id: r.beneficiary_id,
          item_id: r.item_id || null,
          item_name: r.item_name,
          quantity: Number(r.quantity || 1),
          size: r.size || null,
          location: r.location || null,
          staff_id: u.id,
          acknowledgement: r.acknowledgement || "offline-sync",
          synced: 1,
        })
      );
    }
    const att = Array.isArray(b.attendance) ? b.attendance : [];
    for (const a of att) {
      try {
        insert("attendance", {
          ngo_id: u.ngo_id,
          student_id: a.student_id,
          class_id: a.class_id || null,
          date: a.date,
          status: a.status,
          marked_by: u.id,
          synced: 1,
        });
      } catch {
        /* unique date conflict — keep first */
      }
    }
    return ok(res, { saved: saved.length, attendance: att.length });
  }

  if (p === "/api/v1/qr/:kind/:id" && m === "GET") {
    authed();
    return ok(res, { payload: svc.qrPayload(req.path.split("/")[4], req.path.split("/")[5]) });
  }

  if ((mm = match(p, "/api/v1/qr/:kind/:id")) && m === "GET") {
    const u = authed();
    const kind = mm.kind;
    const map = {
      beneficiary: "beneficiaries",
      student: "students",
      donation: "donations",
      inventory: "inventory_items",
      warehouse: "warehouses",
      campaign: "campaigns",
      event: "events",
      distribution: "distribution_records",
    };
    const table = map[kind];
    if (!table) throw Object.assign(new Error("Unknown QR kind"), { status: 400 });
    const row = crudGet(table, mm.id, u);
    return ok(res, { kind, payload: svc.qrPayload(kind, mm.id), record: row });
  }

  if (p === "/api/v1/barcode/scan" && m === "POST") {
    const u = authed();
    const item = get("SELECT * FROM inventory_items WHERE barcode = ?", [b.barcode]);
    if (!item) throw Object.assign(new Error("Barcode not found"), { status: 404 });
    auth.assertNgoAccess(u, item.ngo_id);
    return ok(res, item);
  }

  if (p === "/api/v1/reports/:type" || (mm = match(p, "/api/v1/reports/:type"))) {
    if (m === "GET") {
      const u = authed();
      const type = (mm && mm.type) || p.split("/").pop();
      const tables = {
        donations: "donations",
        inventory: "inventory_items",
        distribution: "distribution_records",
        beneficiaries: "beneficiaries",
        students: "students",
        attendance: "attendance",
        scholarships: "scholarship_applications",
        expenses: "expenses",
        volunteers: "volunteers",
        campaigns: "campaigns",
        ngos: "ngos",
      };
      const table = tables[type];
      if (!table) throw Object.assign(new Error("Unknown report"), { status: 404 });
      const result = listTable(table, u, q, ["name", "status"]);
      if (q.export === "csv") {
        send(res, 200, result.csv, { "Content-Type": "text/csv", "Content-Disposition": `attachment; filename=${type}.csv` });
        return;
      }
      return ok(res, result);
    }
  }

  if (p === "/api/v1/import" && m === "POST") {
    const u = authed();
    const kind = b.kind;
    const rows = Array.isArray(b.rows) ? b.rows : svc.parseCsv(b.csv || "");
    const errors = [];
    let imported = 0;
    for (let i = 0; i < rows.length; i++) {
      try {
        const row = rows[i];
        row.ngo_id = u.role === "super_admin" ? Number(row.ngo_id || u.ngo_id) : u.ngo_id;
        if (kind === "beneficiaries") {
          row.code = row.code || svc.nextCode("BEN", "beneficiaries");
          insert("beneficiaries", {
            ngo_id: row.ngo_id,
            code: row.code,
            name: row.name,
            city: row.city,
            state: row.state,
            phone: row.phone,
            verification_status: "pending",
          });
        } else if (kind === "students") {
          insert("students", { ngo_id: row.ngo_id, name: row.name, roll_no: row.roll_no, status: "active" });
        } else if (kind === "inventory") {
          insert("inventory_items", {
            ngo_id: row.ngo_id,
            category: row.category || "Other",
            item_name: row.item_name || row.name,
            quantity: Number(row.quantity || 0),
            available: Number(row.quantity || 0),
          });
        } else if (kind === "donors") {
          insert("donors", { ngo_id: row.ngo_id, name: row.name, email: row.email, phone: row.phone, city: row.city });
        } else if (kind === "ngos") {
          auth.requireRole(u, ["super_admin"]);
          insert("ngos", {
            slug: (row.slug || row.name).toLowerCase().replace(/[^a-z0-9]+/g, "-"),
            name: row.name,
            city: row.city,
            state: row.state,
            cause: row.cause,
            approval_status: "pending",
          });
        } else throw new Error("Unknown import kind");
        imported++;
      } catch (e) {
        errors.push({ row: i + 1, error: e.message });
      }
    }
    return ok(res, { imported, errors, total: rows.length });
  }

  if (p === "/api/v1/import/template" && m === "GET") {
    authed();
    const templates = {
      beneficiaries: "name,city,state,phone,ngo_id",
      students: "name,roll_no,ngo_id",
      inventory: "item_name,category,quantity,ngo_id",
      donors: "name,email,phone,city,ngo_id",
      ngos: "name,slug,city,state,cause",
    };
    send(res, 200, templates[q.kind] || templates.beneficiaries, { "Content-Type": "text/csv" });
    return;
  }

  if (p === "/api/v1/settings" && m === "GET") {
    const u = authed();
    auth.requireRole(u, ["super_admin"]);
    const rows = all("SELECT key, value FROM settings");
    const map = {};
    rows.forEach((r) => {
      map[r.key] = r.value;
    });
    return ok(res, map);
  }
  if (p === "/api/v1/settings" && m === "PUT") {
    const u = authed();
    auth.requireRole(u, ["super_admin"]);
    Object.entries(b).forEach(([k, v]) => {
      run("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", [k, String(v)]);
    });
    svc.audit({ user: u, action: "update", object_type: "settings", ip: clientIp(req) });
    return ok(res, { ok: true });
  }

  if (p === "/api/v1/backup" && m === "POST") {
    const u = authed();
    auth.requireRole(u, ["super_admin"]);
    const destDir = process.env.BACKUP_PATH || path.join(__dirname, "..", "data", "backups");
    fs.mkdirSync(destDir, { recursive: true });
    const dest = path.join(destDir, `sevasetu-${Date.now()}.db`);
    fs.copyFileSync(require("./db").DB_PATH, dest);
    return ok(res, { ok: true, file: path.basename(dest) });
  }

  if (p === "/api/v1/backups" && m === "GET") {
    const u = authed();
    auth.requireRole(u, ["super_admin"]);
    const destDir = process.env.BACKUP_PATH || path.join(__dirname, "..", "data", "backups");
    fs.mkdirSync(destDir, { recursive: true });
    const files = fs.readdirSync(destDir).map((f) => {
      const st = fs.statSync(path.join(destDir, f));
      return { file: f, size: st.size, mtime: st.mtime };
    });
    return ok(res, files);
  }

  if (p === "/api/v1/me/children" && m === "GET") {
    const u = authed();
    return ok(res, all("SELECT * FROM beneficiaries WHERE guardian_id IN (SELECT id FROM guardians WHERE user_id = ?) OR phone = ?", [u.id, u.phone]));
  }

  throw Object.assign(new Error("Not found"), { status: 404 });
}

module.exports = { handle };
