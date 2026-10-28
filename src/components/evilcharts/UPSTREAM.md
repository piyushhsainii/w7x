# EvilCharts component provenance

These are selected, adapted **EvilCharts** components, not the complete upstream registry. The upstream project provides copy-and-paste components on Recharts; no separate `evilcharts` npm runtime is required.

- Project: https://evilcharts.com and https://github.com/legions-developer/evilcharts
- Revision: `8b9c26d1f6b21033506f0cc8017e7940c7c26ad4`
- Radar source: https://github.com/legions-developer/evilcharts/blob/8b9c26d1f6b21033506f0cc8017e7940c7c26ad4/src/registry/charts/recharts-radar-chart.tsx
- Radial source: https://github.com/legions-developer/evilcharts/blob/8b9c26d1f6b21033506f0cc8017e7940c7c26ad4/src/registry/charts/recharts-radial-chart.tsx
- License: MIT, Copyright (c) 2026 Gurbinder; full notice is bundled in `public/licenses/evilcharts-MIT.txt`.

The selected compound roots, configurable series, polar axes, scoped gradient definitions, radial prepared-data mapping and fixed-total domain are adapted from those modules. The shared container maps chart-config colours to CSS variables and the project's existing responsive Recharts boundary.

Adaptations: retain the existing Recharts 3.3 runtime; replace shadcn/Tailwind presentation with Aer tokens and CSS; omit unused click-selection/glow/background variants, demo loading generators and animation timers; use the existing tooltip design; increase default axis text to 12px; disable series animations to preserve instant, stable outcome toggles. No fabricated/demo chart data or upstream loading skeleton values enter the product. Only API-provided wind points and the existing overforecast percentage are plotted.
