# HUAGE Commercial OS MVP Architecture

This project turns the static dashboard prototypes into a commercial internal management system. The first deep executable slice is:

```text
子公司监管数据导入 -> 校验 -> 发布 -> 子公司监管驾驶舱 -> HEV/任务/风险推进 -> 审批/决策 -> 决策档案归档
```

## Boundary

- `apps/web`: React/Vite web management console.
- `apps/api`: API boundary for auth, RBAC, audit, import validation, source traceability, and workflow state transitions.
- `apps/jobs`: reserved for import parsing, async validation, report generation, backup, and notifications.
- `apps/desktop`: reserved for Tauri packaging. It must call the same API and must not fork business logic.
- `packages/shared`: shared domain states and DTO types.
- `scripts`: local engineering gates, including PostgreSQL schema validation.
- `references/prototypes`: the original static zip contents, kept as product reference only.

## Runtime Persistence

The current executable MVP uses a repository boundary:

```text
HTTP route -> domain service -> repository adapter -> persisted records
```

Implemented adapter:

- `JsonFileStore`: initializes from `apps/api/data/seed.json` and persists to `apps/api/data/runtime.json`.
- `HUAGE_DATA_FILE`: optional absolute path override for the runtime JSON file.
- `loadRuntimeConfig`: centralizes API host/port, CORS origin, adapter mode, storage roots, request limits, and local auth fallback.
- `GET /api/health`: exposes runtime config, active adapter mode, source-file adapter, schema check command, and warnings.

Target adapter:

- PostgreSQL tables in `docs/schema.sql`.
- Deterministic PostgreSQL seed data in `docs/seed.sql`, generated from `apps/api/data/seed.json`.
- The API routes should not change when the adapter is replaced.
- Source files should later move to object storage while `source_rows` and `audit_logs` keep the canonical lineage.
- `npm run db:schema:check` validates the required schema shape before adapter work proceeds.
- `npm run db:seed:generate` refreshes `docs/seed.sql`; `npm run db:seed:check` verifies the checked-in seed is aligned with the JSON runtime seed.
- `npm run db:migrate:dry-run` reports the initial migration checksum; `npm run db:migrate` applies `docs/schema.sql` through `psql` and records the checksum in `schema_migrations`.
- `HUAGE_STORE=postgres` is intentionally rejected until the actual adapter is implemented, so deployment cannot silently write to JSON while claiming PostgreSQL mode.

## Data Lifecycle

All imported operational data must carry a lifecycle state:

```text
raw -> validated -> published -> corrected -> archived
```

Every transition must write an audit entry with actor, role, previous state, next state, reason, timestamp, source batch, and request id.

## Import Intake

Implemented web intake:

- CSV, TSV, TXT, and XLSX files are parsed in the browser.
- WPS files should be exported as CSV or XLSX before import.
- The browser computes a SHA-256 hash of the source file and sends it with the normalized rows.
- The API rejects non-archived duplicate hashes before creating a new import batch.
- The API writes source bytes to local object storage and records `objectKey`, byte size, and MIME type on the import batch.
- `.xls` and native `.et` parsing are deferred until the backend job/object-storage lane exists.

Implemented local object storage:

- Default root: `apps/api/storage`
- Override: `HUAGE_SOURCE_FILE_DIR=/absolute/path`
- Object key shape: `import-files/{batchId}/{hashPrefix}-{safeFileName}`
- Retrieval route: `GET /api/imports/:id/source-file`

The local store is not a long-term production store. It exists so lineage, audit, and source-file retrieval are real before replacing the adapter with NAS/S3/MinIO.

Implemented API routes:

- `GET /api/auth/users`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `GET /api/health`
- `GET /api/operating-system`
- `PATCH /api/operating-system/tasks/:id`
- `GET /api/people`
- `PATCH /api/people/contacts/:id`
- `PATCH /api/risks/:id`
- `GET /api/commercial-system`
- `PATCH /api/commercial-system/work-orders/:id`
- `GET /api/villa-project`
- `POST /api/villa-project/phases`
- `PATCH /api/villa-project/phases/:id`
- `POST /api/villa-project/issues`
- `PATCH /api/villa-project/issues/:id`
- `POST /api/villa-project/expenses`
- `PATCH /api/villa-project/expenses/:id`
- `DELETE /api/villa-project/expenses/:id`
- `PATCH /api/villa-project/budgets/:category`
- `POST /api/villa-project/sync-source`
- `GET /api/dashboard`
- `GET /api/subsidiaries/:id`
- `PATCH /api/subsidiaries/:id/workflows/:type`
- `GET /api/imports/:id`
- `GET /api/imports/:id/source-file`
- `POST /api/imports/validate-preview`
- `POST /api/imports`
- `POST /api/imports/:id/validate`
- `POST /api/imports/:id/publish`

Session identity:

- Web requests call `POST /api/auth/login` with account and password, then receive a server-issued Bearer token.
- Business routes resolve actor, role, permissions, and subsidiary scope from the session token.
- Session records persist in the current JSON store and map to the planned PostgreSQL `sessions` table.
- `HUAGE_ALLOW_HEADER_AUTH=1` can re-enable header actor fallback for local debugging only.
- Demo accounts currently share the seed password `123456`; production must replace this with per-user password hashes, SSO, or another real identity provider before broader rollout.

## Workflow State Machines

