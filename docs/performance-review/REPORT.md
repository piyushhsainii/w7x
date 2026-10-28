# Performance verification — 28 October 2026

The revised app preserves all API payloads and analytical behavior while eliminating navigation refetches and outcome-toggle reloads.

## Measured request counts

Baseline: commit `8e62b602d328539e8890791f188b28567e9e5972`. Both versions ran locally against the identical bundled snapshot in the same Chromium in-app browser. A local script loaded before the application counted actual fetch invocations, including calls satisfied by HTTP cache. It did not issue requests itself. The ten-loop sequence was **Decision desk → Forecast accuracy → Methodology → Decision desk → Forecast accuracy**. No cache was disabled.

| Action | Before: decision / accuracy | After: decision / accuracy |
| --- | --- | --- |
| Initial load plus ten rapid loops | 20 / 20 | 1 / 1 |
| Ten outcome toggles, after data loaded | 10 / 0 | 0 / 0 |
| New decision date | 1 / 0 | 1 / 0 |
| Return to cached decision date | 1 / 0 | 0 / 0 |
| Manual refresh on Decision desk | Unavailable | 1 / 0 |
| Focus/blur and reconnect | No explicit listener in old implementation | 0 / 0 in integration test |

Metadata fetched once in both measured navigation runs. The revised app intentionally warms decision and accuracy in parallel at initial load. During the loop, unchanged parameters produce no additional fetches. A different cutoff creates new entries for both workspaces; a changed decision date affects only its decision entry. The cache is in memory for this browser session; a full reload creates a new client.

**Measurement boundary:** these are browser fetch counts captured by the provided instrumentation, not a DevTools Network-panel screenshot/HAR. The available browser automation does not expose the Network panel. HTTP wire requests alone would undercount the old behavior because the old browser cache sometimes served responses. To reproduce the literal Network-panel check, open DevTools, select Fetch/XHR, leave Disable cache unchecked, reload and run the sequence above. Raw before/after JSON evidence is committed beside this report.

The new-date, cached-return and refresh checks were observed in the browser; the final counts are in `after-refresh.json`. The same behavior, concurrent in-flight deduplication, parameter cancellation and debounce are asserted by frontend tests. Focus/reconnect events are exercised through TanStack's focus/online managers in tests; physical network disconnection was not measured.

## Toggle geometry and rendering

Ten alternating show/hide clicks were measured while scrolled to **628.8 px**. All ten preserved:

- Scroll position and browser URL exactly.
- The same chart wrapper and table DOM nodes, selected row, pagination and Y-axis ticks.
- Document positions, widths and heights of the chart, KPI grid, context, integrity and audit panels.
- Zero extra fetches and zero App-root render commits.
- **Zero additional layout-shift value**, including shifts after recent input. This is stricter for the interaction than standard CLS, which excludes recent-input shifts. The whole navigation session had other layout shifts; this is not a claim of zero whole-page CLS.

`after-toggles.json` contains the ten before/after measurements and React Profiler callbacks. The audit build uses `react-dom/profiling`; the sum of actualDuration across the commits for each toggle ranged from **9.1 to 11.8 ms**, median **10.45 ms** on this machine. These are diagnostic React render/commit samples, not an INP benchmark or guaranteed timing on other devices. Chart animation is disabled in code. The actual line changes its hide prop and the explicit domain remains fixed.

The old toggle directly measured two extra fetches, replacement of both chart/table nodes and a scroll drop from approximately 572.8 to 202.4 px while its loading state was visible. Baseline root-commit counts were not instrumented and are not interpreted.

**Tooling boundary:** React profiling callbacks and browser PerformanceObserver were measured. React DevTools' graphical highlight-updates mode and a Lighthouse run were not available through the browser tooling, so no Lighthouse score or DevTools trace is claimed. The recorded zero interaction shift and stable geometry provide direct evidence for this particular defect.

## Automated and payload checks

- `npm test`: **14 frontend tests passed**, covering the full App navigation loop, pending-request navigation, cached return, manual refresh, 429 without retry/blanking, debounce, AbortSignal cancellation, retry rules and outcome DOM/location invariants. jsdom uses fixed measurements at the ResponsiveContainer boundary; the underlying Recharts chart and axes render. Real layout claims come from the browser checks above.
- `python -m pytest -q`: **36 tests passed**, including all existing analytical tests and new strong-ETag/304, representation-specific validation and error-cache tests. The existing development-only Starlette/httpx migration warning remains.
- TypeScript and normal Vite production build passed. The final asset was checked for absence of the audit script and diagnostic event names.
- **70 old/new API responses were byte-for-byte equal**: all 31 decision dates with reveal both false and true, health/meta, three accuracy parameter sets and JSON/CSV exports. Hashes are in `payload-comparison.json`.
- `backend/analysis.py`, ingestion code and `data/` are unchanged. The original reveal=false API behavior is retained for compatibility; the frontend now consistently requests reveal=true. The UI's concealment is a presentation aid for public data, not an authorization boundary.

## Reproduce

```sh
npm ci
npm test
python -m pytest -q
npm run build
```

For local interaction/profiling evidence:

```sh
node node_modules/vite/bin/vite.js build --mode audit
python scripts/prepare_performance_audit.py
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

Open the app, perform the steps, then expand “Local performance audit” at the bottom to read the captured JSON. **Do not deploy the audit dist.** `npm run build` cleans it and returns to the ordinary runtime. Production contains no audit overlay or fetch wrapper.

The local Docker daemon was unavailable during this revision. The repository's clean Ubuntu CI runs a Docker build; its result is recorded in the publication verification entry below.
