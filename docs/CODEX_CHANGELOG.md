# Codex Change Log

## 2026-05-28

### Changed

- Added an API repository boundary with `JsonFileStore`, seeded from `apps/api/data/seed.json` and persisted to ignored runtime data at `apps/api/data/runtime.json`.
- Added writable import lifecycle endpoints: create batch, revalidate batch, publish validated batch, and fetch import detail.
- Added server-side audit writes for upload, validate, and publish actions.
- Connected the web import panel to the writable API so a validated sample batch can be created and published into the dashboard.
- Fixed browser-side Chinese actor headers by URL-encoding `X-Actor` in the web client and decoding it in the API before audit writes.
- Added safe browser parsing for CSV, TSV, TXT, and XLSX files via `read-excel-file`; removed the vulnerable `xlsx` package after audit showed high-severity advisories with no npm fix.
- Added source file SHA-256 capture and API duplicate import rejection by file hash.
- Added local source-file storage under `apps/api/storage/import-files`, recorded `objectKey`, MIME type, and byte size on import batches, and exposed `GET /api/imports/:id/source-file`.
- Added seeded internal users, server-issued session tokens, `/api/auth/*` routes, Bearer-token business API calls, and session-aware RBAC checks. Header actor fallback is now limited to `HUAGE_ALLOW_HEADER_AUTH=1`.
- Added runtime migration support so older `apps/api/data/runtime.json` files receive the seeded roles/users needed for login without deleting local data.
- Added HEV/task/risk/decision workflow transition service and `PATCH /api/subsidiaries/:id/workflows/:type` with RBAC, valid-state enforcement, required transition reasons, decision-package upsert, and audit writes.
- Connected the dashboard inspector to real subsidiary drilldown data from `GET /api/subsidiaries/:id`, including source row raw/normalized payloads and scoped audit logs.
- Added centralized API runtime config, `/api/health` runtime details, `.env.example`, and `docs/ENVIRONMENT.md`.
- Added `npm run db:schema:check` to gate the PostgreSQL schema shape before adapter work.
- Added deterministic PostgreSQL seed export through `npm run db:seed:generate`, with `npm run db:seed:check` gating `docs/seed.sql` against `apps/api/data/seed.json`.
- Added `npm run db:migrate:dry-run` and `npm run db:migrate`; the migration runner records the initial schema checksum in `schema_migrations` and requires `DATABASE_URL` plus `psql` for real execution.
- Added isolated `npm run api:contract:check` covering session auth, validation, import creation, source byte retrieval, duplicate rejection, publish, drilldown, workflow transitions, decision package upsert, and RBAC denial.
- Added fail-fast handling so `HUAGE_STORE=postgres` cannot be set before the PostgreSQL adapter is actually implemented.
- Added PWA manifest, production service worker registration, and a Tauri config scaffold for later desktop packaging.
- Added `/api/operating-system` and `/api/operating-system/tasks/:id` so the original prototype modules are served by the backend, with operating task mutations audited.
- Added `/api/people` and `/api/people/contacts/:id` for people graph, primary contacts, module responsibilities, reporting lines, handover events, and audited contact ownership changes.
- Added `/api/risks/:id` for audited risk status changes and evidence-bound, idempotent decision-package creation from source risks.
- Added `/api/commercial-system` and `/api/commercial-system/work-orders/:id` for the broader commercial system map, master data, approvals, work orders, integrations, report packs, client targets, policies, and audited commercial work-order status updates.
- Restyled the web dashboard to match the supplied digital-clock reference: light gray neumorphic shell, raised soft controls, black digital displays, cyan LCD-style numerals, and matching KPI/status treatment.
- Added a top status console with live digital time, day, date, Cloudflare D1 linkage, and operator status while preserving the existing backend-driven dashboard data.
- Fixed production service worker registration to respect Vite `BASE_URL`, preventing GitHub Pages subpath deployments from requesting `/sw.js` at the domain root.
- Reworked the web app into a multi-module management console covering 总览, 系统全景, 目标金字塔, 子公司监管, 数据导入, 组织人物, 主数据, 品牌经营, 财税合规, 供应链, 审批工单, 集成中心, 风险预警, 决策包, 经营报告, 系统设置, 软件端, and 审计日志.
- Added role-switch validation UI so PMO, owner, finance, and boss sessions expose allowed actions, disabled buttons, and server-side 403 behavior.
- Extended the PostgreSQL target schema and deterministic seed SQL for operating modules, goal branches, person profiles, contacts, module responsibilities, reporting lines, handover events, brand progress, operating tasks, risk items, decision packages, supply costs, tax cards, commercial modules, master data records, approval flows, commercial work orders, integration connectors, report packs, client targets, and system policies.
- Updated architecture, backlog, README, and PostgreSQL schema draft to reflect the persistence and import lifecycle implementation.
- Extended the PostgreSQL schema draft with role/permission tables and workflow event history for the next adapter.

