# Codex Change Log

## 2026-05-30

### Changed

- Added `/api/ai/insights` as an Ark Coding Plan analysis endpoint. It can refresh section-scoped analysis from published/source-bound data and return structured advice, warnings, next actions, decision-package text, and source references.
- Kept the Ark API key server-side through `ARK_API_KEY`, added Cloudflare Worker support, exposed redacted runtime health metadata, and documented local/Worker setup.
- Connected the React decision panel to the new endpoint with refresh, provider status, source labels, and local rule-based fallback when Ark is not configured or unavailable.
- Added a bottom-left Ark settings gear in the dashboard so operators can enter an API key, model, and base URL from the page for browser-local analysis testing.
- Added `/api/ai/test-connection` plus a settings-panel `测试连接` button so Ark Key/model/Base URL failures show explicit HTTP/error diagnostics instead of silently appearing as local fallback analysis.
- Scoped Ark analysis prompts per board section, removed the unsupported `response_format=json_object` request parameter for `ark-code-latest`, and raised the default analysis timeout to 75 seconds so successful connection probes can complete full panel analysis.
- Added backend persistence for successful Ark section analysis: saved results are returned to all users until a panel is explicitly refreshed again, while failed/local fallback analysis no longer overwrites the last saved Ark result.

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
- Locally polished the digital-neumorphic UI without uploading: tightened the desktop top console, replaced navigation glyphs with consistent Lucide icons, converted mobile navigation into a compact horizontal dock, and fixed mobile horizontal overflow.
- Fixed local overview clipping in the `目标金字塔拆解` card by increasing the overview two-column row height and giving the pyramid body enough bottom breathing room.
- Fixed the standalone `组织协同 / 一级对接人总表` module so all 12 rows display in the page instead of being vertically clipped inside a short scroll area.
- Refined local neumorphic button surfaces with layered highlights, rim shadows, hover lift, and active press states across navigation items, action buttons, tabs, badges, and goal branch cards.
- Corrected the local button material model to match the supplied references: raised buttons now use localized top-left light instead of a full white ring, while selected/recessed buttons use a light-gray inset well with a thin cyan status line.
- Thickened the local button treatment with a bottom-depth shadow layer, taller action/status buttons, and pressed/selected states that no longer use half-height cyan fill.
- Refined the local button treatment again by replacing hard bottom edges with softer micro bevels, reducing active cyan bars to center-fading hairlines, and softening hover movement for a more precise control-surface feel.
- Added Visual Ralph artifacts for the button-depth pass under `.omx/artifacts/visual-ralph/button-depth/`, including the reference traits, screenshots, and verdict record.
- Corrected the local sidebar pass to use the supplied task-tracker screenshot as visual reference only: preserved the original HUAGE navigation structure, removed the temporary Projects/Status/Documents-style reference structure, and kept only the light-gray floating panel treatment.
- Added Visual Ralph artifacts for the sidebar reference pass under `.omx/artifacts/visual-ralph/sidebar-reference-ui-only/`, documenting that the reference affects UI material, spacing, shadows, and typography but not information architecture.
- Simplified the local UI style across the whole page: KPI values now render as text only, top clock/date/status displays no longer use black screen bases, and pyramid levels, contact pills, progress percentages, branch rails, buttons, tabs, and repeated cards use light borders with minimal shadows.
- Simplified table rows across the local UI: removed the old gray gradient row bases and inset row shadows, changed tables to transparent rows with only subtle top dividers, and kept hover feedback lightweight.
- Tightened the overview `AI 拆解建议与下周关注重点` module: removed the full-height AI side tile, changed the AI mark to text-only, stopped the decision panel from stretching to available height, and made the insight blocks content-height driven.
- Added a `子公司监管目标` third-level page under `JOSMAN目标金字塔 -> 子公司监管分支`: the branch target now exposes an `打开三级页面` action, parses the uploaded `子公司监管(1).zip` dashboard data from `public/subcompany-supervision/index.html`, and renders it with the unified local light neumorphic UI instead of an iframe.
- Copied the uploaded static pages into `apps/web/public/subcompany-supervision/`, preserving the original `2026年5月子公司目标完成看板` and nested `liu` page assets for direct Vite/GitHub Pages serving.
- Imported `yongdonghuayu-task-calendar.zip` business units, business metrics, and monthly targets into the backend task-calendar seed data.
- Added task-calendar monthly target persistence so each company can set monthly revenue targets, recalculate completion rates, and roll those targets into the subsidiary supervision dashboard.
- Rebuilt the task-calendar entry frontend as an independent public SPA route at `#/task-calendar`, matching the original task-management structure with account selection, month selector, company list, month summary, calendar views, current-date detail, and operating-data entry.
- Connected the third-level subsidiary supervision page's `打开填报页` action to the standalone task-calendar route instead of embedding the entry form inside the supervision page.
- Synced the standalone task-calendar data with `http://yongdonghuayu_task_calendar.zhuqingtingai.com/`: imported 11 companies, 38 operating units, 1194 business metrics, 1730 calendar entries, and 12 monthly targets, then added backend `entries` support so daily targets and fallback actuals match the original task-management calculation model.
- Updated the standalone task-calendar account flow so the group account opens a read-only `全部子公司` view, while each subsidiary account can switch into its own company-only fill page and save only that company's data.
- Added a `别墅项目目标` third-level page under `JOSMAN目标金字塔 -> 专项项目分支`: imported `huage-villa-dashboard-package.zip` into backend `villaProject` seed data and rebuilt the villa dashboard as a unified light-neumorphic React page.
- Added villa project backend endpoints for reading the dashboard, adding/updating施工节点, adding/updating整改问题, adding预算支出, and syncing the seed source into the Cloudflare D1-backed runtime state.
- Reworked the villa project third-level page to follow `huage-villa-dashboard-package.zip` 1:1 structure: sidebar module tabs, top toolbar, clickable KPI cards, overview heat zones, upcoming nodes, issue queue, construction filters/range controls, inspection filters, budget cards, voucher ledger, expense table, and entry forms.
- Extended villa project backend writes to support budget-limit updates, expense amount/status updates, and expense deletion so the restored original UI controls persist to the backend instead of localStorage.
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
- API self-check now verifies the villa project payload from the imported dashboard seed, including phase count, issue count, and 400万 budget total.
- Isolated API contract check now verifies people/contact mutation, task audit, commercial-system payload, work-order audit, risk escalation, decision-package idempotency, and finance/owner 403 boundaries.
- Isolated API contract check now verifies villa project read, construction phase creation, inspection issue creation, budget expense creation, category rollup, and audit writes.
- Isolated API contract check now verifies villa budget updates, villa expense updates, and villa expense deletion audit writes.
- `npm run check` now includes the PostgreSQL schema gate, PostgreSQL seed check, migration dry-run, isolated API contract check, Web build, and API self-check.
- Browser QA: `http://127.0.0.1:5173/` loaded with API online, dirty import preview returned raw errors, validated batch `BATCH-20260528-004` was created and published, KPI/table/audit state refreshed.
- Browser QA: `http://127.0.0.1:5173/` rendered the neumorphic digital UI, showed `后端联动` and `Cloudflare D1`, kept 6 KPI cards and 12 contact rows, and had no console warnings/errors.
- Browser interaction QA: clicked `JOSMAN目标金字塔`, confirmed 5 branch cards, 2 target rows for `集团增长分支`, active navigation state, and no horizontal overflow.
- Playwright mobile smoke: 390x844 viewport rendered the new digital UI with no horizontal overflow and no console/page errors.
- GitHub Pages QA: `https://17602842555.github.io/ydhy/?v=a1067ae` rendered the new digital UI, showed Cloudflare D1 backend linkage, kept 6 KPI cards and 12 contact rows, and had no console/page errors.
- Local-only UI polish QA: desktop and 390x844 mobile each clicked all 8 navigation modules with no horizontal overflow and no console/page errors; `npm run check` passed after the local UI changes.
- Local clipping QA: confirmed the `L5 周任务/日动作` row sits 20px above the `目标金字塔拆解` panel bottom at 1462px desktop width, with no console warnings/errors.
- Local contact-table QA: clicked `组织协同`, confirmed all 12 table rows fit inside the `一级对接人总表` panel with 25px bottom breathing room, no internal vertical clipping, no horizontal overflow, and no console warnings/errors.
- Local button polish QA: desktop overview, desktop brand module, and 390x844 mobile screenshots show the raised highlight/shadow button treatment with no console/page errors and no horizontal overflow; `npm run build` and `npm run lint` passed.
- Local Visual Ralph button-depth QA: captured desktop overview, desktop target pyramid, and 390x844 mobile screenshots after removing the white-ring highlight; computed styles confirm low-contrast button borders, partial top-left highlight, recessed active state, no console/page errors, and no horizontal overflow.
- Local thick-button QA: captured desktop overview, desktop target pyramid, and 390x844 mobile screenshots; computed styles confirm raised buttons have bottom-depth shadows and selected buttons use only a 4px cyan status line, with no console/page errors and no horizontal overflow.
- Local refined-button QA: captured desktop overview, desktop target pyramid, and 390x844 mobile screenshots after the micro-bevel pass; computed styles confirm reduced highlight footprint, 2px active accent, softer hover movement, no console/page errors, and no horizontal overflow.
- Local sidebar reference QA: captured desktop overview, desktop target pyramid, and 390x844 mobile screenshots; Playwright confirmed the original 8 navigation labels remain, the temporary reference structure selectors are absent, and there is no horizontal overflow or console/page error.
- Local minimal-style QA: Browser verified overview and target-pyramid interactions with KPI, digital display, branch rail, selected goal card, contact pill, and percent surfaces no longer using black/heavy bases; 390x844 Playwright smoke confirmed no horizontal overflow, no framework overlay, and no console/page errors.
- Local table-minimal QA: Browser verified the `一级对接人总表` table has 12 rows, transparent `tbody tr`/`td` backgrounds, no background images, no row box-shadows, subtle 1px top dividers, no horizontal overflow, and no console/page errors.
- Local AI-panel compact QA: Browser DOM verification confirmed the decision panel is height-auto with compact 64px AI column and no side-tile background/shadow; Playwright screenshot confirmed the module renders as a short content-height section with no horizontal overflow and no console/page errors.
- Added per-section Ark AI analysis across the dashboard: KPI, target pyramid, branch detail, contacts, brand, tasks, risk, supply, tax, daily work, global decision package, and subsidiary-supervision metric/rank/company panels now expose preset prompts and send current panel context to `/api/ai/insights`.
- Local subcompany third-level QA: Browser clicked `JOSMAN目标金字塔 -> 03 子公司监管分支 -> 打开三级页面`; DOM checks confirmed `2026年5月子公司目标完成看板`, 7 metric cards, 11 rank rows, 11 company cards, zero iframes, top-position entry, no horizontal overflow, and no console warnings/errors. Playwright 390x844 confirmed the same counts, hidden mobile sidebar for the third-level page, two-column mobile metrics, no horizontal overflow, and no console warnings/errors.
- Task-calendar API QA: company owner login for `空锦界填报账号` returned only `空锦界`, loaded 4 operating units and 1 monthly target, saved a monthly target, saved a metric, and received `rollupLinked: true`; the smoke write was restored afterward.
- Standalone task-calendar QA: Browser loaded `http://127.0.0.1:5173/#/task-calendar` with the independent shell, default company account, calendar grid, company/month summary, no return-to-dashboard text, and no horizontal overflow.
- Source task-calendar sync QA: local API returned 11 companies, 38 units, 537 May metrics, 950 May entries, and 9 May targets; group totals matched the original source at 4049万 target and 3590万 completed, while `空锦界` matched 100万 target, 72.7万 completed, and 72.7% completion.
- Account-switch QA: Browser verified group `user-lijinning` shows 12 company options including `全部子公司` and is read-only; switching to `user-kongjinjie-task-owner` shows only `空锦界`, enables target/data fill controls, and keeps no horizontal overflow or console warnings/errors.
- Task-calendar auth QA: replaced account switching with account/password login; backend rejects missing or wrong passwords, and subsidiary-owner sessions only receive their scoped company data.
- Standalone task-calendar Playwright QA: desktop `1440x900` saved a business metric from the `经营数据` tab and displayed `已保存，并同步到子公司监管看板。`; mobile `390x844` rendered the independent page with no horizontal overflow and no console/page errors. Test writes were restored afterward.
- Playwright real CSV QA: uploaded `子公司监管导入-对象仓储CSV.csv`, created validated batch `BATCH-20260528-004`, stored source bytes with `objectKey`, published the batch, downloaded the source through `GET /api/imports/:id/source-file`, and verified the downloaded SHA-256 matched the original file.
- Duplicate file QA: re-importing the same SHA-256 returned `409 duplicate_import`.
- Local villa project QA: Browser verified `#/villa-project` and `JOSMAN目标金字塔 -> 05 专项项目分支 -> 别墅项目目标 -> 打开三级页面`, confirmed the imported villa dashboard title, 4 metric cards, 7 zone cards, backend write toast, no console warnings/errors, and no horizontal overflow.
- Villa project Playwright QA: desktop `1440x900` and mobile `390x844` rendered 20 construction rows and 4 metric cards with no horizontal overflow and no console/page errors.
- Playwright mobile smoke: 390x844 viewport, no horizontal overflow, no console/page errors.

### Remaining

- Replace local source-file storage with NAS/S3/MinIO adapter and add backup/restore checks.
- Parse legacy `.xls` and native WPS `.et` through a backend job if the business requires those formats.
- Replace the development login stub with password/SSO identity provider and secure session rotation.
- Implement PostgreSQL adapter and migration runner from `docs/schema.sql`.
