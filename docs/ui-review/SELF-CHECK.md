# UI self-check

Verified on 28 October 2026 against the original application commit `fe97b97810b643082dfc93fd495ec9a62bd2d7fe`. This is a targeted source, contrast-token, browser, and functional check; it is not an independent accessibility certification.

## Scope preserved

- Backend code, ASGI entrypoint, API types, ingestion, database, and Python dependency files have no changes.
- Four representative JSON responses were compared with the pre-revision deployment and matched exactly: hidden and revealed 15 January decisions, 31 January at 09:00, and full-month accuracy at 09:30.
- Existing Python tests: **27 passed**. TypeScript and the production frontend build passed.
- No new forecasting or error calculations were introduced. Key findings format existing response values; worst-day highlighting only sorts existing daily MAE values. Exact timestamp matching, no interpolation, actual-vintage policy, and `publishTime <= cutoff` remain in Python unchanged.
- API endpoint URLs, parameter names, and response contracts are unchanged. Request timing intentionally changes to a **300 ms debounce** because this brief requests automatic filters. Invalid ranges do not replace the last valid applied range.

## Type and contrast

| Check | Observed result |
|---|---|
| Configured minimum text | 12px |
| Rendered minimum across all three pages at all four widths | 12px; no smaller visible text found |
| Text token combinations | 38 tested pairs; minimum 4.90:1 |
| Card border against page | 1.75:1, exceeding the requested 1.3:1 |
| Control borders against page/control surfaces | Minimum 3.81:1 |
| Focus ring against page | 4.86:1; 2px outline with an offset |
| Chart text | 12px or larger; pooled-MAE label has an opaque surface; rank labels use white on dark green |
| Formula and checksum text | 14–15px, high-contrast text on solid surfaces |

Configured enabled text colors meet the requested AA minimum. No enabled text contrast exception was identified in the checked design. Inactive disabled controls use reduced opacity and are exempt from WCAG text-contrast requirements. Decorative gridlines are intentionally quieter than data marks and are not used to communicate values by themselves.

Dense chart bars can be narrower than the requested 40px control target. They have equivalent full-width, keyboard-operable table rows with 56px heights, plus 40px-or-larger worst-day controls. Forecast points have 40px transparent hit areas. This is the explicit target-size exception; regular buttons, links, navigation controls, glossary triggers, and day controls meet the 40px minimum height.

## Responsive checks

Every page had one h1, a sticky sidebar/mobile navigation header, no unnamed icon-only buttons, and no document-level horizontal overflow.

| Requested viewport width | Decision KPIs | Accuracy KPIs | Methodology |
|---|---:|---:|---|
| 1440px | 4 columns | 4 columns | Natural-height columns and timeline |
| 1024px | 2 columns | 2 columns | Natural-height columns and timeline |
| 768px | 2 columns | 2 columns | Single-column steps/formulas |
| 390px | 1 column | 1 column | Single-column steps and vertical timeline |

Tables scroll horizontally within their containers and keep the first column sticky. Daily breakdown shows all 31 rows with page scrolling, so no fixed-height body cuts off a row. Desktop daily headers are sticky during page scrolling; narrow horizontal table containers retain sticky header/first-column positioning without clipping the body.

## Interaction and presentation checks

- Dates visibly use `19 Jan 2026`; source/publication dates and retrieval date share the same formatter. Time controls and context use `09:30 GMT`; chart ticks use `HH:mm` with an explicit GMT axis caption. ISO dates remain internal input/API values.
- Inspection uses ChevronRight, including row activation and worst-day replay. No ArrowUpRight/↗ icon remains in application source. ExternalLink occurs only on external Elexon documentation links.
- Shared Lucide wrapper sets decorative icons to aria-hidden with 1.75px strokes; KPI icons are 20px and navigation icons 18px.
- Outcome is hidden on initial load and when the date/cutoff changes. Actual columns and selected-day realized error are absent until reveal; earlier-error context is available without exposing the selected day’s actuals.
- January 31 selects February 1 delivery; moving cutoff from 09:30 to 09:00 selects the eligible 07:30 publication in the checked example.
- The first January decision reports no earlier January history, rather than inventing an error estimate.
- All-half-hours view retains :30 actuals with no generated forecast/error. Lead time comes directly from the existing API field.
- Keyboard chart-point inspection shows forecast, publication, lead time, and revealed outcome details. Full table alternatives are available for both charts.
- Reversed range validation, worst-day replay, left/right day shortcuts, checksum copying, and glossary focus tooltips were exercised. A mobile glossary tooltip stayed within the viewport.
- Captured browser logs contained no application errors or warnings during the checked interactions. Reduced-motion CSS disables animation and transitions.

## Evidence

- [Configured token/API validation](validation.json)
- [Twelve responsive page checks](browser-checks.json)
- [Interaction checks](interaction-checks.json)
- [Before/after gallery](index.html): all three pages at 1440px and 390px, captured as full-page screenshots
- [Changes mapped to the nine brief sections](CHANGELOG.md)

The checks used Chromium through the in-app browser. Other browser engines and assistive technologies were not independently certified.
