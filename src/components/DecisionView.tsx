import { useEffect, useState } from "react";
import {
  ArrowUpToLine,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  EyeOff,
  Gauge,
  Info,
  ListChecks,
  ListFilter,
  Ruler,
  Scale,
  ShieldCheck,
  Wind,
  X,
} from "lucide-react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Decision, Interval } from "../api";
import { clockLabel, dateLabel, number, publicationLabel } from "../format";
import { useResource } from "../hooks";
import {
  Glossary,
  Hint,
  Icon,
  KeyFinding,
  MetricCard,
  SignedError,
  Status,
} from "./ui";

function ForecastTooltip({ active, payload, revealed }: any) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload as Interval;
  return (
    <div className="chart-tooltip">
      <strong>{row.label} GMT</strong>
      <dl>
        <div>
          <dt>Forecast</dt>
          <dd>{number(row.forecast_mw)} MW</dd>
        </div>
        <div>
          <dt>Published</dt>
          <dd>{publicationLabel(row.publish_time)}</dd>
        </div>
        {revealed && (
          <>
            <div>
              <dt>Actual</dt>
              <dd>{number(row.actual_mw)} MW</dd>
            </div>
            <div>
              <dt>Error</dt>
              <dd>
                <SignedError value={row.error_mw} />
              </dd>
            </div>
          </>
        )}
      </dl>
      {!revealed && <p>Actual outcome hidden</p>}
    </div>
  );
}

function FocusPoint({ cx, cy, payload, onSelect, revealed }: any) {
  if (cx == null || cy == null || payload.forecast_mw == null) return <g />;
  const row = payload as Interval;
  return (
    <g
      role="button"
      tabIndex={0}
      className="chart-point"
      aria-label={`${row.label} GMT. Forecast ${number(row.forecast_mw)} MW. Published ${publicationLabel(row.publish_time)}${revealed ? `. Actual ${number(row.actual_mw)} MW. Error ${number(row.error_mw)} MW` : ". Actual outcome hidden"}`}
      onFocus={() => onSelect(row)}
      onClick={() => onSelect(row)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(row);
        }
      }}
    >
      <circle cx={cx} cy={cy} r={20} fill="transparent" />
      <circle className="point-focus-ring" cx={cx} cy={cy} r={9} />
      <circle
        cx={cx}
        cy={cy}
        r={4}
        fill="var(--color-primary)"
        stroke="var(--color-surface)"
        strokeWidth={1.5}
      />
    </g>
  );
}

