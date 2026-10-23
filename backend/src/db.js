const { DatabaseSync } = require("node:sqlite");
const fs = require("node:fs");
const path = require("node:path");

const DATA_DIR = process.env.DATABASE_PATH
  ? path.dirname(process.env.DATABASE_PATH)
  : path.join(__dirname, "..", "data");
const DB_PATH = process.env.DATABASE_PATH || path.join(DATA_DIR, "sevasetu.db");

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(process.env.STORAGE_PATH || path.join(DATA_DIR, "uploads"), { recursive: true });
fs.mkdirSync(process.env.BACKUP_PATH || path.join(DATA_DIR, "backups"), { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");
db.exec("PRAGMA busy_timeout = 5000;");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  ngo_id INTEGER,
  status TEXT NOT NULL DEFAULT 'active',
  email_verified INTEGER NOT NULL DEFAULT 0,
  phone_verified INTEGER NOT NULL DEFAULT 0,
  two_factor_enabled INTEGER NOT NULL DEFAULT 0,
  two_factor_secret TEXT,
  failed_logins INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT,
  language TEXT NOT NULL DEFAULT 'en',
  avatar TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS password_resets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS otp_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  phone TEXT,
  email TEXT,
  code TEXT NOT NULL,
  purpose TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS ngos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  logo TEXT,
  registration_number TEXT,
  ngo_type TEXT,
  cause TEXT,
  about TEXT,
  mission TEXT,
  address TEXT,
  state TEXT,
  district TEXT,
  city TEXT,
  pin_code TEXT,
  lat REAL,
  lng REAL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  website TEXT,
  bank_name TEXT,
  bank_account TEXT,
  bank_ifsc TEXT,
  pan TEXT,
  info_12a TEXT,
  info_80g TEXT,
  fcra TEXT,
  verification_status TEXT NOT NULL DEFAULT 'pending',
  approval_status TEXT NOT NULL DEFAULT 'pending',
  approval_reason TEXT,
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ngo_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ngo_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  role TEXT NOT NULL,
  UNIQUE(ngo_id, user_id)
);

CREATE TABLE IF NOT EXISTS beneficiaries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ngo_id INTEGER NOT NULL,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  photo TEXT,
  dob TEXT,
  gender TEXT,
  guardian_name TEXT,
  guardian_id INTEGER,
  phone TEXT,
  address TEXT,
  state TEXT,
  district TEXT,
  city TEXT,
  family_income REAL,
  family_members INTEGER,
  school TEXT,
  class_name TEXT,
  education_status TEXT,
  special_requirements TEXT,
  id_ref TEXT,
  verification_status TEXT NOT NULL DEFAULT 'pending',
  case_worker_id INTEGER,
  qr_code TEXT,
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS guardians (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ngo_id INTEGER NOT NULL,
  user_id INTEGER,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  relation TEXT,
  address TEXT
);

CREATE TABLE IF NOT EXISTS schools (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ngo_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  type TEXT
);

CREATE TABLE IF NOT EXISTS classes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ngo_id INTEGER NOT NULL,
  school_id INTEGER,
  name TEXT NOT NULL,
  section TEXT,
  academic_year TEXT,
  teacher_id INTEGER
);

CREATE TABLE IF NOT EXISTS subjects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ngo_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  class_id INTEGER
);

CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ngo_id INTEGER NOT NULL,
  user_id INTEGER,
  beneficiary_id INTEGER,
  school_id INTEGER,
  class_id INTEGER,
  roll_no TEXT,
  name TEXT NOT NULL,
  photo TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  qr_code TEXT,
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ngo_id INTEGER NOT NULL,
  student_id INTEGER NOT NULL,
  class_id INTEGER,
  date TEXT NOT NULL,
  status TEXT NOT NULL,
  marked_by INTEGER,
  synced INTEGER NOT NULL DEFAULT 1,
  UNIQUE(student_id, date)
);

CREATE TABLE IF NOT EXISTS assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ngo_id INTEGER NOT NULL,
  class_id INTEGER,
  teacher_id INTEGER,
  title TEXT NOT NULL,
  description TEXT,
  due_date TEXT,
  material_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS exams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ngo_id INTEGER NOT NULL,
  class_id INTEGER,
  subject_id INTEGER,
  name TEXT NOT NULL,
  exam_date TEXT,
  max_marks INTEGER
);

CREATE TABLE IF NOT EXISTS results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ngo_id INTEGER NOT NULL,
  exam_id INTEGER NOT NULL,
  student_id INTEGER NOT NULL,
  marks REAL,
  grade TEXT,
  remarks TEXT
);

