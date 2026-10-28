# Aer wind intelligence

A React and Python decision-support pilot for an energy utility buying day-ahead electricity. Replay a January 2026 buying decision, inspect the latest eligible Elexon wind forecast, then reveal the outcome and quantitatively evaluate forecast error.

**Public repository:** https://github.com/piyushhsainii/w7x

**AI assistance disclosure:** OpenAI Codex assisted with domain research, architecture, implementation, UI styling, tests, and documentation. The submitted data comes from Elexon, not an AI generator. Read and understand the implementation before presenting it as your work.

## Run with Docker

Prerequisite: Docker Engine with Compose, running locally.

```sh
docker compose up --build
```

Open http://localhost:8000. The included, checksum-verified historical snapshot makes the app usable without an Elexon connection. The container runs as an unprivileged user; Compose binds only to loopback and uses a read-only filesystem. Stop with `docker compose down`.

## Run without Docker

Requires Python 3.11+ and Node 22.13+ (or Node 24).

```sh
python -m venv .venv
# Windows PowerShell
.venv/Scripts/python.exe -m pip install -r requirements.lock -r requirements-dev.txt
# macOS/Linux: .venv/bin/python -m pip install -r requirements.lock -r requirements-dev.txt
npm ci
npm run build
.venv/Scripts/python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

For frontend development, start the API, then run `npm run dev` in another terminal. Vite proxies `/api` to port 8000. The production build self-hosts Inter and makes no Google Fonts requests.

## Deployment

**Live application: https://q7m2vx-two.vercel.app**

The deployment verification status is recorded in [docs/verification.md](docs/verification.md). Vercel serves static React assets and a Python ASGI function. `vercel.json` preserves a same-origin `/api` interface; Docker uses the same FastAPI application and database.

To deploy in your own Vercel account:

```sh
npx vercel login
npx vercel --prod
```

Deploy the repository root, not `src/` or `dist/`. Vercel builds React and bundles `api/index.py`, the backend, `data/wind.sqlite`, and `data/manifest.json`. Vercel uses its Python runtime rather than running the Docker image; Docker is the reproducible local/container deployment path. No runtime writable database or API key is required. Do not enable a static-only deployment because it would omit the Python API.

## Product flow

1. **Decision desk:** choose the decision date and buying cutoff; valid filters apply automatically after 300 ms. Inspect hourly next-day wind, publication provenance, lead time, coverage, and earlier errors available by that cutoff. Actual outcomes are hidden by default.
2. **Show actual outcome:** overlay actuals and display realized MAE. An audit table shows each source publication and signed error. The CSV follows the same hidden/revealed state.
3. **Forecast accuracy:** filter January decision dates; inspect pooled MAE, RMSE, bias, P90, WAPE, overforecast risk, coverage, and daily scores. Select a daily score to replay it.
4. **Methodology:** explains the formulas, timing rules, source snapshot, and limitations inside the product.

The browser caches immutable results by date/range/cutoff for the session, with no automatic focus/reconnect/navigation refetch. Each workspace offers an explicit refresh and update timestamp. The outcome toggle reveals public actuals already loaded in memory: concealment is visual, **not access control**. Both representations remain supported by the API and CSV export. See the [performance changelog](docs/performance-review/CHANGELOG.md) and [measured before/after report](docs/performance-review/REPORT.md).

## Data and assumptions

- **Scope:** only Elexon `WINDFOR` forecasts and `FUELHH` actuals where `fuelType=WIND`. No weather, prices, demand, or external generation data are added.
- **Dates:** “purchase decisions made in January” means 1–31 January decisions and 2 January–1 February delivery. Forecast publications from 30 December onward provide an earlier-publication buffer.
- **Cutoff:** 09:30 UK is an illustrative default, configurable to the client’s workflow. It is not claimed to be the universal GB auction deadline.
- **Availability:** for each delivery `startTime`, select the greatest `publishTime <= cutoff`. Source publication time is a proxy for availability; we cannot reconstruct actual client receipt latency.
- **Important observed resolution:** the downloaded January WINDFOR points are hourly, while FUELHH is half-hourly. We match exact `startTime` values, never interpolate or forward-fill. At 09:30 there are 24 forecast points and 48 actual points per delivery day, with **24 paired observations**. Coverage is shown against both grids. Chart segments are visual connectors, not generated forecasts.
- **Energy:** no full-day forecast MWh is claimed from sparse native timestamps. This is a timestamp-matched MW comparison, not a complete half-hourly energy backtest. FUELHH is half-hour average outturn; source forecast semantics and coverage may contribute to measured differences. The metrics describe the specified dataset pair, not an isolated estimate of weather-model error.
- **Actual vintage:** retrospective accuracy selects the latest retrieved actual publication per timestamp. Prior performance restricts actual publications to those at or before the current replay cutoff and uses only earlier January decisions.
- **Missing data:** null remains null, metrics omit unpaired rows and report missingness. Zero actuals are valid; WAPE is undefined when total matched actual is zero. No fabricated fallback exists.
- **Risk:** a positive `forecast-actual` error implies wind overforecast, potentially contributing to underprocurement. National error is not the client’s portfolio error. No purchase quantities, trades, savings, or confidence guarantees are produced.

## Quantitative evaluation

For matched forecast F and actual A, `e = F - A`:

| Measure               | Formula                       | Interpretation                                                |
| --------------------- | ----------------------------- | ------------------------------------------------------------- |
| MAE MW                | mean(abs(e))                  | Typical error magnitude                                       |
| RMSE MW               | sqrt(mean(e²))                | Weighs large errors more heavily                              |
| Bias MW               | mean(e)                       | Positive means wind overforecast                              |
| WAPE %                | 100 × sum(abs(e)) / sum(A)    | Aggregate absolute error relative to actual generation        |
| P90 absolute error MW | 90th percentile of abs(e)     | Historical magnitude threshold, not a guaranteed future bound |
| Overforecast share %  | 100 × count(e > 0) / count(e) | Frequency of positive errors                                  |

Percentiles use linear interpolation between ordered observations. Pooled metrics operate on all matched observations, not averages of rounded daily scores. January is a short sample with correlated observations: these are descriptive results, not proof of future performance. No ML model is trained because the requirement is to evaluate the provided forecasts.

## Repository map

| Path                                              | Responsibility                                                                        |
| ------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `src/App.tsx`                                     | Navigation, active decision context, automatic filters, and keyboard day navigation   |
| `src/components/`                                 | Decision desk, accuracy, methodology, and shared accessible UI components             |
| `src/query.ts`, `src/outcome.ts`, `src/format.ts` | Shared TanStack query cache, UI-only outcome state, and UK display formatting         |
| `src/api.ts`                                      | Typed API contracts and HTTP error handling                                           |
| `src/tokens.css`, `src/styles.css`                | Shared type, spacing, contrast, semantic color tokens, and responsive layout          |
| `src/main.tsx`, `index.html`, `public/`           | App bootstrapping, local font imports, favicon                                        |
| `backend/analysis.py`                             | Publication selection, matching, metrics, pooled summaries                            |
| `backend/main.py`                                 | Validated read-only FastAPI endpoints, CSV exports, static serving, headers           |
| `api/index.py`                                    | Vercel Python ASGI entrypoint                                                         |
| `scripts/ingest.py`                               | Bounded source downloads, retries, gzip cache, validation, atomic snapshot build      |
| `data/wind.sqlite`                                | Immutable indexed forecast/actual snapshot                                            |
| `data/manifest.json`                              | Source URLs, retrieval times, checksums, row counts                                   |
| `data/raw/`                                       | Original compressed Elexon responses and metadata for reproducibility                 |
| `tests/`                                          | Calculation, timing, exports, cache headers, and mocked-fetch React integration tests |
| `docs/presentation-guide.md`                      | Plain-language explanation and timed video script                                     |
| `docs/architecture.md`                            | Design choices, security, limitations, and future extension                           |
| `docs/verification.md`                            | Actual verification results and deployment status                                     |
| `docs/ui-review/`                                 | UI changelog, self-check, validation evidence, and before/after screenshots           |
| `docs/cutoff-review/`                             | Cutoff picker and supplementary chart verification, with responsive screenshots       |
| `src/components/evilcharts/`                      | Adapted MIT-licensed EvilCharts components and upstream provenance                    |
| `public/licenses/evilcharts-MIT.txt`              | EvilCharts copyright and license notice                                               |
| `Dockerfile`, `compose.yaml`                      | Container build and hardened local runtime                                            |
| `vercel.json`, `.vercelignore`                    | Vercel static frontend and Python function deployment                                 |
| `.github/workflows/checks.yml`                    | Python and frontend tests, TypeScript/Vite build, Docker build on GitHub              |
| `requirements.lock`, `package-lock.json`          | Pinned dependency resolutions                                                         |

The reference image does not identify a typeface. Inter is used as a close sans-serif match, with locally hosted assets. The reference’s greys, soft shadows, rounded surfaces, pastel header treatment, and generous spacing are adapted to a readable analytical interface.

## API

```text
GET /api/health
GET /api/meta
GET /api/decision?decision_date=2026-01-15&cutoff=09:30&reveal=false
GET /api/accuracy?start=2026-01-01&end=2026-01-31&cutoff=09:30
GET /api/export?decision_date=2026-01-15&cutoff=09:30&reveal=true
GET /api/accuracy/export?start=2026-01-01&end=2026-01-31&cutoff=09:30
```

Dates outside January, malformed times, and reversed ranges return 422. Unsupported mutations return 405. OpenAPI is at `/api/openapi.json`. Swagger at `/api/docs` works locally; strict deployment CSP can block Swagger’s CDN resources without affecting the app or OpenAPI JSON.

## Rebuild the snapshot

```sh
python scripts/ingest.py
# Re-download rather than reuse archived responses:
python scripts/ingest.py --refresh
```

Run ingestion as a separate build/operator step, not in a public request handler. It requests bounded daily ranges, retries transient errors, rejects invalid/conflicting records, and replaces the database only after successful import. Cached payload checksums are verified. Restart the API after a snapshot rebuild to clear immutable-snapshot caches, then rebuild/redeploy the container or Vercel app. Raw responses are excluded from deployment bundles but retained in the source archive.

## Verify

```sh
.venv/Scripts/python.exe -m pytest -q
npm test
npm run build
docker compose up --build
```

Core tests include publication exactly at and just after cutoff, independent selection per target, actual publication availability, sparse hourly matching, no zero filling, pooled metrics, zero-denominator WAPE, January boundaries, hidden outcome response/CSV, validation, and basic security headers.

## Security and efficiency

Public, non-sensitive Elexon data is served read-only. There are no accounts, uploaded files, trading credentials, orders, arbitrary fetch URLs, or client-supplied database paths. All SQL values are parameterized, date ranges are bounded to January, errors avoid exposing stack traces, and no permissive CORS is enabled. Exports contain only system dates and numeric source values. HTTP security headers protect the UI; TLS and edge traffic controls are provided by the deployment platform.

SQLite opens read-only and immutable, using indexed target/publication keys. Lightweight standard-library calculations avoid pandas/ML cold-start overhead. Bounded memoization, a shared browser cache and conditional HTTP responses reuse immutable analysis. The UI loads public actuals once and visually conceals them until revealed; this is not access control. API consumers can still explicitly request reveal=false. Fonts are local, and chart data is small. The non-root Docker runtime drops Linux capabilities under Compose. Before extending to private portfolios or execution, add authentication, authorization, audit logging, durable storage, platform rate controls, and an explicit trading-risk workflow.

## Cutoff picker and supplementary charts

The compact 64px topbar contains the decision date (or accuracy date range), shared forecast cutoff and refresh control. Open the cutoff chip to edit its native time input or reset to 09:30; valid changes apply automatically after the existing 300 ms debounce. Escape closes the popover; it does not undo edits. The applied cutoff is restored from and persisted to the URL with `replaceState`, without navigation or a scroll reset. Decision date is the buying day; delivery is the following day. Below 768px, Filters groups the date and time controls. CSV exports live in the forecast and daily-breakdown card headers. The redundant Decision desk key finding was removed; the four compact KPIs and main forecast fit at desktop heights. See [layout verification and before/after screenshots](docs/layout-review/README.md).

Supplementary radial and radar views adapt the open-source [EvilCharts](https://evilcharts.com/) Recharts components to Aer’s design tokens. The radial shows the API’s historical overforecast frequency (not an accuracy score or future probability). The radar compares six native four-hour wind snapshots on a shared MW scale; it does not integrate energy or calculate a new metric. The existing timeline, audit table and MAE/RMSE/bias/WAPE remain authoritative. Actuals follow the existing reveal control. See [upstream provenance and adaptations](src/components/evilcharts/UPSTREAM.md); no extra chart runtime was added.

## Submission preparation

The app and guides do not replace the required unlisted YouTube video. Record the two parts using the guide, keep the total below ten minutes, create the public anonymous-name repository, and open all submission URLs in an incognito browser. The assignment’s form URL was not supplied, so no submission form is completed automatically.

## Sources

- [Elexon WINDFOR](https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/WINDFOR/stream)
- [Elexon FUELHH](https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/FUELHH/stream)
- [Elexon API developer portal and data terms](https://developer.data.elexon.co.uk/)
- [Vercel Python runtime](https://vercel.com/docs/functions/runtimes/python)

Contains Elexon data. Source use and redistribution remain governed by the applicable BMRS Data Licence Terms linked from the Elexon developer portal. Application dependency licenses remain with their respective authors.
