import {
  lazy,
  Suspense,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
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
import type { Interval } from "../api";
import { clockLabel, dateLabel, number, publicationLabel } from "../format";
import { useDecisionQuery } from "../query";
import { DecisionExport, OutcomeRegion, OutcomeStack } from "./QueryControls";
import { Glossary, Hint, Icon, MetricCard, SignedError, Status } from "./ui";

const WindProfileRadar = lazy(() =>
  import("./StatisticalCharts").then((module) => ({
    default: module.WindProfileRadar,
  })),
);

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

const CHART_MARGIN = { top: 18, left: 0, right: 18, bottom: 12 };
const CHART_TICK = { fill: "var(--color-muted)", fontSize: 12 };
const HOUR_TICKS = ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00"];
const formatAxis = (value: number) => number(value);
const ForecastChart = memo(function ForecastChart({
  hourly,
  deliveryDate,
  revealed,
  onSelect,
  domain,
}: {
  hourly: Interval[];
  deliveryDate: string;
  revealed: boolean;
  onSelect: (row: Interval) => void;
  domain: [number, number];
}) {
  return (
    <div
      className="forecast-chart"
      role="group"
      aria-label={`Hourly wind forecast for ${dateLabel(deliveryDate)}. Tab to forecast points to inspect publication details. The audit table provides the same data.`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={hourly} margin={CHART_MARGIN} accessibilityLayer>
          <defs>
            <linearGradient id="forecast-area" x1="0" y1="0" x2="0" y2="1">
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
            ticks={HOUR_TICKS}
            axisLine={false}
            tickLine={false}
            tick={CHART_TICK}
            dy={8}
          />
          <YAxis
            domain={domain}
            includeHidden
            tickFormatter={formatAxis}
            width={65}
            axisLine={false}
            tickLine={false}
            tick={CHART_TICK}
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
            dot={<FocusPoint onSelect={onSelect} revealed={revealed} />}
            activeDot={{ r: 6, fill: "var(--color-primary)" }}
            connectNulls={false}
            isAnimationActive={false}
          />
          <Line
            hide={!revealed}
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
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
});

const AuditTable = memo(function AuditTable({
  shownRows,
  selected,
  day,
  cutoff,
  onSelect,
  deliveryDate,
}: {
  shownRows: Interval[];
  selected: Interval | null;
  day: string;
  cutoff: string;
  onSelect: (row: Interval) => void;
  deliveryDate: string;
}) {
  return (
    <div className="table-scroll">
      <table className="decision-audit-table">
        <colgroup>
          <col style={{ width: "13%" }} />
          <col style={{ width: "14%" }} />
          <col style={{ width: "26%" }} />
          <col style={{ width: "12%" }} />
          <col style={{ width: "14%" }} />
          <col style={{ width: "17%" }} />
          <col style={{ width: "4%" }} />
        </colgroup>
        <caption className="sr-only">
          Forecast audit for {dateLabel(deliveryDate)}. Errors equal forecast
          minus actual. Activate a row to inspect it.
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
            <th scope="col" className="numeric">
              Actual MW
            </th>
            <th scope="col" className="numeric">
              Error MW
            </th>
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
                selected?.start_time === row.start_time ? "selected-row" : ""
              }
              aria-label={`Inspect ${row.label} GMT forecast`}
              onClick={() => onSelect(row)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(row);
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
              <OutcomeRegion day={day} cutoff={cutoff}>
                {(revealed) => (
                  <>
                    <td className="numeric">
                      <OutcomeStack
                        revealed={revealed}
                        hidden="Hidden"
                        shown={number(row.actual_mw)}
                      />
                    </td>
                    <td className="numeric">
                      <OutcomeStack
                        revealed={revealed}
                        hidden="Hidden"
                        shown={<SignedError value={row.error_mw} />}
                      />
                    </td>
                  </>
                )}
              </OutcomeRegion>
              <td className="inspect-cell">
                <Icon icon={ChevronRight} size={18} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});

export default function DecisionView({
  day,
  cutoff,
  openAccuracy,
}: {
  day: string;
  cutoff: string;
  openAccuracy: () => void;
}) {
  const resource = useDecisionQuery(day, cutoff);
  const selectPoint = useCallback((row: Interval) => setSelected(row), []);
  const [allIntervals, setAllIntervals] = useState(false);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Interval | null>(null);
  useEffect(() => {
    setPage(0);
    setSelected(null);
  }, [day, cutoff, allIntervals]);
  const d = resource.data;
  const hourly = useMemo(
    () => d?.rows.filter((r) => r.label.endsWith(":00")) ?? [],
    [d],
  );
  const snapshots = useMemo(
    () =>
      hourly.filter((row) =>
        ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00"].includes(
          row.label,
        ),
      ),
    [hourly],
  );
  const table = allIntervals ? (d?.rows ?? hourly) : hourly;
  const shownRows = useMemo(
    () => table.slice(page * 8, page * 8 + 8),
    [table, page],
  );
  const domain = useMemo<[number, number]>(
    () => [
      0,
      Math.max(
        1000,
        Math.ceil(
          Math.max(
            0,
            ...hourly.flatMap((row) => [
              row.forecast_mw ?? 0,
              row.actual_mw ?? 0,
            ]),
          ) / 1000,
        ) * 1000,
      ),
    ],
    [hourly],
  );
  if (!d)
    return (
      <Status
        loading={resource.isPending}
        error={resource.error?.message ?? ""}
        retry={() => {
          void resource.refetch();
        }}
      />
    );
  const prior = d.prior_performance?.metrics;
  const complete = d.forecast_count === d.expected_native_points;
  return (
    <>
      <div className="kpi-grid">
        <MetricCard
          icon={Wind}
          label="Mean forecast wind"
          value={number(d.mean_forecast_mw)}
          unit="MW"
          caption="Available hourly forecast points"
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
                ? `All ${d.expected_native_points} delivery hours available`
                : `${d.forecast_count} of ${d.expected_native_points} delivery hours available`}
              <Hint
                label="Explain forecast coverage"
                text="WINDFOR points are hourly and FUELHH actuals are half-hourly. Only exact timestamps are matched; no :30 forecasts are generated."
              />
            </>
          }
        />
        <OutcomeRegion day={day} cutoff={cutoff}>
          {(revealed, setReveal) => (
            <>
              <MetricCard
                icon={Ruler}
                label={
                  <OutcomeStack
                    revealed={revealed}
                    shown="Realized typical error"
                    hidden="Typical error from earlier days"
                  />
                }
                term="MAE"
                termStyle="tooltip"
                value={
                  <OutcomeStack
                    revealed={revealed}
                    shown={number(d.metrics?.mae_mw)}
                    hidden={number(prior?.mae_mw)}
                  />
                }
                unit="MW"
                caption={
                  <OutcomeStack
                    revealed={revealed}
                    shown={`${d.metrics?.count ?? 0} matched timestamps · revealed`}
                    hidden={
                      prior?.count
                        ? `${number(prior.count)} earlier observations`
                        : "Insufficient earlier January history"
                    }
                  />
                }
              />
            </>
          )}
        </OutcomeRegion>
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
          <OutcomeRegion day={day} cutoff={cutoff}>
            {(revealed, setReveal) => (
              <>
                <div className="section-heading forecast-heading">
                  <div>
                    <h2 id="forecast-title">Next-day wind forecast</h2>
                    <p>
                      {dateLabel(d.delivery_date)} · publications available by{" "}
                      {cutoff} GMT on {dateLabel(day)}
                    </p>
                  </div>
                  <div className="forecast-actions">

                    <DecisionExport day={day} cutoff={cutoff} />
                  </div>
                </div>
                <div className="chart-tools">
                  <ul className="chart-legend" aria-label="Chart legend">
                    <li>
                      <span className="legend-stroke forecast-stroke" />
                      Selected forecast
                    </li>
                    <li
                      style={{ visibility: revealed ? "visible" : "hidden" }}
                      aria-hidden={!revealed}
                    >
                      <span className="legend-stroke actual-stroke" />
                      Actual wind
                    </li>
                  </ul>
                </div>
                <span className="axis-unit" aria-hidden="true">
                  MW
                </span>
                <ForecastChart
                  hourly={hourly}
                  deliveryDate={d.delivery_date}
                  revealed={revealed}
                  onSelect={selectPoint}
                  domain={domain}
                />
              </>
            )}
          </OutcomeRegion>
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
                <OutcomeRegion day={day} cutoff={cutoff}>
                  {(revealed, setReveal) => (
                    <>
                      <p
                        style={{ visibility: revealed ? "visible" : "hidden" }}
                        aria-hidden={!revealed}
                      >
                        Actual: {number(selected.actual_mw)} MW ·{" "}
                        <SignedError value={selected.error_mw} describe />
                      </p>
                    </>
                  )}
                </OutcomeRegion>
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
          <OutcomeRegion day={day} cutoff={cutoff}>
            {(revealed, setReveal) => (
              <>
                <p className="integrity-outcome">
                  <Icon icon={revealed ? Eye : EyeOff} size={18} />
                  <OutcomeStack
                    revealed={revealed}
                    shown="Actuals are revealed for retrospective review."
                    hidden="Actuals and selected-day errors are visually hidden."
                  />
                </p>
              </>
            )}
          </OutcomeRegion>
        </aside>
      </div>
      <OutcomeRegion day={day} cutoff={cutoff}>
        {(revealed, setReveal) => (
          <>
            <section className="panel context-panel">
              <div className="section-heading">
                <div>
                  <h2>
                    <OutcomeStack
                      revealed={revealed}
                      shown="Selected-day error context"
                      hidden="Error context from earlier January decisions"
                    />
                  </h2>
                  <p>
                    <OutcomeStack
                      revealed={revealed}
                      shown="Actual outcomes were not known at the buying cutoff."
                      hidden="Uses only earlier decisions and actual publications available by this cutoff."
                    />
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
                    <OutcomeStack
                      revealed={revealed}
                      shown={
                        <SignedError value={d.metrics?.bias_mw} describe />
                      }
                      hidden={<SignedError value={prior?.bias_mw} describe />}
                    />
                  </strong>
                </div>
                <div>
                  <span>
                    <Icon icon={Gauge} />
                    <Glossary term="P90" /> absolute error
                  </span>
                  <strong>
                    <OutcomeStack
                      revealed={revealed}
                      shown={`${number(d.metrics?.p90_absolute_error_mw)} MW`}
                      hidden={`${number(prior?.p90_absolute_error_mw)} MW`}
                    />
                  </strong>
                </div>
                <div>
                  <span>Wind overforecast</span>
                  <strong>
                    <OutcomeStack
                      revealed={revealed}
                      hidden="Hidden until revealed"
                      shown={`${number(d.metrics?.overforecast_pct, 1)}% of observations`}
                    />
                  </strong>
                </div>
              </div>
              <p className="caption">
                <OutcomeStack
                  revealed={revealed}
                  shown={`${d.metrics?.count ?? 0} matched observations · latest retrieved actual vintage.`}
                  hidden={
                    d.prior_performance
                      ? `Earlier decision dates: ${dateLabel(d.prior_performance.start)}–${dateLabel(d.prior_performance.end)}. ${number(prior?.count)} available observations.`
                      : "No earlier January observations are available. No error estimate is fabricated."
                  }
                />{" "}
                National wind error does not determine your portfolio’s order
                quantity.
              </p>
            </section>
          </>
        )}
      </OutcomeRegion>
      <section
        className="panel wind-profile-panel"
        aria-labelledby="wind-profile-title"
      >
        <div className="section-heading">
          <div>
            <h2 id="wind-profile-title">Wind profile · four-hour snapshots</h2>
            <p>Compare six native delivery timestamps on the same MW scale.</p>
          </div>
        </div>
        <OutcomeRegion day={day} cutoff={cutoff}>
          {(revealed, setReveal) => (
            <>
              <div className="wind-profile-layout">
                <Suspense
                  fallback={
                    <div className="wind-profile-radar" aria-hidden="true" />
                  }
                >
                  <WindProfileRadar
                    rows={snapshots}
                    domain={domain}
                    revealed={revealed}
                  />
                </Suspense>
                <div className="wind-profile-context">
                  <ul className="chart-legend" aria-label="Wind profile legend">
                    <li>
                      <span className="legend-stroke forecast-stroke" />
                      Selected forecast
                    </li>
                    <li
                      aria-hidden={!revealed}
                      style={{ visibility: revealed ? "visible" : "hidden" }}
                    >
                      <span className="legend-stroke actual-stroke" />
                      Actual wind
                    </li>
                  </ul>
                  <p>
                    Each spoke is a delivery time: 00:00, 04:00, 08:00, 12:00,
                    16:00 and 20:00 GMT. Points use the same cutoff-selected
                    forecasts as the timeline above.
                  </p>
                  <p className="caption">
                    The polygon connects these six snapshots for comparison; it
                    does not represent intermediate values, full-day energy or
                    an accuracy score.
                  </p>

                  <a href="#forecast-audit">
                    Read all values in the audit trail
                  </a>
                </div>
              </div>
            </>
          )}
        </OutcomeRegion>
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
        <AuditTable
          shownRows={shownRows}
          selected={selected}
          day={day}
          cutoff={cutoff}
          onSelect={selectPoint}
          deliveryDate={d.delivery_date}
        />
        {selected && (
          <div className="audit-selection" role="status">
            <strong>{selected.label} GMT</strong>
            <span>
              Forecast {number(selected.forecast_mw)} MW · published{" "}
              {publicationLabel(selected.publish_time)} · lead time{" "}
              {number(selected.lead_time_hours, 1)} h
            </span>
            <OutcomeRegion day={day} cutoff={cutoff}>
              {(revealed, setReveal) => (
                <>
                  <span
                    style={{ visibility: revealed ? "visible" : "hidden" }}
                    aria-hidden={!revealed}
                  >
                    <SignedError value={selected.error_mw} describe />
                  </span>
                </>
              )}
            </OutcomeRegion>
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