CREATE TABLE IF NOT EXISTS certificates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ngo_id INTEGER NOT NULL,
  student_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  issued_on TEXT,
  file_url TEXT
);

CREATE TABLE IF NOT EXISTS donors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ngo_id INTEGER,
  user_id INTEGER,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  city TEXT,
  pan TEXT,
  preferences TEXT,
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS campaigns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ngo_id INTEGER NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  goal_amount REAL NOT NULL DEFAULT 0,
  raised_amount REAL NOT NULL DEFAULT 0,
  start_date TEXT,
  end_date TEXT,
  description TEXT,
  images TEXT,
  videos TEXT,
  location TEXT,
  impact_target TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS donations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ngo_id INTEGER,
  donor_id INTEGER,
  campaign_id INTEGER,
  type TEXT NOT NULL DEFAULT 'money',
  amount REAL NOT NULL DEFAULT 0,
  frequency TEXT NOT NULL DEFAULT 'one-time',
  status TEXT NOT NULL DEFAULT 'pending',
  payment_provider TEXT,
  payment_ref TEXT,
  items_json TEXT,
  notes TEXT,
  receipt_no TEXT,
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS donation_receipts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  donation_id INTEGER NOT NULL,
  receipt_no TEXT UNIQUE NOT NULL,
  issued_on TEXT NOT NULL,
  pdf_path TEXT
);

CREATE TABLE IF NOT EXISTS sponsorships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ngo_id INTEGER NOT NULL,
  donor_id INTEGER NOT NULL,
  beneficiary_id INTEGER,
  student_id INTEGER,
  type TEXT NOT NULL,
  frequency TEXT NOT NULL,
  amount_committed REAL NOT NULL,
  amount_received REAL NOT NULL DEFAULT 0,
  amount_utilized REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS warehouses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ngo_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  manager TEXT,
  contact TEXT,
  capacity INTEGER,
  qr_code TEXT
);

CREATE TABLE IF NOT EXISTS inventory_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  parent TEXT,
  kind TEXT
);

CREATE TABLE IF NOT EXISTS inventory_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ngo_id INTEGER NOT NULL,
  category TEXT NOT NULL,
  item_name TEXT NOT NULL,
  brand TEXT,
  size TEXT,
  gender TEXT,
  color TEXT,
  quantity INTEGER NOT NULL DEFAULT 0,
  available INTEGER NOT NULL DEFAULT 0,
  reserved INTEGER NOT NULL DEFAULT 0,
  distributed INTEGER NOT NULL DEFAULT 0,
  condition TEXT,
  purchase_price REAL,
  estimated_value REAL,
  source TEXT,
  donor_id INTEGER,
  warehouse_id INTEGER,
  location TEXT,
  expiry TEXT,
  barcode TEXT,
  images TEXT,
  isbn TEXT,
  author TEXT,
  publisher TEXT,
  language TEXT,
  class_name TEXT,
  unit TEXT,
  low_stock_at INTEGER NOT NULL DEFAULT 5,
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS inventory_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ngo_id INTEGER NOT NULL,
  item_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  from_warehouse_id INTEGER,
  to_warehouse_id INTEGER,
  reference TEXT,
  notes TEXT,
  user_id INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS warehouse_stock (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  warehouse_id INTEGER NOT NULL,
  item_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  UNIQUE(warehouse_id, item_id)
);

CREATE TABLE IF NOT EXISTS item_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ngo_id INTEGER NOT NULL,
  beneficiary_id INTEGER NOT NULL,
  item_type TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'requested',
  reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS distribution_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ngo_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  date TEXT,
  location TEXT,
  lat REAL,
  lng REAL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS distribution_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL,
  item_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS distribution_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ngo_id INTEGER NOT NULL,
  event_id INTEGER,
  beneficiary_id INTEGER NOT NULL,
  item_id INTEGER,
  item_name TEXT,
  quantity INTEGER NOT NULL,
  size TEXT,
  location TEXT,
  staff_id INTEGER,
  volunteer_id INTEGER,
  acknowledgement TEXT,
  synced INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS volunteers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ngo_id INTEGER,
  user_id INTEGER,
  name TEXT NOT NULL,
  photo TEXT,
  email TEXT,
  phone TEXT,
  city TEXT,
  skills TEXT,
  education TEXT,
  profession TEXT,
  languages TEXT,
  availability TEXT,
  emergency_contact TEXT,
  experience TEXT,
  interests TEXT,
  status TEXT NOT NULL DEFAULT 'applied',
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ngo_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  type TEXT,
  date TEXT,
  time TEXT,
  location TEXT,
  lat REAL,
  lng REAL,
  capacity INTEGER,
  registered INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  photos TEXT,
  status TEXT NOT NULL DEFAULT 'upcoming',
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS volunteer_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  volunteer_id INTEGER NOT NULL,
  event_id INTEGER NOT NULL,
  attendance TEXT,
  UNIQUE(volunteer_id, event_id)
);

