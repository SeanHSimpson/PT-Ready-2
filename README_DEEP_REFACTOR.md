# Deep Refactor Notes

This pass goes beyond the initial file split and extracts core concerns into dedicated files:

- `js/scoring.js` — PFRA scoring tables and lookup helpers
- `js/storage.js` — localStorage wrapper, key registry, escaping helper, and initial state loader
- `js/pwa.js` — install banner behavior, service-worker registration, and version check
- `js/app.js` — remaining UI, calculator, logs, history, AI plan flow, and plan viewer

## Concrete fixes included

- fixed the install banner mismatch (`installPWA()` now exists and matches `index.html`)
- removed duplicate PWA/service-worker logic from `app.js`
- centralized storage access through `window.appStore`
- initialized saved plan state through storage helpers
- started sanitizing user-entered log content before rendering

## Still recommended next

- remove inline `onclick` handlers in favor of delegated listeners
- extract AI plan generation into its own module
- extract logs/history rendering into DOM-safe builders
- add real tests for scoring logic and progression logic
