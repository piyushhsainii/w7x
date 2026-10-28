# Pooled-MAE label correction — 28 October 2026

Implementation changes are limited to `src/components/AccuracyView.tsx` and `src/styles.css`. Data, metrics, query hooks and API code are unchanged.

- Desktop/tablet: reserve a 130px right chart margin. Place a 110×46px two-line pill 8px beyond the plot's right edge, centered on the pooled-MAE line. Text uses start alignment and middle baseline.
- Below 640px: retain the original 18px right margin and place the pill at plot-left + 8px, with its bottom 8px above the line. Existing 42px top plot padding exceeds the requested 24px minimum. Paint the reference annotation after bars so the opaque surface protects its text in this compact placement.
- Clamp the pill at vertical extremes to keep it inside chart bounds. Desktop stays within the plot's vertical extent; mobile may use the reserved top margin for a near-top line.
- SVG, chart wrapper and parent card overflow are explicitly visible. The pill uses the existing card surface, a 1px dark-green border and 12px semibold dark-green text. Contrast of `#214a36` against `#fcfdfb` is **9.81:1**. The label's number comes from the existing pooled MAE value.
- The SVG line exposes **“Pooled MAE across January: 1,996 megawatts”**. Browser accessibility inspection also exposed the label group and both text lines; it is not aria-hidden.

| Browser viewport | Placement | Text fully inside pill | 27 Jan collision | First-bar collision | Console warnings/errors |
| --- | --- | --- | --- | --- | --- |
| 1440px | Outside plot, right | Pass | None | None | None |
| 1024px | Outside plot, right | Pass | None | None | None |
| 768px | Outside plot, right | Pass | None | None | None |
| 390px | Above line, left | Pass | None | None | None |

Screenshots: [1440](1440.jpg), [1024](1024.jpg), [768](768.jpg), [390](390.jpg). `measurements.json` contains the browser geometry, overflow, typography and accessible-line-name checks. Screenshots show the current 1–31 January data at 09:30, with the existing 31 bars and 0–6000 MW Y-axis retained. The intentional desktop gutter reduces horizontal plot width; bar values, colours, ordering, interactions, vertical scale, axes configuration and chart heights are unchanged. Mobile retains the original horizontal and vertical plot dimensions.

TypeScript compilation, production build and all 14 existing frontend integration tests passed. No new calculation or API tests were needed for this presentation-only change.