### Verification

- `node apps/api/server.mjs --check`
- `npm run build`
- `npm run lint`
- `npm audit --workspace apps/web --json` returned zero vulnerabilities after replacing `xlsx`.
- `npm run db:seed:check`
- API self-check now verifies login session issuance, Bearer-token actor resolution, missing-token rejection, duplicate import rejection, publish transition, and subsidiary-owner RBAC denial.
- API self-check now verifies workflow transition success and cross-subsidiary workflow denial.
- API self-check now verifies the operating-system payload and task status mutation.
- API self-check now verifies the people graph, contact handover/audit write, risk escalation, and decision-package idempotency.
- API self-check now verifies the commercial-system payload and audited commercial work-order update.
- Isolated API contract check now verifies people/contact mutation, task audit, commercial-system payload, work-order audit, risk escalation, decision-package idempotency, and finance/owner 403 boundaries.
- `npm run check` now includes the PostgreSQL schema gate, PostgreSQL seed check, migration dry-run, isolated API contract check, Web build, and API self-check.
- Browser QA: `http://127.0.0.1:5173/` loaded with API online, dirty import preview returned raw errors, validated batch `BATCH-20260528-004` was created and published, KPI/table/audit state refreshed.
- Browser QA: `http://127.0.0.1:5173/` rendered the neumorphic digital UI, showed `后端联动` and `Cloudflare D1`, kept 6 KPI cards and 12 contact rows, and had no console warnings/errors.
- Browser interaction QA: clicked `JOSMAN目标金字塔`, confirmed 5 branch cards, 2 target rows for `集团增长分支`, active navigation state, and no horizontal overflow.
- Playwright mobile smoke: 390x844 viewport rendered the new digital UI with no horizontal overflow and no console/page errors.
- GitHub Pages QA: `https://17602842555.github.io/ydhy/?v=a1067ae` rendered the new digital UI, showed Cloudflare D1 backend linkage, kept 6 KPI cards and 12 contact rows, and had no console/page errors.
- Playwright real CSV QA: uploaded `子公司监管导入-对象仓储CSV.csv`, created validated batch `BATCH-20260528-004`, stored source bytes with `objectKey`, published the batch, downloaded the source through `GET /api/imports/:id/source-file`, and verified the downloaded SHA-256 matched the original file.
- Duplicate file QA: re-importing the same SHA-256 returned `409 duplicate_import`.
- Playwright mobile smoke: 390x844 viewport, no horizontal overflow, no console/page errors.

### Remaining

- Replace local source-file storage with NAS/S3/MinIO adapter and add backup/restore checks.
- Parse legacy `.xls` and native WPS `.et` through a backend job if the business requires those formats.
- Replace the development login stub with password/SSO identity provider and secure session rotation.
- Implement PostgreSQL adapter and migration runner from `docs/schema.sql`.