export default function DecisionView({
  day,
  cutoff,
  reveal,
  setReveal,
  openAccuracy,
}: {
  day: string;
  cutoff: string;
  reveal: boolean;
  setReveal: (value: boolean) => void;
  openAccuracy: () => void;
}) {
  const resource = useResource<Decision>(
    `/api/decision?decision_date=${day}&cutoff=${cutoff}&reveal=${reveal}`,
  );
  const [allIntervals, setAllIntervals] = useState(false);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Interval | null>(null);
  useEffect(() => {
    setPage(0);
    setSelected(null);
  }, [day, cutoff, reveal, allIntervals]);
  const d = resource.data;
  if (!d) return <Status {...resource} />;
  const prior = d.prior_performance?.metrics;
  const hourly = d.rows.filter((r) => r.label.endsWith(":00"));
  const table = allIntervals ? d.rows : hourly;
  const shownRows = table.slice(page * 8, page * 8 + 8);
  const complete = d.forecast_count === d.expected_native_points;
  const revealed = d.outcome_revealed;
  return (
    <>
      <KeyFinding>
        Mean forecast wind is <strong>{number(d.mean_forecast_mw)} MW</strong>,
        peaking at <strong>{number(d.peak_forecast_mw)} MW</strong>.
        {prior?.count ? (
          <>
            {" "}
            Typical error from earlier January decisions:{" "}
            <strong>{number(prior.mae_mw)} MW</strong> across{" "}
            {number(prior.count)} observations available by the cutoff.
          </>
        ) : (
          <>
            {" "}
            No earlier January observations were available to quantify prior
            error.
          </>
        )}
      </KeyFinding>
      <div className="kpi-grid">
        <MetricCard
          icon={Wind}
          label="Mean forecast wind"
          value={number(d.mean_forecast_mw)}
          unit="MW"
          caption="Mean of available hourly forecast points"
        />
        <MetricCard
          icon={ArrowUpToLine}
          label="Peak forecast wind"
          value={number(d.peak_forecast_mw)}
          unit="MW"
          caption="Highest next-day forecast point"
        />
        <MetricCard
          icon={ListChecks}
          label="Forecast coverage"
          value={
            <>
              {d.forecast_count}
              <span className="value-word">hourly forecasts</span>
            </>
          }
          caption={
            <>
              {complete
                ? `Covers all ${d.expected_native_points} delivery hours`
                : `${d.forecast_count} of ${d.expected_native_points} delivery hours available`}
              <Hint
                label="Explain forecast coverage"
                text="WINDFOR points are hourly and FUELHH actuals are half-hourly. Only exact timestamps are matched; no :30 forecasts are generated."
              />
            </>
          }
        />
        <MetricCard
          icon={Ruler}
          label={
            revealed
              ? "Realized typical error"
              : "Typical error from earlier days"
          }
          term="MAE"
          value={number(revealed ? d.metrics?.mae_mw : prior?.mae_mw)}
          unit="MW"
          caption={
            revealed
              ? `${d.metrics?.count ?? 0} matched timestamps · outcome revealed`
              : prior?.count
                ? `${number(prior.count)} observations available before this cutoff`
                : "Insufficient earlier January history"
          }
        />
      </div>
      {!complete && (
        <p className="notice warning" role="status">
          <Icon icon={Info} />
          {d.forecast_count} of 24 hourly points were available by the cutoff.
          Missing values remain unfilled.
        </p>
      )}
      {d.oldest_age_hours != null && d.oldest_age_hours > 6 && (
        <p className="notice warning">
          <Icon icon={Clock3} />
          Some selected publications are over six hours old. Check source times
          in the audit trail.
        </p>
      )}
      <div className="decision-layout">
        <section
          className="panel primary-panel forecast-panel"
          aria-labelledby="forecast-title"
        >
          <div className="section-heading">
            <div>
              <h2 id="forecast-title">Next-day wind forecast</h2>
              <p>
                {dateLabel(d.delivery_date)} · publications available by{" "}
                {cutoff} GMT on {dateLabel(day)}
              </p>
            </div>
          </div>
          <div className="chart-tools">
            <ul className="chart-legend" aria-label="Chart legend">
              <li>
                <span className="legend-stroke forecast-stroke" />
                Selected forecast
              </li>
              {revealed && (
                <li>
                  <span className="legend-stroke actual-stroke" />
                  Actual wind
                </li>
              )}
            </ul>
            <button
              className={`button outcome-button ${revealed ? "active-outcome" : "secondary"}`}
              type="button"
              aria-pressed={revealed}
              onClick={() => setReveal(!reveal)}
              title={
                revealed
                  ? "Hide actuals and selected-day error"
                  : "Reveal actuals and selected-day error"
              }
            >
              <Icon icon={revealed ? Eye : EyeOff} size={18} />
              {revealed ? "Hide actual outcome" : "Show actual outcome"}
            </button>
          </div>
          <span className="axis-unit" aria-hidden="true">
            MW
          </span>
          <div
            className="forecast-chart"
            role="group"
            aria-label={`Hourly wind forecast for ${dateLabel(d.delivery_date)}. Tab to forecast points to inspect publication details. The audit table provides the same data.`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={hourly}
                margin={{ top: 18, left: 0, right: 18, bottom: 12 }}
                accessibilityLayer
              >
                <defs>
                  <linearGradient
                    id="forecast-area"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="var(--color-primary)"
                      stopOpacity={0.13}
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--color-primary)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  stroke="var(--color-grid)"
                  vertical={false}
                  strokeDasharray="3 4"
                />
                <XAxis
                  dataKey="label"
                  ticks={["00:00", "04:00", "08:00", "12:00", "16:00", "20:00"]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "var(--color-muted)", fontSize: 12 }}
                  dy={8}
                />
                <YAxis
                  tickFormatter={(v) => number(v)}
                  width={65}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "var(--color-muted)", fontSize: 12 }}
                />
                <Tooltip
                  content={<ForecastTooltip revealed={revealed} />}
                  cursor={{
                    stroke: "var(--color-neutral)",
                    strokeDasharray: "4 4",
                  }}
                />
                <Area
                  dataKey="forecast_mw"
                  type="linear"
                  stroke="none"
                  fill="url(#forecast-area)"
                  connectNulls={false}
                  isAnimationActive={false}
                />
                <Line
                  dataKey="forecast_mw"
                  name="Selected forecast"
                  type="linear"
                  stroke="var(--color-primary)"
                  strokeWidth={3}
                  dot={
                    <FocusPoint onSelect={setSelected} revealed={revealed} />
                  }
                  activeDot={{ r: 6, fill: "var(--color-primary)" }}
                  connectNulls={false}
                  isAnimationActive={false}
                />
                {revealed && (
                  <Line
                    dataKey="actual_mw"
                    name="Actual wind"
                    type="linear"
                    stroke="var(--color-under)"
                    strokeWidth={2.5}
                    strokeDasharray="7 5"
                    dot={false}
                    activeDot={{ r: 6, fill: "var(--color-under)" }}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-caption">
            <span>Delivery time · GMT</span>
            <a href="#forecast-audit">
              View the data table <Icon icon={ChevronRight} size={18} />
            </a>
          </div>
          <p className="caption chart-note">
            Lines connect native hourly points for readability. Intermediate
            values are not generated or scored.
          </p>
          {selected && (
            <div className="point-detail" role="status">
              <div>
                <strong>
                  {selected.label} GMT · {number(selected.forecast_mw)} MW
                  forecast
                </strong>
                <p>
                  Published {publicationLabel(selected.publish_time)} · lead
                  time {number(selected.lead_time_hours, 1)} hours
                </p>
                {revealed && (
                  <p>
                    Actual: {number(selected.actual_mw)} MW ·{" "}
                    <SignedError value={selected.error_mw} describe />
                  </p>
                )}
              </div>
              <button
                className="icon-button"
                onClick={() => setSelected(null)}
                aria-label="Close point details"
                title="Close point details"
              >
                <Icon icon={X} />
              </button>
            </div>
          )}
        </section>
        <aside
          className="panel integrity-panel"
          aria-labelledby="integrity-title"
        >
          <div className="section-icon">
            <Icon icon={ShieldCheck} />
          </div>
          <h2 id="integrity-title">Decision-time integrity</h2>
          <p>
            Only forecasts published by{" "}
            <strong>
              {cutoff} GMT on {dateLabel(day)}
            </strong>{" "}
            are eligible.
          </p>
          <dl className="provenance-list">
            <div>
              <dt>
                Selected publication{d.publish_times.length === 1 ? "" : "s"}
              </dt>
              <dd>
                {d.publish_times.length === 1
                  ? publicationLabel(d.publish_times[0])
                  : `${d.publish_times.length} source publication times; inspect each row below`}
              </dd>
            </div>
            <div>
              <dt>
                <Icon icon={ListFilter} size={18} />
                Selection rule
              </dt>
              <dd>
                <code>latest publishTime ≤ cutoff</code>
              </dd>
            </div>
            <div>
              <dt>Source</dt>
              <dd>Elexon WINDFOR · Great Britain wind</dd>
            </div>
          </dl>
          <p className="integrity-outcome">
            <Icon icon={revealed ? Eye : EyeOff} size={18} />
            {revealed
              ? "Actuals are revealed for retrospective review."
              : "Actuals and selected-day errors are hidden."}
          </p>
        </aside>
      </div>
      <section className="panel context-panel">
        <div className="section-heading">
          <div>
            <h2>
              {revealed
                ? "Selected-day error context"
                : "Error context from earlier January decisions"}
            </h2>
            <p>
              {revealed
                ? "Actual outcomes were not known at the buying cutoff."
                : "Uses only earlier decisions and actual publications available by this cutoff."}
            </p>
          </div>
          <button className="button secondary" onClick={openAccuracy}>
            Explore accuracy
            <Icon icon={ChevronRight} size={18} />
          </button>
        </div>
        <div className="context-stats">
          <div>
            <span>
              <Icon icon={Scale} size={20} />
              <Glossary term="Bias" />
            </span>
            <strong>
              <SignedError
                value={revealed ? d.metrics?.bias_mw : prior?.bias_mw}
                describe
              />
            </strong>
          </div>
          <div>
            <span>
              <Icon icon={Gauge} />
              <Glossary term="P90" /> absolute error
            </span>
            <strong>
              {number(
                revealed
                  ? d.metrics?.p90_absolute_error_mw
                  : prior?.p90_absolute_error_mw,
              )}{" "}
              MW
            </strong>
          </div>
          {revealed && (
            <div>
              <span>Wind overforecast</span>
              <strong>
                {number(d.metrics?.overforecast_pct, 1)}% of observations
              </strong>
            </div>
          )}
        </div>
        <p className="caption">
          {revealed
            ? `${d.metrics?.count ?? 0} matched observations · latest retrieved actual vintage.`
            : d.prior_performance
              ? `Earlier decision dates: ${dateLabel(d.prior_performance.start)}–${dateLabel(d.prior_performance.end)}. ${number(prior?.count)} available observations.`
              : "No earlier January observations are available. No error estimate is fabricated."}{" "}
          National wind error does not determine your portfolio’s order
          quantity.
        </p>
      </section>
      <section className="panel audit-panel" id="forecast-audit">
        <div className="section-heading">
          <div>
            <h2>Forecast audit trail</h2>
            <p>
              Inspect source publication and lead time for each delivery
              timestamp.
            </p>
          </div>
          <Hint
            label="Explain hourly and half-hourly data"
            text="Forecasts are hourly; actuals are half-hourly. The all-half-hours view preserves :30 actuals without inventing forecasts. Missing source values are shown as a dash."
          />
        </div>
        <div
          className="segmented-control"
          role="group"
          aria-label="Audit table timestamp resolution"
        >
          <button
            aria-pressed={!allIntervals}
            onClick={() => setAllIntervals(false)}
          >
            Hourly forecasts only (24)
          </button>
          <button
            aria-pressed={allIntervals}
            onClick={() => setAllIntervals(true)}
          >
            All half-hours (48)
          </button>
        </div>
        <div className="table-scroll">
          <table>
            <caption className="sr-only">
              Forecast audit for {dateLabel(d.delivery_date)}. Errors equal
              forecast minus actual. Activate a row to inspect it.
            </caption>
            <thead>
              <tr>
                <th scope="col">Delivery · GMT</th>
                <th scope="col" className="numeric">
                  Forecast MW
                </th>
                <th scope="col">Published · UK time</th>
                <th scope="col" className="numeric">
                  Lead time
                </th>
                {revealed && (
                  <>
                    <th scope="col" className="numeric">
                      Actual MW
                    </th>
                    <th scope="col" className="numeric">
                      Error MW
                    </th>
                  </>
                )}
                <th scope="col">
                  <span className="sr-only">Inspect</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {shownRows.map((row) => (
                <tr
                  key={row.start_time}
                  tabIndex={0}
                  className={
                    selected?.start_time === row.start_time
                      ? "selected-row"
                      : ""
                  }
                  aria-label={`Inspect ${row.label} GMT forecast`}
                  onClick={() => setSelected(row)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelected(row);
                    }
                  }}
                >
                  <th scope="row">{row.label}</th>
                  <td className="numeric">
                    {number(row.forecast_mw)}
                    {row.forecast_mw == null && (
                      <span className="sr-only">No source forecast</span>
                    )}
                  </td>
                  <td>{publicationLabel(row.publish_time)}</td>
                  <td className="numeric">
                    {row.lead_time_hours == null
                      ? "—"
                      : `${number(row.lead_time_hours, 1)} h`}
                  </td>
                  {revealed && (
                    <>
                      <td className="numeric">{number(row.actual_mw)}</td>
                      <td className="numeric">
                        <SignedError value={row.error_mw} />
                      </td>
                    </>
                  )}
                  <td className="inspect-cell">
                    <Icon icon={ChevronRight} size={18} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {selected && (
          <div className="audit-selection" role="status">
            <strong>{selected.label} GMT</strong>
            <span>
              Forecast {number(selected.forecast_mw)} MW · published{" "}
              {publicationLabel(selected.publish_time)} · lead time{" "}
              {number(selected.lead_time_hours, 1)} h
            </span>
            {revealed && <SignedError value={selected.error_mw} describe />}
          </div>
        )}
        <div className="table-footer">
          <span>
            {page * 8 + 1}–{Math.min(page * 8 + 8, table.length)} of{" "}
            {table.length} timestamps · error = forecast − actual
          </span>
          <div>
            <button
              className="icon-button"
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
              aria-label="Previous audit table page"
              title="Previous eight timestamps"
            >
              <Icon icon={ChevronLeft} />
            </button>
            <button
              className="icon-button"
              disabled={(page + 1) * 8 >= table.length}
              onClick={() => setPage(page + 1)}
              aria-label="Next audit table page"
              title="Next eight timestamps"
            >
              <Icon icon={ChevronRight} />
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
