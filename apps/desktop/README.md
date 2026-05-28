# Desktop Client Readiness

Desktop packaging should use Tauri after the Web/API vertical slice is stable with real imported data.

Rules:

- Reuse `apps/web` UI and `apps/api` endpoints.
- Do not duplicate business logic in the desktop shell.
- Desktop-specific features should stay narrow: login session, file picker / drag import, local cache, updater, and smoke checks.
- First smoke path: install -> open -> login -> dashboard -> import validation preview -> source drilldown.
- Current scaffold: `apps/desktop/tauri.conf.json` points at `apps/web/dist` and the shared dev URL. A Rust/Tauri project still needs to be generated before packaging.
