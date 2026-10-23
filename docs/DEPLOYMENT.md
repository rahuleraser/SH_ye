# SevaSetu — On-premises Datacenter Deployment

SevaSetu is a multi-NGO education, donation and community platform designed to run inside your own datacenter. No cloud vendor is required.

## Architecture

- Single Node.js process serves REST API (`/api/v1`) and the built PWA.
- SQLite database on local disk (WAL mode). PostgreSQL can replace it later.
- Local disk storage for uploads (`STORAGE_PATH`).
- Optional nginx TLS terminator in front of port 8080.
- systemd unit or Docker Compose for process supervision.

```
[Users / Staff tablets]
        |
   nginx :443 (TLS)
        |
   SevaSetu :8080
        |
   /data/sevasetu.db
   /data/uploads
   /data/backups
```

## Hardware baseline

| Size | vCPU | RAM | Disk |
|------|------|-----|------|
| Pilot (1–3 NGOs) | 2 | 4 GB | 40 GB SSD |
| Regional (10+ NGOs) | 4 | 8 GB | 200 GB SSD |
| State-scale | 8 | 16 GB | 500 GB SSD + nightly backup to NAS |

## Option A — Docker (recommended)

```bash
cp .env.example .env
# edit JWT_SECRET, BOOTSTRAP_ADMIN_PASSWORD, APP_DOMAIN

docker compose up -d --build
```

Application: `http://<host>:8080`

Data volume: Docker volume `sevasetu-data` mounted at `/data`.

## Option B — Bare metal / VM

1. Install Node.js 22 LTS.
2. Copy release to `/opt/sevasetu`.
3. Build frontend:

```bash
cd /opt/sevasetu/frontend
npm install
npm run build
```

4. Copy `.env.example` to `/opt/sevasetu/.env` and set secrets.
5. Create user `sevasetu`, data dirs `/data/sevasetu`.
6. Install `deploy/sevasetu.service` into systemd and enable it.
7. Place `deploy/nginx.conf` behind your existing TLS terminator.

## First login

- Super admin: `BOOTSTRAP_ADMIN_EMAIL` / `BOOTSTRAP_ADMIN_PASSWORD` (defaults in `.env.example`).
- Demo NGO admin: `admin@gyan-jyoti.org` / `Seva@12345` (seeded, marked `is_demo=1`).
- Change all default passwords before production cutover.

Portals:

- Public site: `/`
- Super admin: `/admin`
- NGO operations: `/ngo`
- Donor / volunteer / student / parent: `/dashboard`

## Backup

Manual:

```bash
cd /opt/sevasetu/backend
node src/backup.js
```

Or from Admin > Backup.

Schedule (cron, datacenter NAS):

```
0 2 * * * /usr/bin/node /opt/sevasetu/backend/src/backup.js
```

Restore: stop the service, replace `/data/sevasetu.db` with a backup file, start the service.

## TLS

Terminate TLS at nginx / F5 / HAProxy. Forward `X-Forwarded-For` and `X-Forwarded-Proto`. The application itself binds to the internal network only.

## Payment / email / SMS

Abstractions are in `backend/src/services.js`.

- `PAYMENT_PROVIDER=offline` records UPI/bank/cash with a generated reference. Plug Razorpay/Stripe by implementing `PaymentProvider.charge`.
- SMTP: set `SMTP_HOST` etc. Without SMTP, messages are written to `email_log`.
- Never put gateway secrets in the frontend.

## Tenant isolation

Every NGO-scoped table has `ngo_id`. NGO users only receive rows for their tenant. Super admin can see all. Automated test: `backend/test/api.test.js`.
