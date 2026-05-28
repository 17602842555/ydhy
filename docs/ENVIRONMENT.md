# Environment And Deployment Readiness

The current MVP runs the commercial 子公司监管 vertical slice with the JSON adapter, while keeping explicit runtime contracts for PostgreSQL, object storage, PWA, and Tauri.

## API Runtime

Use `.env.example` as the source template.

```text
API_HOST=127.0.0.1
API_PORT=8787
HUAGE_CORS_ORIGIN=http://127.0.0.1:5173
HUAGE_STORE=json
HUAGE_DATA_FILE=/absolute/path/huage-runtime.json
HUAGE_SOURCE_FILE_ADAPTER=local
HUAGE_SOURCE_FILE_DIR=/absolute/path/huage-source-files
```

`GET /api/health` exposes the active runtime configuration, storage adapter, source-file adapter, limits, schema check command, and warnings.

Production rules:

- Set `HUAGE_CORS_ORIGIN` to the exact Web/PWA origin.
- Keep `HUAGE_ALLOW_HEADER_AUTH=0`.
- Keep canonical source files outside the repo through `HUAGE_SOURCE_FILE_DIR` until the NAS/S3/MinIO adapter is implemented.
- Run `npm run db:schema:check` before any PostgreSQL adapter work.

## PostgreSQL Target

The executable API still uses `JsonFileStore`. PostgreSQL is the target persistence adapter and is guarded by:

```bash
npm run db:schema:check
```

The check verifies required tables, partial indexes, RBAC tables, workflow event history, lifecycle constraints, and source-lineage fields in `docs/schema.sql`.

The PostgreSQL seed file is generated from the same JSON seed that boots the local adapter:

```bash
npm run db:seed:generate
npm run db:seed:check
```

`docs/seed.sql` inserts the group, roles, role permissions, users, subsidiaries, import batches, source rows, validation issues, metrics, workflow items, operating modules, goal branches, person profiles, contacts, module responsibilities, reporting lines, handover events, brand progress, operating tasks, risk items, decision packages, supply costs, tax cards, commercial modules, master data records, approval flows, commercial work orders, integration connectors, report packs, client targets, system policies, and seed audit logs. It uses deterministic UUIDs and normalized SHA-256 file hashes so it can be checked in CI and re-run after `docs/schema.sql` is applied.

Migration commands:

```bash
npm run db:migrate:dry-run
DATABASE_URL=postgres://huage:password@127.0.0.1:5432/huage_os npm run db:migrate
```

The migration runner uses the local `psql` CLI, applies `docs/schema.sql` as `001_init_schema`, records the SHA-256 checksum in `schema_migrations`, and refuses to proceed if an existing migration version has a different checksum.

When a real database is provisioned, keep it as a readiness signal until the adapter exists:

```text
HUAGE_STORE=json
DATABASE_URL=postgres://huage:password@127.0.0.1:5432/huage_os
```

The API will continue to use `JsonFileStore` and report a health warning when `DATABASE_URL` is configured. `HUAGE_STORE=postgres` intentionally fails fast until the actual Postgres repository adapter replaces the JSON adapter.

## API Contract Gate

Run the isolated API contract check before handoff:

```bash
npm run api:contract:check
```

The script starts the API on a temporary port with temporary JSON/source-file storage, then verifies:

- login/session issuance and missing-token rejection
- operating-system module payload and audited task status mutation
- people graph payload and primary contact update with separate handover/audit writes
- commercial-system payload, master data, integration registry, software targets, and audited commercial work-order mutation
- risk escalation into an evidence-bound decision package, including idempotent repeat handling
- dirty import validation
- valid import creation, source byte archive, source-file download, duplicate hash rejection
- publish transition and dashboard refresh
- drilldown source row payload
- workflow invalid jump, valid transition, decision-package upsert
- subsidiary-owner cross-scope denial, own task update, finance denied contact/task/risk/work-order writes, and unchanged data after denied writes

## PWA Client

The web client now includes:

- `apps/web/public/manifest.webmanifest`
- `apps/web/public/sw.js`
- production-only registration through `apps/web/src/registerServiceWorker.ts`

The service worker caches only the app shell and static assets. It does not cache `/api/*`, so business data remains server-authoritative.

## Tauri Client

`apps/desktop/tauri.conf.json` is a packaging scaffold for a future Tauri shell. The desktop app must reuse `apps/web` and `apps/api`; no business logic should be forked into the desktop layer.
