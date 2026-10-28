# Cutoff picker and EvilCharts review

## What changed

- Replaced the difficult native time field with a themed, alarm-style picker: 24 hours, all 60 minutes, scroll snapping, tap selection, quick presets, Apply and Cancel.
- Draft selection stays local. Apply uses the existing cutoff state, query keys and debounce; Cancel/Escape restores the prior value. No backend, API, matching, metric or dataset changes.
- Clarified the buying date, forecast-publication cutoff and next-day delivery relationship beside the filters and inside the picker. The date field requests the browser's native calendar where supported.
- Added adapted MIT-licensed EvilCharts radial and radar components. Provenance and the exact adaptations are recorded in `src/components/evilcharts/UPSTREAM.md`; the complete notice ships in `public/licenses/evilcharts-MIT.txt`.
- Radial: the existing historical overforecast percentage, fixed to a 0–100 domain, with matched sample count. It is not an accuracy score or tomorrow's probability.
- Radar: six native four-hour observations, using the same selected forecast, fixed MW domain and actual-outcome visibility as the timeline. The connected polygon is not an energy total or a new error calculation. Incomplete forecast snapshots produce an explanatory empty state.
- Supplementary charts load in a separate chunk. No new npm runtime dependencies were added. Series animations are disabled to preserve stable outcome toggles; skeleton dimensions reserve chart space.

## Verification

- TypeScript and Vite production build passed.
- Frontend: 20 tests passed, including six new picker tests covering keyboard selection, boundaries, full minute resolution, Cancel/Escape, focus wrapping, and request behavior.
- Backend: 36 tests passed. One existing Starlette/httpx TestClient deprecation warning remains; there were no failures.
- Browser checks at 1440, 1024, 768 and 390 pixels: picker fits within the viewport, initial hours/minutes are correctly aligned, and no horizontal page overflow was observed. Desktop dialog becomes a mobile bottom sheet. Screenshots are included at each width.
- A real browser Tab cycle stayed within the modal, and Cancel returned focus to the trigger. Up/down select, left/right move between wheels without changing the decision date, and Escape discards the draft. Native wheel scrolling was exercised.
- Applying 09:00 on 15 January changed the cutoff and selected publication to 07:30 that morning. Restoring 09:30 restored the 09:30 publication. Tests confirm no requests during draft selection or Cancel; Apply issues one decision and one accuracy request through the existing cache subscriptions.
- Radar actuals conceal/reveal together with the existing timeline and audit. At the default selection, the radar renders one forecast polygon when concealed and two series when revealed. No new scoring or data interpolation was introduced.
- Default January radial: 84.3% overforecast across 744 matched observations, matching the existing API summary. MAE remains 1,996 MW, RMSE 2,499 MW, bias +1,728 MW and WAPE 17.7%.
- No browser console warnings/errors were captured in these checks. Physical iPhone/Safari touch behavior has not been device-tested; the picker uses native scrolling and CSS scroll snap, and reduced motion disables programmatic smooth selection.

`measurements.json` contains viewport bounds, wheel alignment, chart geometry and the recorded Tab cycle. The `picker-*`, `radial-*` and `radar-*` screenshots show the responsive states; mobile radar includes surrounding context.

## Changed source files

- `src/App.tsx`: filter explanation and picker integration.
- `src/components/CutoffPicker.tsx`: dialog and hour/minute wheel controls.
- `src/components/ui.tsx`: native date-picker activation and removal of the old time field.
- `src/components/DecisionView.tsx`, `AccuracyView.tsx`, `StatisticalCharts.tsx`: supplementary charts and outcome integration.
- `src/components/evilcharts/`: adapted components, config container and provenance.
- `src/styles.css`: picker, responsive sheet and chart presentation using existing tokens.
- `tests/frontend/cutoff.test.tsx`: interaction and request regressions.
- `README.md`, this review folder and `public/licenses/evilcharts-MIT.txt`: documentation, evidence and attribution.
