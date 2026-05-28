# Mobile / PWA Readiness

The MVP mobile path should start as responsive Web/PWA for fill-in and approvals.

Rules:

- Reuse the same API and state machines.
- Mobile users should get scoped actions only: HEV submit, task update, risk confirmation, approval/decision view.
- Do not store secrets or canonical business data in browser local storage.
- Use Capacitor or Expo only after the PWA path proves daily usage.
- Current scaffold: `apps/web/public/manifest.webmanifest` and `apps/web/public/sw.js` support install-readiness while keeping `/api/*` server-authoritative.
