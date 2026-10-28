# Cache and outcome interaction revision — 28 October 2026

No forecast selection, matching rule, metric formula, snapshot record, or API response shape changed. See [verification evidence](REPORT.md).

| Brief requirement | Implementation |
| --- | --- |
| 1.1–1.3, 1.9 | One QueryClientProvider above App's state-based navigation; typed decision, accuracy and metadata hooks; complete parameter keys; named infinite stale time and one-hour garbage collection; no server-response copies in local state/context. Focus, reconnect and mount refetch disabled. One exponentially delayed retry, with none for any 4xx, including 429. |
| 1.4 | Refresh data on each workspace, accessible name and native tooltip, inline spinner, relative timestamp from dataUpdatedAt, and retained content during refresh or refresh failure. Only the selected workspace refetches. |
| 1.5–1.6 | Optional hover prefetch replaced by one persistent subscription per workspace: both current keys warm once, requests deduplicate, and navigation cannot abort an in-flight request. Production StrictMode produces one request per key. |
| 1.7, 1.10 | keepPreviousData with an updating message; 300 ms date/cutoff debounce, including rapid previous/next clicks; query AbortSignal consumed by fetch so superseded keys cancel. |
| 1.8 | Successful read-only API responses have public max-age=300, stale-while-revalidate=600 and a strong SHA-256 ETag. If-None-Match returns an empty 304; unsuccessful validation responses are not cached. |
| 2.1–2.2 | Tiny UI-only outcome store, scoped by decision date/cutoff. Always load the existing reveal=true representation. Toggle never fetches, changes query keys, navigates, or changes location. CSV reveal state remains an explicit download choice. |
| 2.3, 2.5 | Chart, KPIs, legend, actual/error columns and values remain mounted. Overlapping visibility layers reserve the larger intrinsic dimensions. Selection and pagination survive toggles. Button is type=button; no scroll/focus calls; scroll container retains overflow-anchor:auto. |
| 2.4, 2.6 | Memoized chart and audit table, memoized rows/domain and stable selection callback; static chart options; always-mounted actual Line uses hide; every series disables animation. Domain includes forecast and actual once per payload; existing fixed chart heights retained. OutcomeRegion subscribers isolate changing regions and actual/error cells from the App root, data owner and static audit rows. |
| 2.7 | Optional reveal animation omitted: visibility changes are immediate. Refresh spinner respects reduced motion. |
| Verification | Fourteen mocked-fetch frontend tests, thirty-six Python tests, real-browser fetch counting, geometry/scroll checks, PerformanceObserver layout-shift checks and React profiling-build traces. CI now includes frontend tests alongside the production and Docker builds. |

The audit scripts and profiling build are explicitly local QA tools. A normal production build excludes the instrumentation and uses the regular React runtime.
