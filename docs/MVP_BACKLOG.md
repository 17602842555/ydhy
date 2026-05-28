# MVP Backlog

## Phase 0: Product Lock

- Confirm the first real 子公司监管 import template.
- Confirm metric definitions: 月目标, 月完成, 完成率, 预计完成率, 3天完成率, 周完成率, 月缺口.
- Confirm role matrix for 华哥, PMO/总助, 子公司负责人, 财务/运营.
- Confirm deployment target: local Mac, NAS/LAN, or private cloud.

## Phase 1: Web/API Vertical Slice

- Done: Full system shell for 总览, 目标金字塔, 子公司监管, 数据导入, 品牌经营, 财税合规, 供应链, 组织协同, 风险预警, 决策包, and 审计日志.
- Done: `/api/operating-system` exposes original prototype modules as backend data instead of frontend-only content.
- Done: `/api/operating-system/tasks/:id` updates weekly task status and writes audit logs.
- Done: `/api/people` exposes people, roles, module responsibilities, primary contacts, reporting lines, handover events, and audit events.
- Done: `/api/people/contacts/:id` updates first-level contacts with distinct handover and audit records.
- Done: `/api/risks/:id` escalates source risks into evidence-bound, idempotent decision packages.
- Done: `/api/commercial-system` exposes the broader commercial system map:主数据、审批工单、集成中心、经营报告、软件端、系统策略.
- Done: `/api/commercial-system/work-orders/:id` updates commercial-system work orders and writes audit logs.
- Done: API endpoint for dashboard summary.
- Done: API endpoint for subsidiary source drilldown.
- Done: API validation preview for uploaded rows.
- Done: API create/validate/publish import batch path with local persistence.
- Done: CSV/TSV/TXT/XLSX browser parser with uploaded file metadata and SHA-256 hash.
- Done: duplicate import rejection by file hash.
- Done: local source-file byte storage with `objectKey` attached to import batches.
- Done: Web shell with 子公司监管 dashboard.
- Done: KPI source drilldown inspector.
- Done: Data lifecycle pipeline.
- Done: Import validation issues panel.
- Done: Audit trail panel.
- Done: RBAC negative self-check path for cross-subsidiary access.
- Done: server-issued session login stub and Bearer-token business API calls.
- Done: dashboard row selection fetches source-row drilldown detail from the API.
- Next: replace local source-file storage with NAS/S3/MinIO adapter and parse large uploads in background jobs.

## Phase 2: Workflow Closure

- Done: HEV/task/risk/decision state machines are enforced by the API.
- Done: inspector actions can advance the selected subsidiary workflow and refresh the dashboard.
- Done: audit log is written for each workflow transition.
- Done: decision workflow transitions upsert an evidence-bound decision package.
- Next: split workflow items into assignable records with due dates, comments, attachments, and acceptance gates.

## Phase 3: Commercial Hardening

- Done: PostgreSQL schema gate checks required tables, indexes, lifecycle constraints, RBAC, workflow events, and source lineage.
- Done: PostgreSQL schema target now includes operating modules, goal branches, person profiles, contacts, module responsibilities, reporting lines, handover events, brand progress, operating tasks, risks, decision packages, supply costs, tax cards, commercial modules, master data records, approval flows, work orders, integrations, reports, clients, and system policies.
- Done: Deterministic PostgreSQL seed export and check from `apps/api/data/seed.json` to `docs/seed.sql`, including operating-system, people, risk, decision-package, and commercial-system tables.
- Done: PostgreSQL migration runner dry-run exists; real migration requires `DATABASE_URL` and `psql`.
- Done: isolated API contract check covers session, import, source bytes, publish, drilldown, workflow, people/contact handover, task audit, commercial-system work-order audit, risk escalation, decision package idempotency, and RBAC.
- Done: API runtime configuration is centralized and visible through `/api/health`.
- Done: PWA manifest and production service worker scaffold exist without caching business API data.
- Done: Tauri configuration scaffold exists and points at the shared web build.
- Next: implement the actual PostgreSQL repository adapter behind the existing API/domain boundary.
- Object storage for uploaded source files.
- Background import jobs.
- Backup/restore drill.
- Login/session issuance instead of header-based role stubs.
- Replace login stub with password/SSO identity provider and secure session rotation.
- Tauri desktop smoke path with a built app.
- PWA mobile entry for fill-in and approvals beyond read-only/install readiness.

## Verification

- Unit: state machines, permission checks, metric calculation, import validators.
- API integration: login stub, dashboard, drilldown, validation preview, audit.
- Fixture import tests: valid file, missing columns, duplicate batch, dirty data, correction.
- E2E: full 子公司监管 loop from import to decision archive.
- RBAC negative: 子公司 A user cannot read 子公司 B.
- Desktop smoke: install/open/login/dashboard/upload.
