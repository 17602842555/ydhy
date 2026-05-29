# HUAGE Commercial OS MVP

This workspace is the first commercial MVP pass for the HUAGE / 李锦宁 operations system.

The current implementation now has a full management-system shell, with the 子公司监管 vertical slice implemented deepest:

```text
子公司监管数据导入 -> 校验 -> 发布 -> 子公司监管驾驶舱 -> HEV/任务/风险推进 -> 决策档案
```

## Run

```bash
npm install
npm run dev
```

Then open:

```text
http://127.0.0.1:5173/
```

The API runs at:

```text
http://127.0.0.1:8787/
```

## Structure

```text
apps/web      React/Vite management console
apps/api      Node API boundary with persistent local JSON store
packages      Shared domain states and DTO types
docs          Architecture, backlog, schema draft
scripts       Development checks and schema gates
references    Original static prototypes extracted from the provided zip files
```

## Current MVP Features

- 子公司监管 dashboard backed by `/api/dashboard`
- 集团经营 OS module API backed by `/api/operating-system`
- Full commercial system map backed by `/api/commercial-system`
- Multi-page management console for 总览, 系统全景, 目标金字塔, 子公司监管, 数据导入, 组织人物, 主数据, 品牌经营, 财税合规, 供应链, 审批工单, 集成中心, 风险预警, 决策包, 经营报告, 系统设置, 软件端, and 审计日志
- Operating task status mutation through `/api/operating-system/tasks/:id`
- Commercial work order status mutation through `/api/commercial-system/work-orders/:id`
- Commercial typed records for master data, approvals, work orders, platform integrations, report packs, client targets, and system policies
- Organization and people graph backed by `/api/people`
- Primary contact updates through `/api/people/contacts/:id`, with distinct handover events and audit logs
- Risk status/escalation updates through `/api/risks/:id`
- Evidence-bound risk escalation that creates idempotent decision packages instead of local-only frontend decisions
- Ark Coding Plan-backed read-only analysis through `/api/ai/insights`, with per-section prompt presets and source-bound local fallback when `ARK_API_KEY` is not configured
- Development role switcher for validating PMO, owner, finance, boss, disabled action states, and server-side 403 responses
- Session-based login stub through `/api/auth/login` and Bearer-token API calls
- Data lifecycle states: `raw`, `validated`, `published`, `corrected`, `archived`
- Source traceability: batch id, source file, source row, uploader
- Workflow state display for HEV, task, risk, and decision
- Workflow state transition API for HEV, task, risk, and decision with scoped RBAC and audit writes
- Import validation preview through `/api/imports/validate-preview`
- Browser file parsing for `.csv`, `.tsv`, `.txt`, and `.xlsx` import templates
- Persistent import batches through `/api/imports`
- SHA-256 source file hash capture and duplicate import rejection
- Local source-file object storage under `apps/api/storage/import-files`
- Publishable validated batches through `/api/imports/:id/publish`
- Audit writes for upload, validation, and publish actions
- Audit log and decision package panels
- Responsive desktop/mobile layout

## API Persistence

The API boots from `apps/api/data/seed.json` and writes mutable runtime data to:

```text
apps/api/data/runtime.json
```

That file is ignored by git and can be replaced with another path:

```bash
HUAGE_DATA_FILE=/absolute/path/huage-runtime.json npm run dev:api
```

For development resets only:

```bash
curl -X POST http://127.0.0.1:8787/api/admin/reset
```

The JSON repository is a temporary persistence adapter. The API/domain boundary is structured so the next commercial step can replace it with PostgreSQL using `docs/schema.sql`.

Runtime configuration is documented in `docs/ENVIRONMENT.md` and exposed through `GET /api/health`.

## Ark Coding Plan Analysis

The dashboard calls the local API, not Ark directly. Add the key only to the API process:

```bash
ARK_API_KEY=your_volcengine_ark_key npm run dev
```

Optional overrides:

```text
ARK_MODEL=ark-code-latest
ARK_BASE_URL=https://ark.cn-beijing.volces.com/api/coding/v3
ARK_TIMEOUT_MS=75000
```

`GET /api/ai/insights` logs in through the same Bearer-token/RBAC boundary as other data APIs, builds a section-scoped snapshot from published/source-bound records, calls Ark's OpenAI-compatible `/chat/completions` endpoint, and returns structured advice, warnings, next actions, a decision-package draft, and source references. Without a key, the endpoint still returns deterministic local analysis so the UI remains usable.

The same endpoint also accepts `POST` with `section`, `context`, and `aiSettings`. The frontend uses that path for panel-level analysis, so KPI, target pyramid, branch detail, contacts, brand, tasks, risk, supply, tax, daily work, decision package, and subsidiary-supervision panels each run with their own preset prompt and current panel data.

