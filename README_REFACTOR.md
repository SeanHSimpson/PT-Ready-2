# PT Ready refactor (Cloudflare-ready)

This package is a structural refactor of the original single-file app.

## What changed
- Split the monolithic `index.html` into:
  - `index.html`
  - `styles.css`
  - `js/app.js`
- Replaced inline data-URL manifests with a real `manifest.webmanifest`
- Replaced remote icon references with local app icons
- Added a proper `sw.js` for offline shell caching
- Removed the production-hostile logic that unregistered all service workers and deleted caches on load

## What did not change yet
- Core feature logic is still largely in `js/app.js`
- Inline HTML event handlers still exist
- Business logic and DOM rendering are still tightly coupled
- User-entered content is still rendered in a few places with `innerHTML`

## Next recommended refactor steps
1. Extract scoring rules into `js/core/scoring.js`
2. Extract localStorage into `js/core/storage.js`
3. Replace inline handlers with delegated listeners
4. Replace risky `innerHTML` rendering for user content
5. Add tests for the score calculator and plan generator helpers

## Cloudflare Pages notes
- Publish directory: project root
- No build step required
- `_headers` and `_redirects` can be added later if needed
