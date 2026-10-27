# Architecture and technical review

## Scope and design choice

Aer is a modular single-service pilot with a React client, a Python FastAPI API, and an immutable SQLite snapshot. It is designed for the assignment’s fixed January dataset and a sixteen-hour implementation budget. Elexon supplies the forecasts; the product selects the decision-relevant version and evaluates it. No prediction model, trade execution, client portfolio, or live ingestion service is included.

```text
Elexon WINDFOR + FUELHH WIND
             |
    scripts/ingest.py (operator/build time)
             |
    archived JSON.gz + checksums
             |
    immutable indexed SQLite + manifest
             |
    Python analysis rules + FastAPI
             |
    same-origin JSON / CSV
             |
    React + TypeScript + Recharts
```

## Selection and matching contract

For decision date D and configurable UK cutoff C, target the calendar day D+1. Select each target’s latest forecast publication at or before C. Selection is independent per target, so partial publications do not silently erase previously available points. SQL window functions resolve versions deterministically by publication time; conflicting duplicates with identical keys are rejected during ingestion.

January decisions run from 1 January to 31 January inclusive. Delivery covers 2 January through 1 February. Store normalized UTC ISO timestamps for safe ordering; convert the user’s Europe/London decision time before querying. January has no daylight-saving transition; the application does not claim to evaluate other months.

WINDFOR in the downloaded snapshot is hourly, while FUELHH is half-hourly. Build a 48-point daily settlement grid, attach source values only at their exact startTime, and score rows with both a forecast and actual. The extra half-hour actuals remain available to inspect but do not inflate the forecast sample count. No forecast energy total is computed from this sparse grid.

There are two intentionally different actual-vintage policies:

1. Retrospective accuracy/revealed outcome: latest actual publication retrieved in the snapshot.
2. Prior decision-time error: earlier decisions only, with actual publications additionally restricted to the current replay cutoff.

PublishTime is a source availability proxy, not proof of client receipt. Different source coverage and averaging semantics can contribute to the score; measured differences should not be attributed entirely to weather prediction error.

## Modules

- `scripts/ingest.py`: bounded HTTPS requests to a fixed Elexon base URL, source caching, checksum verification, numeric/time validation, duplicate resolution, indexed SQLite creation, and atomic database replacement after completion.
- `backend/analysis.py`: timezone conversion, version selection, exact matching, metric definitions, and pooled summaries. Pure calculations are testable without network access.
- `backend/main.py`: strictly validated query parameters, immutable database access, bounded process caches, response headers, CSV generation, metadata, and production static serving.
- `src/api.ts`: typed response contracts and consistent HTTP failure handling.
- `src/App.tsx`: user-selected decision context, explicit outcome reveal, quantitative evaluation, methodology, and audit/export interactions.
- `src/styles.css`: spacing, colors, typography, accessibility focus states, reduced-motion behavior, and responsive layouts.

## Storage and reproducibility

The two tables preserve `(start_time, publish_time, generation)` with a compound primary key. A publication index supports eligibility queries. A manifest captures every request URL, retrieval timestamp, source response hash, dataset row counts, and database checksum. The API verifies the database checksum once per process. Raw responses are retained with the source package but excluded from deployed runtime bundles.

The ingestion script is idempotent with respect to cached source responses and rejects conflicting duplicate keys rather than choosing an arbitrary value. A failure leaves the prior database untouched. Restart/redeploy after a rebuild because the running process caches the immutable snapshot. Existing ingested data is not updated through a public HTTP endpoint.

## Deployment paths

**Docker:** a Node build stage compiles React; a slim Python stage serves the frontend and API. The runtime uses an unprivileged user. Compose makes the filesystem read-only, drops capabilities, prevents privilege escalation, and binds port 8000 to localhost. It has a health check and no runtime data download.

**Vercel:** `@vercel/static-build` builds the frontend and `@vercel/python` packages the ASGI entrypoint. API routes dispatch to the Python function; static files serve from the same domain. Explicit includes package the database and manifest. Database writes are not required, avoiding serverless ephemeral-storage assumptions. Vercel is not running the Docker image; both use the same source logic.

## Security model

All served records are public Elexon data. There are no credentials, client accounts, file uploads, arbitrary outbound URL parameters, mutable business records, or trade actions. React escapes dynamic text; no raw HTML injection is used. Numeric/date-only CSV data avoids user-supplied spreadsheet formula injection. SQL is parameterized, query time/range inputs are validated, and there is no wildcard CORS.

Content Security Policy restricts scripts, fonts, images, and connections to the same origin. Inline styles remain permitted because chart positioning and dynamic dimensions require them. Other headers deny framing, disable MIME sniffing, restrict referrers, and disable unused camera/microphone/location permissions. Local Swagger is a development exception; OpenAPI JSON is available independently.

Errors return generic public messages; diagnostic tracebacks stay in server logs. Public HTTPS, edge request limits, and deployment controls belong to the hosting platform. This version does not claim enterprise authentication, a security audit, or production trading readiness. Before private data or execution is added, introduce identity, authorization, tenancy isolation, detailed auditing, rate controls, and a dedicated threat assessment.

## Performance choices

The entire fixed-month source snapshot is small, so SQLite indexes and standard-library arithmetic are sufficient. Avoiding pandas and ML libraries reduces runtime dependency size and startup overhead. Separate ingestion from serving, reuse bounded cached analysis, cache immutable successful API responses briefly, and load only the rows necessary for a decision or bounded month summary. The browser receives at most 48 rows per decision and 31 daily scores per summary. Self-hosted fonts avoid a third-party font dependency.

## Validation and future work

Tests cover math, missingness, publication cutoff boundaries, individual target selection, actual availability, exact timestamp matching, zero actual denominators, observation-weighted pooling, January end boundaries, outcome concealment, parameter rejection, exports, and security headers. Snapshot integration checks use real data without calling Elexon during tests. See `verification.md` for the actual execution record, including any environment limitations.

For a live extension, add scheduled ingestion, durable managed storage, freshness/coverage alarms, provenance-preserving revisions, observability, and a documented cutoff/latency policy. For forecast adjustment or uncertainty bands, add more history and chronological out-of-sample validation before making improvement or coverage claims. For a buyer-specific procurement planner, obtain demand, contracts, wind allocation, prices, and risk policy; these are excluded from this challenge.