`POST /api/ai/test-connection` uses the same Bearer-token/RBAC boundary and sends a minimal Ark `/chat/completions` probe. It returns a structured success/failure result with model, base URL, latency, HTTP status, and Ark error code/message without exposing the API key.

For local browser testing, the dashboard also has a bottom-left settings gear where an operator can enter an Ark API key, model, and base URL. These values are stored in that browser and sent to the API in the `/api/ai/insights` or `/api/ai/test-connection` request body for that analysis/test call only. Use the settings panel's `测试连接` button before saving or refreshing panel analysis when diagnosing Key/model/Base URL problems.

## Deployment

The repository is prepared for:

- GitHub Pages frontend deployment from `.github/workflows/frontend-github-pages.yml`
- Cloudflare Workers backend deployment from `apps/api/worker.mjs`
- Cloudflare D1 state persistence through `wrangler.jsonc` and `apps/api/migrations/0001_app_state.sql`

See `docs/DEPLOYMENT.md` for the exact GitHub and Cloudflare setup steps.

## Auth / RBAC

The web app currently logs in as the seeded PMO user `user-lijinning` and calls business APIs with:

```text
Authorization: Bearer <session-token>
```

Available development auth endpoints:

```text
GET  /api/auth/users
POST /api/auth/login
GET  /api/auth/me
POST /api/auth/logout
```

This is still a login stub, not final password/SSO authentication. It proves server-issued sessions, role permissions, subsidiary scope checks, and audit actor attribution before the PostgreSQL adapter is added.

## Workflow Drilldown

Selecting a subsidiary in the dashboard calls:

```text
GET /api/subsidiaries/:id
```

The response includes the subsidiary, source batch, source row payload, and scoped audit logs. Workflow transitions are written through:

```text
PATCH /api/subsidiaries/:id/workflows/:type
```

Supported workflow types are `hev`, `task`, `risk`, and `decision`. Each transition requires a valid next state, a reason, a Bearer-token actor with permission, and writes an audit log.

## Source File Storage

When a real file is imported from the web UI, the API stores the original source bytes under:

```text
apps/api/storage/import-files/
```

That folder is ignored by git. It can be redirected for NAS/private-disk testing:

```bash
HUAGE_SOURCE_FILE_DIR=/absolute/path/huage-source-files npm run dev:api
```

Import batches store the resulting `objectKey`, source MIME type, and byte size. The current local adapter is a stand-in for object storage such as NAS, S3, MinIO, or private cloud storage.

## Verification Commands

```bash
npm run db:schema:check
npm run db:seed:generate
npm run db:seed:check
npm run db:migrate:dry-run
npm run api:contract:check
npm run build
npm run lint
node apps/api/server.mjs --check
npm run check
```

## Notes

- The current API initializes from seed data under `apps/api/data/seed.json`.
- `docs/schema.sql` defines the PostgreSQL-oriented schema direction.
- `docs/seed.sql` is deterministically generated from the JSON seed and populates the PostgreSQL target with roles, users, subsidiaries, import lineage, metrics, workflow items, and audit logs.
- `docs/seed.sql` also seeds the broader operating-system and commercial-system target tables: modules, goal branches, person profiles, contacts, module responsibilities, reporting lines, handover events, brand progress, operating tasks, risk items, decision packages, supply costs, tax cards, commercial modules, master data records, approval flows, work orders, integration connectors, report packs, client targets, and system policies.
- `docs/schema.sql` now includes RBAC role tables and workflow event history so the JSON MVP has a clear PostgreSQL migration target.
- `npm run db:schema:check` gates required PostgreSQL tables, indexes, lifecycle constraints, RBAC, workflow events, and lineage fields.
- `npm run db:seed:check` verifies that the PostgreSQL seed SQL is still aligned with `apps/api/data/seed.json`.
- `npm run db:migrate:dry-run` previews the initial PostgreSQL migration checksum; `npm run db:migrate` requires `DATABASE_URL` and the local `psql` CLI.
- `npm run api:contract:check` starts an isolated API instance with temporary JSON/source-file storage and verifies login, import validation, source byte storage, publish, drilldown, workflow, people/contact handover, task audit, commercial-system payload, work-order audit, risk escalation, decision package idempotency, and RBAC boundaries.
- The web client includes a PWA manifest and production service worker that caches only the app shell, not `/api/*` business data.
- `apps/desktop/tauri.conf.json` is a desktop packaging scaffold for the later Tauri shell.
- WPS imports are supported when exported as CSV or XLSX. Native `.et` and legacy `.xls` are intentionally not parsed in the browser path.
- Existing zip contents are kept under `references/prototypes/` as product reference only.
