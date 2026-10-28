# Sidebar polish — 28 October 2026

The sidebar now has a 256px desktop layout, a 72px icon rail from 768–1023px, and a 56px bottom tab bar below 768px. It reuses the existing colour, type and spacing tokens, with semantic aliases and the requested dimensions added to `tokens.css`.

## Scope

- `src/components/Sidebar.tsx`: extracted navigation presentation, semantic Primary nav/list/links, brand, Pilot label, source footer, responsive presentation and keyboard/pointer rail tooltips. All links call the existing navigation callback and prevent fragment navigation; destinations and browser location are unchanged.
- `src/App.tsx`: replaces the inline sidebar markup with the component. Its existing navigation function, view state, filters, data subscriptions and page rendering are unchanged.
- `src/styles.css`: replaces competing sidebar breakpoint rules; adds sticky full-height layouts, soft borders, active/hover/focus styles, rail/mobile layouts, safe-area clearance and reduced-motion support. The workspace topbar shares the 72px header height and soft divider, and stays sticky so alignment survives scrolling.
- `src/tokens.css`: requested dimensions and semantic aliases for existing design tokens.
- `tests/frontend/cache.test.tsx`: updates only five navigation selectors from button to link. Existing behavioral assertions remain unchanged.

No routes, API code, queries, data, metric calculations or non-navigation application logic changed.

## Browser verification

| Viewport | Navigation | At top and scroll end |
| --- | --- | --- |
| 1440 × 900 | 256px sidebar | Sidebar top 0, bottom 900; both dividers at y=72 |
| 1024 × 900 | 256px sidebar | Sidebar top 0, bottom 900; both dividers at y=72 |
| 768 × 900 | 72px icon rail | Rail top 0, bottom 900; both dividers at y=72 |
| 390 × 900 | 56px bottom tabs | Tabs bottom 900; content has matching bottom clearance |

All three pages were checked at scroll end at every requested width. Separate content-fit checks used taller viewports at the same widths: Decision desk on desktop/tablet, and a one-day accuracy filter on mobile. Each fit within its viewport without scrolling while navigation remained anchored to the bottom. The full January filter was restored afterward. The measurements include exact viewport sizes and rounding to device pixels.

- Brand mark is 36px; wordmark is 28px; header/nav inset is 16px. Logo and breadcrumb centers align.
- Desktop/rail nav targets are 44px high; mobile targets are at least 44px. Labels are 15px on desktop and 12px in mobile tabs. Icons are 20px with 1.75 stroke. Visible secondary/footer labels are at least 12px.
- Accent is inside the active pill, at left 0, top/bottom 10px, width 3px; active links have no border or trailing dot.
- Inactive/source text contrast is **6.55:1**, active/badge text **8.57:1**, dark footer text **12.89:1**. Focus colour contrast is **5.43:1** against the sidebar. The soft token-derived divider contrast is **1.24:1**, approximately the requested 1.3:1.
- Focus rings are authored as a 2px outline with 2px offset; the browser's device-pixel rounding reported 1.6px in this session. Keyboard focus was visibly inspected. Tab order reaches all destinations in order, then the content controls; the rail also exposes its source icon. Tooltips appear on focus, render outside the scrolling sidebar, and dismiss with Escape.
- Footer terms fit on one line in the full sidebar and never break mid-term. A compact container fallback gives WINDFOR its own line and keeps FUELHH with “wind”, avoiding an orphan final word.
- Mobile tabs do not cover the last content/footer after scrolling. Safe-area padding is implemented with `env(safe-area-inset-bottom)`; a physical device with a nonzero inset was not used. Reduced-motion transitions are disabled in CSS; OS preference switching was not performed.
- No browser console warnings or errors were captured during the checks.

## Screenshots

| Width | Before | After |
| --- | --- | --- |
| 1440 | [Before](before-1440.jpg) | [After](after-1440.jpg) |
| 1024 | [Before](before-1024.jpg) | [After](after-1024.jpg) |
| 768 | [Before](before-768.jpg) | [After](after-768.jpg) |
| 390 | [Before](before-390.jpg) | [After](after-390.jpg) |

Additional evidence: `after-scrolled-*.jpg`, `focus-*.jpg`, `content-fits-1440.jpg` and `measurements.json`.

TypeScript, production build and the existing 14 frontend integration tests passed. The unchanged integration assertions still cover navigation caching, no requests on outcome toggles, parameter cancellation, debounce and retry behavior.
