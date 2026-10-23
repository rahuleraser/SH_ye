const fs = require("node:fs");
const path = require("node:path");
const { DB_PATH } = require("./db");

const destDir = process.env.BACKUP_PATH || path.join(__dirname, "..", "data", "backups");
fs.mkdirSync(destDir, { recursive: true });
const dest = path.join(destDir, `sevasetu-${new Date().toISOString().replace(/[:.]/g, "-")}.db`);
fs.copyFileSync(DB_PATH, dest);
const keepDays = Number(process.env.BACKUP_RETENTION_DAYS || 30);
const now = Date.now();
for (const f of fs.readdirSync(destDir)) {
  const full = path.join(destDir, f);
  const st = fs.statSync(full);
  if (now - st.mtimeMs > keepDays * 86400000) {
    console.log("Retention skip (manual cleanup policy):", f);
  }
}
console.log("Backup written:", dest);
