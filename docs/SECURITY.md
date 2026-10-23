# SevaSetu Security

- Passwords hashed with scrypt and per-user salt.
- JWT sessions (`JWT_SECRET` must be unique per datacenter).
- Account lockout after failed logins.
- RBAC: super_admin, ngo_admin, ngo_staff, teacher, volunteer, donor, beneficiary, student, public.
- Tenant isolation on every NGO-owned record.
- CSRF: cookie+header not required for Bearer API; admin UI uses Authorization header.
- XSS: JSON API, React text rendering; file names sanitised.
- SQL: parameterised statements only (no string-concat queries for user input).
- Rate-ish lockout on login. Put nginx `limit_req` in front for public donate/login.
- Uploads stored outside the web root mapping except `/uploads` basename only.
- Sensitive beneficiary fields (address, ID refs) are not exposed on public NGO pages.
- Audit log for login, CRUD, approvals, inventory, settings.
- No raw card data is stored. Payment providers return a reference id only.
