# Compact workspace layout review

## Result

The Decision desk now places the four compact KPIs and the complete forecast card in the first viewport at 1920×1080, 1440×900 and 1366×768. The redundant filter card, summary line, key-finding repeat and standalone freshness row are removed. The 64px topbar and sidebar header share the same divider height.

Measurements use the January 15 decision, January 16 delivery and 09:30 GMT cutoff. Screenshots are viewport captures, not full-page composites. `measurements.json` contains the raw browser bounds.

| Viewport  | KPI bottom | Forecast top | Visible forecast card | Before / after                                      |
| --------- | ---------: | -----------: | --------------------: | --------------------------------------------------- |
| 1920×1080 |      284px |        300px |                  100% | [Before](before-1920.jpg) · [After](after-1920.jpg) |
| 1440×900  |      284px |        300px |                  100% | [Before](before-1440.jpg) · [After](after-1440.jpg) |
| 1366×768  |      284px |        300px |                  100% | [Before](before-1366.jpg) · [After](after-1366.jpg) |
| 1024×768  |      420px |        436px |                   69% | [Before](before-1024.jpg) · [After](after-1024.jpg) |
| 390×844   |      721px |        737px |                   19% | [Before](before-390.jpg) · [After](after-390.jpg)   |

All four KPIs occupy one 120px row on the three desktop sizes; they form two columns at 1024px and one column on narrow mobile screens. No horizontal page scrolling was observed on either workspace at any tested width. The mobile chart is below the KPI stack; desktop visibility targets do not apply to the 390px layout.

## Controls and accessibility

- Date and date-range controls are in the topbar. The January calendar supports arrow keys, Home/End and selection; previous/next day buttons retain the existing debounced behavior and left/right shortcuts. Calendar arrows do not trigger the global day shortcuts.
- The cutoff chip opens a small native time input with automatic application and a Reset to 09:30 action. Escape closes without undoing already edited values. There is no Apply/Update button. [Desktop cutoff](cutoff-1440.jpg) · [Calendar](date-1440.jpg).
- Cutoff remains the existing shared App state. Its applied value initializes from and replaces the URL parameter; unrelated parameters and hashes remain intact. Neither `pushState` nor navigation is used. An actual scrolled-page edit retained scrollY at 1580.8px before and after; the URL and source publication updated.
- Below 768px, date/time controls collapse into the [Filters popover](filters-390.jpg). Popovers close on Escape/outside click, wrap keyboard focus at both ends and return focus to their trigger. Bounds account for the document scrollbar so mobile borders remain visible.
- New targets are at least 40px; native inputs are 44px. Existing 2px focus-ring tokens are retained. New text is at least 12px. Token contrast checks: muted text 7.08:1 on cards and 5.87:1 on the page; primary text 8.57:1 on the tinted chip; focus colour 5.87:1 on cards.
- Refresh remains current-workspace-only. Its freshness text moved into a tooltip with `aria-live="polite"`; its timestamp comes from the existing query result. Historical replay stays last in the topbar and becomes an accessible icon at smaller widths.

## Chart and cards

- Content starts 32px after the sidebar and has a 1440px maximum width. The forecast/integrity layout is 3fr/1fr from 1280px, with the integrity card below the chart at narrower widths. Integrity text is laid out in normal block flow to avoid title overlap.
- KPIs use 16px padding, 13px labels, 32px values, baseline-aligned units and one caption line. The fourth card's MAE definition lives in an info tooltip on its label. Its ruler icon remains aligned with the other card icons. Earlier versus realized labels/values still follow the existing outcome state.
- The forecast card fills the remaining desktop viewport, with a 360px minimum. Its header contains the existing outcome toggle and CSV export. The chart's points, axis domain, provenance, selection and outcome behavior are unchanged.
- The outcome reveal/conceal check preserved exact KPI, chart and plot bounds, URL and scroll position. Existing tests also confirm no fetch, root App rerender, chart/table replacement or pagination/selection loss during toggles.
- Accuracy uses the same date-range/cutoff topbar. Export CSV is in the daily-breakdown header. [Accuracy before, desktop](accuracy-before-1440.jpg) · [After](accuracy-after-1440.jpg) · [Before, mobile](accuracy-before-390.jpg) · [After](accuracy-after-390.jpg). Additional captures cover 1920, 1366 and 1024px.

## Validation and scope

- 23 frontend tests passed, including the existing caching/outcome regressions and new URL, debounce, calendar/focus and range-validation checks.
- 36 Python tests passed; one existing Starlette/httpx TestClient deprecation warning remains.
- TypeScript and Vite production build passed. No browser console warnings/errors were captured during the final local checks.
- Backend, API, data files, query keys/functions, cache policy and outcome store are unchanged. The topbar reuses existing query observers/results, so it adds no endpoint or parameter changes. No dependencies were added.
- Physical iPhone/Safari behavior was not device-tested; responsive checks use Chromium. Native mobile date/time pickers remain provided by the browser.

## Files changed

- `src/App.tsx`: compact header, shared cutoff URL preference, concise heading and removal of the controls card.
- `src/components/TopbarControls.tsx` (new): date/range, time and mobile Filters popovers; existing-query refresh adapters.
- `src/components/DecisionView.tsx`: compact KPI wording/MAE tooltip, chart-header actions and removal of repeated key finding/freshness row.
- `src/components/AccuracyView.tsx`: remove the old freshness row and label the daily-header export.
- `src/components/QueryControls.tsx`: refresh timestamp in an accessible tooltip.
- `src/components/ui.tsx`: optional tooltip-only metric definition with an accessible heading label.
- `src/styles.css`, `src/tokens.css`: layout, compact cards, popovers, responsive presentation and shared 64px header token.
- `tests/frontend/topbar.test.tsx` (new): URL restoration/replacement, shared cutoff, debounced requests, calendar keys, focus return/wrapping and invalid date ranges.
- `tests/frontend/cache.test.tsx`: updated accessible name of the next-day control; existing caching/toggle assertions retained.
- `tests/frontend/cutoff.test.tsx`: new compact cutoff integration; the existing standalone wheel component tests remain.
- `tests/frontend/setup.ts`: reset browser URL between tests to isolate persisted preferences.
- `README.md`: current controls and review link.
- `docs/layout-review/`: this review, raw bounds and before/after screenshots.