- HEV: `draft -> submitted -> reviewed -> action_required -> verified -> archived`
- Task: `created -> assigned -> in_progress -> blocked -> done -> accepted -> archived`
- Risk: `identified -> triaged -> owner_assigned -> mitigation_in_progress -> escalated/controlled -> closed -> archived`
- Approval: `draft -> submitted -> pending_review -> approved/rejected -> cancelled/expired`
- Decision: `proposed -> evidence_attached -> pending_decision -> decided -> action_created -> archived`

Implemented workflow API:

- `PATCH /api/subsidiaries/:id/workflows/:type` supports `hev`, `task`, `risk`, and `decision`.
- The API rejects invalid state jumps and requires a non-empty transition reason.
- PMO can manage all workflow types through `workflow.manage`.
- Subsidiary owners can only act inside their subsidiary scope for allowed HEV/task transitions.
- Boss role can decide decision workflow states through `decision.decide`.
- Each transition writes an audit entry with `targetType=subsidiary_workflow` and target `{subsidiaryId}:{workflowType}`.
- Decision workflow transitions upsert an evidence-bound decision package so the dashboard does not create unaudited local-only decisions.

Implemented dashboard drilldown:

- Selecting a subsidiary calls `GET /api/subsidiaries/:id`.
- The payload contains the selected subsidiary, source batch, source row raw/normalized payloads, and source/workflow audit logs.
- The frontend inspector reads that payload instead of relying only on the summary dashboard array.

## Operating System Modules

The original static prototype modules are now represented as a backend API contract instead of hardcoded page-only content:

- KPI overview and module health
- JOSMAN goal pyramid and five goal branches
- 一级对接人 registry
- Brand progress and weekly operating tasks
- Local risks vs 华哥决策 risks
- Supply-chain cost ledger
- Tax/compliance cards
- Decision rules

`GET /api/operating-system` returns the complete module payload. `PATCH /api/operating-system/tasks/:id` mutates task status and writes an audit entry. PostgreSQL target tables exist in `docs/schema.sql`, and `docs/seed.sql` seeds those tables from `apps/api/data/seed.json`.

## People / Organization Boundary

`GET /api/people` exposes the organization graph separately from audit history:

- `people`: named internal actors and their role/person profile fields
- `primaryContacts`: first-level module or brand contacts
- `moduleResponsibilities`: module owner/reviewer/escalation mapping
- `reportingLines`: management and execution relationships
- `handoverEvents`: business handover events
- `auditEvents`: system audit logs

`PATCH /api/people/contacts/:id` requires `people.manage`, updates the primary contact record, writes a handover event, and writes an audit log. Handover events are business facts and must not be merged into audit logs.

## Risk / Decision Boundary

`PATCH /api/risks/:id` handles risk status updates and risk escalation. Escalation requires `risk.manage` or `decision.decide` and creates a decision package with:

- `sourceRiskId`
- `ownerPersonId`
- `escalationReason`
- `impactScope`
- `decisionMakerPersonId`
- `evidenceRefs`
- `auditEventId`

Escalation is idempotent by `sourceRiskId`: a repeated escalation request returns the existing decision package instead of creating duplicate decision records.

## Commercial System Boundary

`GET /api/commercial-system` is the broader commercial-system map added after the original prototype proved too narrow. It exposes typed records for:

- readiness by delivery layer
- complete system module map
- master data: legal entities, brands, channels, products, suppliers, warehouses
- approval flows
- commercial work orders
- platform integrations
- report packs
- Web/PWA/Tauri client targets
- system policies

`PATCH /api/commercial-system/work-orders/:id` mutates work-order status and writes an audit entry. Other commercial-system records remain read-only typed records until their data source and ownership are confirmed; the UI must not fake ERP sync, platform API sync, or approval completion.

## Villa Project Boundary

`别墅项目目标` is a third-level page under `JOSMAN目标金字塔 -> 专项项目分支`. It imports the supplied villa dashboard seed into the backend as `villaProject`, then serves and mutates it through `/api/villa-project`.

Implemented records:

- Construction phases with zone, owner, dates, progress, status, acceptance standard, and next action.
- Inspection issues with zone, owner, deadline, severity, status, and closure note.
- Budget categories and expense records with vendor, amount, status, and voucher metadata.
- Villa zone summaries calculated from the current phase data.

Writes require `villa_project.write` and create audit entries. The standalone public route `#/villa-project` and the in-branch `打开三级页面` action both call the same backend API, so Cloudflare D1 remains the canonical data source after deployment.

## Deployment Assumption

The first deployment is an internal single-group system. Tables and DTOs should keep `group_id` / `tenant_id` hooks when the database schema is implemented, but full SaaS tenant isolation is out of MVP scope.

## Client Packaging

- PWA: `apps/web/public/manifest.webmanifest` and `apps/web/public/sw.js` prepare mobile installation. The service worker caches the app shell only and bypasses `/api/*`.
- Tauri: `apps/desktop/tauri.conf.json` prepares a desktop shell that points at the same web build and API. Business logic remains in Web/API packages.

## Non-Negotiables

- No hardcoded business KPI in production paths.
- Dashboard numbers must drill down to source file, import batch, source row, owner, period, and metric definition.
- AI features are read-only and reference-bound until data lineage and RBAC are proven.
- Low-code/Feishu/WPS can be intake sources, not the canonical system of record.
- `npm run api:contract:check` must pass before handoff because it proves the executable API contract over an isolated runtime store, not the developer's current mutable data file.
