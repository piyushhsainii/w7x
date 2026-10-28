# How to explain Aer to the client and technical reviewer

This guide explains the pilot in ordinary language and provides a video outline of approximately nine minutes. The central promise is straightforward: show the wind forecast available at the buying decision, then measure how it performed without allowing later forecasts to rewrite history.

## Understand the product first

The utility needs electricity for its customers. Wind reduces the amount it might need from other sources, but wind output is uncertain. Elexon already supplies wind forecasts. Aer selects the relevant forecast publication and measures its errors; it does not train a weather model.

The assignment limits the dataset to national Elexon wind. We therefore cannot know the utility’s demand, contracted supply, wind allocation, or financial exposure. Say “this helps a buyer understand wind uncertainty,” not “this tells the client exactly how much to buy.”

The pilot is historical: January decision dates are replayed. A production version could use the same selection rules with ongoing ingestion, but this deployment is an immutable January snapshot. Avoid describing it as live today.

## Explain a decision with an example

Suppose it is 10 January at 09:30 UK time, and you are considering delivery on 11 January. A forecast published at 07:30 is eligible; one published at 11:30 is too late. For every target timestamp on 11 January, the API selects the most recent forecast with `publishTime <= 10 January 09:30`.

The decision desk displays the selected forecast, its mean and peak MW, its publication time, and coverage. The actual outcome is initially hidden. Selecting “Show actual outcome” adds actual wind and realized error, clearly marking the transition to hindsight.

The default cutoff is an example of an internal buying-decision time. It is configurable because the client’s auction and internal deadline need confirmation. Do not claim all UK day-ahead auctions close at 09:30.

## Explain quantitative accuracy

Use the definition `error = forecast - actual` throughout:

- Positive error: the forecast promised more wind than arrived. This could contribute to buying too little other electricity.
- Negative error: more wind arrived than forecast. This could contribute to buying too much other electricity.
- MAE: average size of the error, ignoring direction. It is the easiest headline to explain.
- RMSE: squares errors before averaging, so large misses matter more.
- Bias: average signed error. It shows tendency, but cancelling errors can hide poor performance.
- P90 absolute error: 90% of the observed absolute errors were at or below this magnitude. It is a historical threshold, not a guaranteed future range.
- WAPE: total absolute error divided by total matched actual generation, expressed as a percentage. It is not a probability of correctness.

For three forecast/actual pairs of 1,000/800, 1,200/1,300, and 800/900 MW, errors are +200, -100, and -100 MW. MAE is 133.3 MW, RMSE is 141.4 MW, and bias is 0 MW. This illustrates why zero bias does not establish accuracy.

For the included snapshot at the default 09:30 cutoff, decisions from 1–31 January produce:

| Measure | Observed value |
|---|---:|
| Matched observations | 744 |
| MAE | 1,995.569 MW |
| RMSE | 2,498.825 MW |
| Bias | +1,727.983 MW |
| WAPE | 17.683% |
| P90 absolute error | 4,183.9 MW |
| Overforecast observations | 84.274% |

These values are specific to the included source snapshot, cutoff, dates, and matching method. Re-run the accuracy endpoint after any data/method change before quoting them. Do not attribute the positive bias to a particular cause without further investigation: dataset coverage, forecast semantics, revisions, and forecasting error can all contribute.

## Explain the resolution decision confidently

The actual downloaded data reveals hourly WINDFOR timestamps and half-hourly FUELHH timestamps. We compare exact timestamps, giving 24 matched observations per day. We preserve all 48 actual timestamps in the audit table and report both native and settlement coverage.

This avoids manufacturing :30 forecasts by interpolation or repetition. It also limits the claim: the score compares source forecast points with half-hour outturn at the same startTime. It is not a complete half-hourly energy-error backtest or a statement that both products have identical averaging semantics. We do not calculate a daily forecast MWh total from these sparse points.

If a reviewer asks about hourly averaging or interpolation, explain that either could be added as an explicitly labelled alternative methodology, after confirming source semantics. It must not silently replace the required source-level evaluation.

## The video script

### Part one for the client from 0 to 4 minutes 30 seconds

**0:00–0:40 — Introduce the business problem**

“When you buy tomorrow’s electricity, wind is a source of uncertainty. This pilot makes two things clear: which forecast you could use before buying, and the size and direction of the errors that accompanied those forecasts.”

Show the January replay badge. Explain that this is the pilot period requested in the assignment, not today’s live operations.

**0:40–1:35 — Walk through the decision desk**

Choose 10 January at 09:30; filters apply automatically. Point out the 11 January delivery date. Show the forecast curve and the selected publication time. Explain that mean and peak values are national MW, not the client’s suggested order quantity.

