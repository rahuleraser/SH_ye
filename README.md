# SevaSetu

Multi-NGO education, donation and community support platform for on-premises datacenter deployment.

Domain (configurable): `abcyz.in`

## Quick start (datacenter / VM)

```bash
cp .env.example .env
docker compose up -d --build
```

Open `http://<host>:8080`

Without Docker:

```bash
cd frontend && npm install && npm run build && cd ..
cd backend && node src/index.js
```

API listens on `API_PORT` (default 3001 locally, 8080 in Docker) and also serves the built PWA.

## Portals

- Public website `/`
- Super admin `/admin`
- NGO operations `/ngo`
- User dashboard `/dashboard`

Demo logins are listed in `docs/USER_MANUAL.md`.

## Docs

- `docs/DEPLOYMENT.md` — datacenter install, nginx, systemd, backup
- `docs/SECURITY.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/USER_MANUAL.md`

## Tests

```bash
cd backend && node --test test/api.test.js
```