CREATE TABLE IF NOT EXISTS scholarships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ngo_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  eligibility TEXT,
  income_criteria TEXT,
  education_criteria TEXT,
  location TEXT,
  amount REAL NOT NULL,
  frequency TEXT,
  documents TEXT,
  deadline TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  is_demo INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS scholarship_applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ngo_id INTEGER NOT NULL,
  scholarship_id INTEGER NOT NULL,
  beneficiary_id INTEGER,
  student_id INTEGER,
  status TEXT NOT NULL DEFAULT 'applied',
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ngo_id INTEGER,
  owner_type TEXT NOT NULL,
  owner_id INTEGER NOT NULL,
  category TEXT NOT NULL,
  filename TEXT NOT NULL,
  path TEXT NOT NULL,
  verified INTEGER NOT NULL DEFAULT 0,
  expiry TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ngo_id INTEGER NOT NULL,
  category TEXT NOT NULL,
  amount REAL NOT NULL,
  date TEXT NOT NULL,
  vendor_id INTEGER,
  invoice TEXT,
  project TEXT,
  campaign_id INTEGER,
  payment_method TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS vendors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ngo_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  company TEXT,
  gst TEXT,
  pan TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  bank_info TEXT,
  products TEXT
);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ngo_id INTEGER NOT NULL,
  vendor_id INTEGER NOT NULL,
  po_no TEXT,
  amount REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  date TEXT,
  items_json TEXT
);

CREATE TABLE IF NOT EXISTS assets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ngo_id INTEGER NOT NULL,
  asset_code TEXT,
  name TEXT NOT NULL,
  category TEXT,
  purchase_date TEXT,
  cost REAL,
  location TEXT,
  assigned_to TEXT,
  condition TEXT,
  warranty TEXT,
  amc TEXT,
  status TEXT NOT NULL DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  ngo_id INTEGER,
  channel TEXT NOT NULL DEFAULT 'in-app',
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ngo_id INTEGER,
  from_user_id INTEGER NOT NULL,
  to_user_id INTEGER,
  to_role TEXT,
  subject TEXT,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS blog_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ngo_id INTEGER,
  type TEXT NOT NULL DEFAULT 'blog',
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  images TEXT,
  video TEXT,
  author TEXT,
  category TEXT,
  tags TEXT,
  publish_date TEXT,
  seo_title TEXT,
  seo_description TEXT,
  status TEXT NOT NULL DEFAULT 'published'
);

CREATE TABLE IF NOT EXISTS cms_pages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  seo_title TEXT,
  seo_description TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  ngo_id INTEGER,
  action TEXT NOT NULL,
  object_type TEXT,
  object_id INTEGER,
  before_json TEXT,
  after_json TEXT,
  ip TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS email_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  to_addr TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_ngos_status ON ngos(approval_status);
CREATE INDEX IF NOT EXISTS idx_ben_ngo ON beneficiaries(ngo_id);
CREATE INDEX IF NOT EXISTS idx_students_ngo ON students(ngo_id);
CREATE INDEX IF NOT EXISTS idx_donations_ngo ON donations(ngo_id);
CREATE INDEX IF NOT EXISTS idx_inv_ngo ON inventory_items(ngo_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
`;

db.exec(SCHEMA);

function all(sql, params = []) {
  return db.prepare(sql).all(...params);
}

function get(sql, params = []) {
  return db.prepare(sql).get(...params);
}

function run(sql, params = []) {
  return db.prepare(sql).run(...params);
}

function insert(table, obj) {
  const keys = Object.keys(obj);
  const cols = keys.map((k) => `"${k}"`).join(",");
  const qs = keys.map(() => "?").join(",");
  const res = run(`INSERT INTO ${table} (${cols}) VALUES (${qs})`, keys.map((k) => obj[k]));
  return get(`SELECT * FROM ${table} WHERE id = ?`, [res.lastInsertRowid]);
}

function update(table, id, obj) {
  const keys = Object.keys(obj);
  if (!keys.length) return get(`SELECT * FROM ${table} WHERE id = ?`, [id]);
  const set = keys.map((k) => `"${k}" = ?`).join(",");
  run(`UPDATE ${table} SET ${set} WHERE id = ?`, [...keys.map((k) => obj[k]), id]);
  return get(`SELECT * FROM ${table} WHERE id = ?`, [id]);
}

module.exports = { db, all, get, run, insert, update, DB_PATH, DATA_DIR };