**1:35–2:15 — Demonstrate publication integrity**

Inspect an hourly timestamp in the audit table. Change the cutoff to 09:00 and show that publication selection changes automatically. Return to 09:30. Say: “We only use publications available by the selected decision time; we never select a later update because it happens to look better.”

**2:15–3:00 — Reveal the outcome**

Click Show actual outcome. Point to the solid dark-green forecast and dashed teal actual curve. Explain the sign of the error. Show one audit row with forecast, actual, publication, and error. Mention that :30 rows do not receive invented forecasts.

**3:00–4:00 — Quantify the uncertainty**

Open Forecast accuracy for the full January decision range. Explain MAE first, then bias and RMSE. Identify a large-error day and click it to replay the decision. Describe overforecast share as a historical risk indicator, not a probability guarantee.

**4:00–4:30 — Close the client pitch**

“The benefit is a shared, auditable view of forecast uncertainty before you make procurement decisions. The next step would combine this with your demand and contracted supply. This pilot deliberately keeps to national wind data and the requested January period.”

### Part two for the technical lead from 4 minutes 30 seconds to 9 minutes 30 seconds

**4:30–5:15 — Explain the architecture**

Show `docs/architecture.md`. React consumes same-origin FastAPI endpoints. A separate ingestion script creates an immutable indexed SQLite database. Docker runs the complete app; Vercel serves static React assets and the same Python API as a function.

**5:15–6:15 — Trace one interval through the code**

Open `backend/analysis.py`, especially `select_day`. Explain the target range, `publish_time <= cutoff`, and `ROW_NUMBER` selection per startTime. Show that missing values remain null and exact timestamp matching avoids resampling assumptions.

**6:15–7:00 — Explain the metrics and hindsight control**

Open `metrics` and show the worked example test. Explain pooled metrics rather than averages of rounded daily scores. Explain that prior performance additionally filters actual publication time, while retrospective analysis intentionally uses the retrieved actual vintage.

**7:00–7:45 — Explain ingestion and reproducibility**

Show `scripts/ingest.py`, a source metadata file, and `data/manifest.json`. Explain bounded requests, retries, response hashes, duplicate handling, and replacing the snapshot only on success. Source publication and retrieval time are different fields.

**7:45–8:40 — Demonstrate engineering checks**

Show the actual test output and production build results recorded in `docs/verification.md`. Highlight cutoff-boundary tests, missing values, zero-denominator WAPE, January 31 delivery, and hidden-outcome API/export checks. Point out parameter validation, parameterized SQL, read-only storage, local fonts, and non-root Docker configuration.

**8:40–9:30 — Explain tradeoffs and handover**

Show README startup commands and the deployed app. State the limitations: fixed month, publication-time availability proxy, hourly-to-half-hour timestamp comparison, national scope, and no trading execution. Mention that live ingestion would require durable storage and operational monitoring. End with where the reviewer can find the code, guide, and validation evidence.

Leave approximately 30 seconds of margin. Rehearse with a timer; both parts must stay below five minutes and the total below ten minutes. Narration speed varies, so the outline is not a guarantee of video duration.

## Questions the reviewer may ask

**Why Python without machine learning?** Python implements the ingestion, publication-aware selection, validation, matching, and quantitative analysis. Elexon supplies the forecasts. An extra model would require a separate, chronological validation exercise and is not necessary to meet the stated requirement.

**Why SQLite instead of Postgres?** The January pilot is small and read-only. A packaged, indexed snapshot is reproducible and avoids a database service. Live updates, concurrent writers, or private portfolios would justify durable managed storage.

**Why no confidence band?** One month is short, errors are correlated, and early January lacks earlier January observations. A decorative band would overstate certainty. We show descriptive error percentiles and their sample sizes instead.

**How do you prevent hindsight?** Forecast publications must precede the decision cutoff. Prior-error calculations restrict actual publications as well. Outcome reveal is explicit. The full accuracy view is clearly labelled retrospective.

**Can this place a trade?** No. It provides wind information and measured forecast error. Trade sizing and execution need additional client data, controls, and authorization outside this assignment.

**Can we use it for today?** This delivery is a January replay. The architecture can be extended with scheduled ingestion, freshness monitoring, durable storage, and a client-specific decision policy. No live feed is claimed in the current UI.

## Before submission

Record your own presentation, upload it to YouTube as unlisted, and verify the link without signing in. Create an anonymous-name public GitHub repository from the project directory, excluding `.venv`, `.vercel`, `node_modules`, caches, and credentials. Verify the app, API, repository, and video in an incognito browser. Add the final app and video URLs to the README. Submit only after the video is available; the actual submission form URL was not supplied in this conversation.
