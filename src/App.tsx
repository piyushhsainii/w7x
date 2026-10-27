import { useEffect, useState, type ReactNode } from "react";
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Database,
  Eye,
  EyeOff,
  Fingerprint,
  Info,
  LayoutDashboard,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Wind,
  X,
} from "lucide-react";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  ComposedChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  getJson,
  type Accuracy,
  type Decision,
  type Interval,
  type Meta,
} from "./api";

type View = "decision" | "accuracy" | "method";
const integer = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });
const number = (value: number | null | undefined, digits = 0) =>
  value == null
    ? "—"
    : value.toLocaleString("en-GB", { maximumFractionDigits: digits });
const niceDate = (value: string, full = false) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    ...(full ? { year: "numeric" as const } : {}),
    timeZone: "Europe/London",
  }).format(new Date(`${value}T12:00:00Z`));
const niceTime = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/London",
        hour12: false,
      }).format(new Date(value))
    : "—";
const publication = (value: string | null) =>
  value
    ? `${niceDate(value.slice(0, 10))}, ${niceTime(value)}`
    : "Not available";
function shiftDate(day: string, delta: number) {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

function useResource<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setData(null);
    getJson<T>(url, controller.signal)
      .then(setData)
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [url, attempt]);
  return { data, error, loading, retry: () => setAttempt((n) => n + 1) };
}

function Status({
  loading,
  error,
  retry,
}: {
  loading: boolean;
  error: string;
  retry: () => void;
}) {
  if (error)
    return (
      <div className="state panel" role="alert">
        <Info size={28} />
        <h2>We couldn’t load this view</h2>
        <p>{error}</p>
        <button className="button" onClick={retry}>
          <RefreshCw size={16} />
          Try again
        </button>
      </div>
    );
  if (loading)
    return (
      <div className="state panel" role="status">
        <LoaderCircle className="spin" size={28} />
        <h2>Finding your decision-time view</h2>
        <p>Matching forecast publications to the selected cutoff.</p>
      </div>
    );
  return null;
}
function Metric({
  icon,
  label,
  value,
  unit,
  caption,
  tint = "",
}: {
  icon: ReactNode;
  label: string;
  value: string;
  unit?: string;
  caption: string;
  tint?: string;
}) {
  return (
    <article className={`metric panel ${tint}`}>
      <div className="metric-head">
        <span>{label}</span>
        <span className="icon-well">{icon}</span>
      </div>
      <div className="metric-number">
        {value}
        <span>{unit}</span>
      </div>
      <p>{caption}</p>
    </article>
  );
}
function Tip({ children }: { children: ReactNode }) {
  return (
    <div className="tip">
      <Info size={16} />
      <p>{children}</p>
    </div>
  );
}

function WindArtwork() {
  return (
    <div className="wind-art" aria-hidden="true">
      <svg viewBox="0 0 280 160" fill="none">
        <ellipse
          cx="147"
          cy="146"
          rx="112"
          ry="8"
          fill="#cdd4cf"
          opacity=".4"
        />
        <path
          d="M20 112C68 87 97 122 151 107S222 87 275 103M8 128C69 105 119 135 174 122S242 113 280 122"
          stroke="#d0d7d1"
          strokeWidth="1.5"
        />
        <path
          d="M145 74l-5 70h14l-5-70"
          fill="#eef0eb"
          stroke="#6c7e72"
          strokeWidth="1.5"
        />
        <circle
          cx="147"
          cy="69"
          r="6"
          fill="#e8eee6"
          stroke="#5e7567"
          strokeWidth="1.5"
        />
        <path
          d="M147 63c-3-16-5-40 0-52 6 10 9 34 4 52M142 72c-12 11-32 25-45 27 4-11 23-29 42-32M152 72c16 3 39 14 46 25-12 1-36-9-48-19"
          fill="#edf1e9"
          stroke="#6c7e72"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M224 62v80M224 62l-4-30M224 62l-25 15M224 62l26 17"
          stroke="#b2bdb4"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="224" cy="62" r="3" fill="#b2bdb4" />
        <path
          d="M42 52h40m-21-9h27m-52 18h20"
          stroke="#cad3c9"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

function DecisionView({
  day,
  cutoff,
  reveal,
  setReveal,
  inspectDay,
}: {
  day: string;
  cutoff: string;
  reveal: boolean;
  setReveal: (x: boolean) => void;
  inspectDay: () => void;
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
  const native = d.rows.filter((r) => r.label.endsWith(":00"));
  const table = allIntervals ? d.rows : native;
  const prior = d.prior_performance?.metrics;
  const missing = d.forecast_count < d.expected_native_points;
  return (
    <>
      <div className="metric-grid">
        <Metric
          icon={<Wind size={19} />}
          label="Mean forecast wind"
          value={number(d.mean_forecast_mw)}
          unit="MW"
          caption="Mean of available hourly forecast points"
          tint="sage"
        />
        <Metric
          icon={<ArrowUpRight size={19} />}
          label="Peak forecast wind"
          value={number(d.peak_forecast_mw)}
          unit="MW"
          caption="Highest available next-day forecast point"
        />
        <Metric
          icon={<CheckCheck size={19} />}
          label="Forecast coverage"
          value={`${d.forecast_count}/${d.expected_native_points}`}
          caption={`${number(d.settlement_coverage_pct)}% of 48 settlement timestamps`}
        />
        <Metric
          icon={<Activity size={19} />}
          label={reveal ? "Realized typical error" : "Prior typical error"}
          value={number(reveal ? d.metrics?.mae_mw : prior?.mae_mw)}
          unit="MW"
          caption={
            reveal
              ? `MAE · ${d.metrics?.count ?? 0} matched observations`
              : prior?.count
                ? `MAE · ${prior.count} observations available by cutoff`
                : "No earlier January observations available"
          }
          tint="lilac"
        />
      </div>
      {missing && (
        <div className="warning" role="status">
          <Info size={18} />
          Only {d.forecast_count} of 24 expected hourly points were available by
          this cutoff. Gaps remain unfilled.
        </div>
      )}
      {d.oldest_age_hours != null && d.oldest_age_hours > 6 && (
        <div className="warning">
          <Clock3 size={18} />
          Some selected publications are over 6 hours old. Review publication
          times before interpreting the curve.
        </div>
      )}
      <div className="desk-grid">
        <section className="panel chart-panel">
          <div className="section-top">
            <div>
              <span className="eyebrow">THE NEXT DELIVERY DAY</span>
              <h2>Wind, before you buy.</h2>
              <p>
                {niceDate(d.delivery_date, true)} · hourly matched timestamps ·
                UK time
              </p>
            </div>
            <span className="small-tag">
              <span className="dot" />
              Elexon WINDFOR
            </span>
          </div>
          <div className="chart-toolbar">
            <div className="legend">
              <span>
                <i className="legend-line forecast" />
                Selected forecast
              </span>
              {reveal && (
                <span>
                  <i className="legend-line actual" />
                  Actual wind
                </span>
              )}
            </div>
            <button
              className={`toggle ${reveal ? "is-on" : ""}`}
              aria-pressed={reveal}
              onClick={() => setReveal(!reveal)}
            >
              {reveal ? <Eye size={15} /> : <EyeOff size={15} />}
              {reveal ? "Hide outcome" : "Reveal outcome"}
            </button>
          </div>
          <div
            className="chart-wrap"
            role="img"
            aria-label={`Hourly wind forecast for ${d.delivery_date}. A detailed accessible data table follows.`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={native}
                margin={{ top: 20, right: 12, bottom: 4, left: 0 }}
                onClick={(state: any) => {
                  const row = native.find(
                    (r) => r.label === state?.activeLabel,
                  );
                  if (row) setSelected(row);
                }}
              >
                <defs>
                  <linearGradient id="windFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#93ab91" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="#93ab91" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  stroke="#d8ddd7"
                  strokeDasharray="3 5"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  ticks={["00:00", "04:00", "08:00", "12:00", "16:00", "20:00"]}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#59664f", fontSize: 11 }}
                  dy={10}
                />
                <YAxis
                  tickFormatter={(v) => `${number(v / 1000, 1)}k`}
                  width={49}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#59664f", fontSize: 11 }}
                />
                <Tooltip
                  content={<WindTooltip reveal={reveal} />}
                  cursor={{ stroke: "#bdc8bb", strokeDasharray: "4 4" }}
                />
                <Area
                  dataKey="forecast_mw"
                  type="linear"
                  fill="url(#windFill)"
                  stroke="none"
                  isAnimationActive={false}
                  connectNulls={false}
                />
                <Line
                  name="Selected forecast"
                  dataKey="forecast_mw"
                  type="linear"
                  stroke="#69856c"
                  strokeWidth={2.5}
                  dot={{ r: 2.5, fill: "#69856c", strokeWidth: 0 }}
                  activeDot={{ r: 6 }}
                  isAnimationActive={false}
                  connectNulls={false}
                />
                {reveal && (
                  <Line
                    name="Actual wind"
                    dataKey="actual_mw"
                    type="linear"
                    stroke="#9b90b3"
                    strokeWidth={2}
                    strokeDasharray="5 4"
                    dot={false}
                    isAnimationActive={false}
                    connectNulls={false}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-foot">
            <span>Generation · MW</span>
            <span>
              Click a point to inspect its publication{" "}
              <ArrowUpRight size={13} />
            </span>
          </div>
          <Tip>
            Lines connect observed hourly points for readability. No
            intermediate values are generated or scored; :30 actuals are
            available in the table.
          </Tip>
        </section>
        <aside className="panel insight-panel">
          <div className="icon-well large">
            <ShieldCheck size={21} />
          </div>
          <span className="eyebrow">DECISION INTEGRITY</span>
          <h2>
            Only what you
            <br />
            could know.
          </h2>
          <p>
            Every point uses the latest publication available by{" "}
            <strong>
              {cutoff} on {niceDate(day)}
            </strong>
            .
          </p>
          <div className="insight-row">
            <Clock3 size={17} />
            <span>
              Selected publication{d.publish_times.length !== 1 ? "s" : ""}
              <strong>
                {d.publish_times.length === 1
                  ? publication(d.publish_times[0])
                  : `${d.publish_times.length} different publication times`}
              </strong>
            </span>
          </div>
          <div className="insight-row">
            <Database size={17} />
            <span>
              Data source<strong>Elexon · Great Britain wind</strong>
            </span>
          </div>
          <div className="insight-row">
            <Fingerprint size={17} />
            <span>
              Selection method<strong>Latest publishTime ≤ cutoff</strong>
            </span>
          </div>
          <div className="insight-bottom">
            <Sparkles size={16} />
            <p>
              {reveal
                ? "Outcome revealed for review. It was not known at the decision cutoff."
                : "Actual outcomes stay hidden until you choose to reveal them."}
            </p>
          </div>
        </aside>
      </div>
      <div className="lower-grid">
        <section className="panel compact-panel">
          <div className="section-top">
            <div>
              <span className="eyebrow">PUT THE ERROR IN CONTEXT</span>
              <h2>
                {reveal
                  ? "What actually happened?"
                  : "What did earlier decisions teach us?"}
              </h2>
            </div>
            <span className="icon-well">
              <BarChart3 size={19} />
            </span>
          </div>
          <p className="body-copy">
            {reveal
              ? "Positive forecast error means less wind arrived than forecast, creating potential underprocurement exposure."
              : "Earlier errors quantify uncertainty. They do not guarantee tomorrow’s outcome or determine your purchase quantity."}
          </p>
          <div className="mini-stats">
            <div>
              <span>
                {reveal
                  ? "Overforecast observations"
                  : "Prior overforecast share"}
              </span>
              <strong>
                {number(
                  reveal
                    ? d.metrics?.overforecast_pct
                    : prior?.overforecast_pct,
                  1,
                )}
                <small>%</small>
              </strong>
            </div>
            <div>
              <span>90th percentile absolute error</span>
              <strong>
                {number(
                  reveal
                    ? d.metrics?.p90_absolute_error_mw
                    : prior?.p90_absolute_error_mw,
                )}
                <small>MW</small>
              </strong>
            </div>
          </div>
          <p className="fine-print">
            {reveal
              ? `${d.metrics?.count ?? 0} matched timestamps · latest retrieved actual vintage.`
              : d.prior_performance
                ? `Earlier decisions: ${niceDate(d.prior_performance.start)}–${niceDate(d.prior_performance.end)}; actual publications restricted to this cutoff. ${prior?.count ?? 0} observations.`
                : "Insufficient earlier January history. No risk estimate is fabricated."}
          </p>
          <button className="text-button" onClick={inspectDay}>
            Explore forecast accuracy <ArrowRight size={15} />
          </button>
        </section>
        <section className="panel compact-panel horizon-card">
          <span className="eyebrow">A CLEARER VIEW, WITH LIMITS</span>
          <h2>
            Wind intelligence.
            <br />
            Human decisions.
          </h2>
          <p>
            Use the forecast and its measured error alongside your own demand
            and contracted supply.
          </p>
          <WindArtwork />
          <span className="fine-print">
            National wind data · no order execution
          </span>
        </section>
      </div>
      <section className="panel table-panel">
        <div className="section-top">
          <div>
            <span className="eyebrow">FOLLOW EVERY NUMBER TO ITS SOURCE</span>
            <h2>Forecast audit trail</h2>
          </div>
          <label className="check-label">
            <input
              type="checkbox"
              checked={allIntervals}
              onChange={(e) => setAllIntervals(e.target.checked)}
            />{" "}
            All 48 settlement timestamps
          </label>
        </div>
        {selected && (
          <div className="selected-interval">
            <Info size={17} />
            <span>
              <strong>{selected.label} UK</strong> · forecast{" "}
              {number(selected.forecast_mw)} MW · published{" "}
              {publication(selected.publish_time)} · lead time{" "}
              {number(selected.lead_time_hours, 1)} h
              {reveal &&
                ` · actual ${number(selected.actual_mw)} MW · error ${number(selected.error_mw)} MW`}
            </span>
            <button
              className="icon-button"
              aria-label="Close interval detail"
              onClick={() => setSelected(null)}
            >
              <X size={16} />
            </button>
          </div>
        )}
        <div className="table-scroll">
          <table>
            <caption className="sr-only">
              Selected forecasts and publication times. Actuals appear only when
              revealed.
            </caption>
            <thead>
              <tr>
                <th scope="col">Delivery · UK time</th>
                <th scope="col">Forecast MW</th>
                <th scope="col">Published · UK time</th>
                <th scope="col">Age at cutoff</th>
                {reveal && (
                  <>
                    <th scope="col">Actual MW</th>
                    <th scope="col">Error MW</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {table.slice(page * 8, page * 8 + 8).map((r) => (
                <tr
                  key={r.start_time}
                  className={
                    selected?.start_time === r.start_time ? "selected" : ""
                  }
                >
                  <td>
                    <button
                      className="table-link"
                      onClick={() => setSelected(r)}
                    >
                      {r.label}
                      <ArrowUpRight size={12} />
                    </button>
                  </td>
                  <td>
                    {number(r.forecast_mw)}
                    {r.forecast_mw == null && (
                      <span className="cell-note">No source forecast</span>
                    )}
                  </td>
                  <td>{publication(r.publish_time)}</td>
                  <td>
                    {r.forecast_age_hours == null
                      ? "—"
                      : `${number(r.forecast_age_hours, 1)} h`}
                  </td>
                  {reveal && (
                    <>
                      <td>{number(r.actual_mw)}</td>
                      <td
                        className={
                          r.error_mw != null && r.error_mw > 0
                            ? "error-positive"
                            : ""
                        }
                      >
                        {r.error_mw != null && r.error_mw > 0 ? "+" : ""}
                        {number(r.error_mw)}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="table-footer">
          <span>
            {page * 8 + 1}–{Math.min(page * 8 + 8, table.length)} of{" "}
            {table.length} timestamps · error = forecast − actual
          </span>
          <div>
            <button
              className="icon-button"
              aria-label="Previous table page"
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft size={17} />
            </button>
            <button
              className="icon-button"
              aria-label="Next table page"
              disabled={(page + 1) * 8 >= table.length}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight size={17} />
            </button>
          </div>
        </div>
      </section>
    </>
  );
}

function WindTooltip({ active, payload, reveal }: any) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload as Interval;
  return (
    <div className="chart-tooltip">
      <strong>{row.label} UK time</strong>
      <span>
        Forecast <b>{number(row.forecast_mw)} MW</b>
      </span>
      {reveal && (
        <>
          <span>
            Actual <b>{number(row.actual_mw)} MW</b>
          </span>
          <span>
            Error <b>{number(row.error_mw)} MW</b>
          </span>
        </>
      )}
      <small>Published {publication(row.publish_time)}</small>
    </div>
  );
}

function AccuracyView({
  cutoff,
  start,
  end,
  inspect,
}: {
  cutoff: string;
  start: string;
  end: string;
  inspect: (day: string) => void;
}) {
  const resource = useResource<Accuracy>(
    `/api/accuracy?start=${start}&end=${end}&cutoff=${cutoff}`,
  );
  const a = resource.data;
  if (!a) return <Status {...resource} />;
  const m = a.metrics;
  const chartDays = a.days.map((d) => ({
    ...d,
    label: d.decision_date.slice(-2),
  }));
  return (
    <>
      <div className="metric-grid">
        <Metric
          icon={<Activity size={19} />}
          label="Typical error · MAE"
          value={number(m.mae_mw)}
          unit="MW"
          caption="Mean absolute forecast error"
          tint="sage"
        />
        <Metric
          icon={<BarChart3 size={19} />}
          label="Large-error sensitivity · RMSE"
          value={number(m.rmse_mw)}
          unit="MW"
          caption="Root mean squared error"
        />
        <Metric
          icon={<ArrowUpRight size={19} />}
          label="Directional bias"
          value={`${m.bias_mw != null && m.bias_mw > 0 ? "+" : ""}${number(m.bias_mw)}`}
          unit="MW"
          caption={
            m.bias_mw == null
              ? "No paired observations"
              : m.bias_mw > 0
                ? "Wind was overforecast on average"
                : m.bias_mw < 0
                  ? "Wind was underforecast on average"
                  : "Positive and negative errors balance"
          }
        />
        <Metric
          icon={<ShieldCheck size={19} />}
          label="90th percentile error"
          value={number(m.p90_absolute_error_mw)}
          unit="MW"
          caption="90% of absolute errors were at or below this"
          tint="lilac"
        />
      </div>
      <section className="panel chart-panel">
        <div className="section-top">
          <div>
            <span className="eyebrow">HISTORICAL PERFORMANCE</span>
            <h2>Every buying day tells a story.</h2>
            <p>
              Daily MAE · decisions {niceDate(start)}–{niceDate(end, true)} ·{" "}
              {cutoff} UK cutoff
            </p>
          </div>
          <span className="small-tag">{m.count} matched observations</span>
        </div>
        <div
          className="chart-wrap accuracy-chart"
          role="img"
          aria-label="Daily mean absolute error chart. Use the daily breakdown table to open any day."
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartDays}
              margin={{ top: 20, left: 0, right: 8, bottom: 4 }}
              onClick={(s: any) => {
                const d = chartDays.find((d) => d.label === s?.activeLabel);
                if (d) inspect(d.decision_date);
              }}
            >
              <CartesianGrid
                stroke="#d8ddd7"
                vertical={false}
                strokeDasharray="3 5"
              />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#59664f", fontSize: 11 }}
                dy={8}
              />
              <YAxis
                width={50}
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#59664f", fontSize: 11 }}
                tickFormatter={(v) => integer.format(v)}
              />
              <Tooltip
                cursor={{ fill: "#d7ddd3", opacity: 0.5 }}
                formatter={(v: any) => [
                  `${number(Number(v))} MW`,
                  "Mean absolute error",
                ]}
                labelFormatter={(v: any) => `Decision day ${v} Jan 2026`}
                contentStyle={{
                  borderRadius: 16,
                  border: "1px solid #f8faf6",
                  background: "#edf0ea",
                  fontSize: 12,
                }}
              />
              {m.mae_mw != null && (
                <ReferenceLine
                  y={m.mae_mw}
                  stroke="#9b90b3"
                  strokeDasharray="5 4"
                />
              )}
              <Bar
                dataKey="mae_mw"
                fill="#9aaf96"
                radius={[5, 5, 0, 0]}
                maxBarSize={28}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="chart-foot">
          <span>Daily MAE · MW · dashed line = pooled MAE</span>
          <span>
            Click a bar to replay that decision <ArrowUpRight size={13} />
          </span>
        </div>
      </section>
      <div className="lower-grid">
        <section className="panel compact-panel">
          <span className="eyebrow">THE DIRECTION MATTERS</span>
          <h2>When less wind arrives.</h2>
          <p className="body-copy">
            Overforecast wind creates potential underprocurement exposure. These
            are national forecast errors, not your portfolio’s imbalance.
          </p>
          <div className="mini-stats">
            <div>
              <span>Overforecast observations</span>
              <strong>
                {number(m.overforecast_pct, 1)}
                <small>%</small>
              </strong>
            </div>
            <div>
              <span>Mean error when overforecast</span>
              <strong>
                {number(m.mean_overforecast_mw)}
                <small>MW</small>
              </strong>
            </div>
          </div>
          <div className="risk-track">
            <div style={{ width: `${m.overforecast_pct ?? 0}%` }} />
          </div>
          <p className="fine-print">
            Positive error = forecast exceeds actual. Negative error = wind
            underforecast.
          </p>
        </section>
        <section className="panel compact-panel">
          <div className="section-top">
            <div>
              <span className="eyebrow">MEASURE WHAT IS ACTUALLY THERE</span>
              <h2>Coverage, without shortcuts.</h2>
            </div>
            <span className="icon-well">
              <CheckCheck size={20} />
            </span>
          </div>
          <div className="coverage-list">
            <div>
              <span>Matched native observations</span>
              <strong>
                {m.count} / {a.expected_native_points}
              </strong>
            </div>
            <div>
              <span>Missing hourly forecasts</span>
              <strong>{a.missing_native_forecasts}</strong>
            </div>
            <div>
              <span>Missing actual at a forecast timestamp</span>
              <strong>{a.missing_actual_at_forecast}</strong>
            </div>
            <div>
              <span>WAPE · absolute error / total actual</span>
              <strong>{number(m.wape_pct, 1)}%</strong>
            </div>
          </div>
          <p className="fine-print">
            {a.selected_forecasts} selected forecasts across{" "}
            {a.settlement_points} half-hour settlement timestamps. Hourly
            forecasts are never expanded to manufacture extra observations.
          </p>
        </section>
      </div>
      <section className="panel table-panel">
        <div className="section-top">
          <div>
            <span className="eyebrow">REPRODUCIBLE DAILY SCORES</span>
            <h2>Daily breakdown</h2>
          </div>
          <a
            className="button secondary small"
            href={`/api/accuracy/export?start=${start}&end=${end}&cutoff=${cutoff}`}
            download
          >
            <ArrowDownToLine size={15} />
            Export daily scores
          </a>
        </div>
        <div className="table-scroll">
          <table>
            <caption className="sr-only">
              Forecast accuracy by decision day. Select a date to replay it.
            </caption>
            <thead>
              <tr>
                <th scope="col">Decision date</th>
                <th scope="col">Delivery date</th>
                <th scope="col">MAE MW</th>
                <th scope="col">RMSE MW</th>
                <th scope="col">Bias MW</th>
                <th scope="col">Matched</th>
              </tr>
            </thead>
            <tbody>
              {a.days.map((d) => (
                <tr key={d.decision_date}>
                  <td>
                    <button
                      className="table-link"
                      onClick={() => inspect(d.decision_date)}
                    >
                      {niceDate(d.decision_date)}
                      <ArrowUpRight size={12} />
                    </button>
                  </td>
                  <td>{niceDate(d.delivery_date)}</td>
                  <td>{number(d.mae_mw)}</td>
                  <td>{number(d.rmse_mw)}</td>
                  <td>
                    {d.bias_mw != null && d.bias_mw > 0 ? "+" : ""}
                    {number(d.bias_mw)}
                  </td>
                  <td>{d.count}/24</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function MethodView({ meta }: { meta: Meta | null }) {
  return (
    <div className="method-grid">
      <section className="panel method-intro">
        <span className="icon-well large">
          <BookOpen size={23} />
        </span>
        <div>
          <span className="eyebrow">THE METHOD BEHIND THE NUMBERS</span>
          <h2>A forecast is only useful if you know when it was available.</h2>
          <p>
            This pilot evaluates Elexon’s existing national wind forecasts. It
            does not train a prediction model or place orders. Every result can
            be traced to a source publication.
          </p>
        </div>
      </section>
      <section className="panel method-card">
        <span className="step">01</span>
        <h2>Define the decision</h2>
        <p>
          Decision dates run from 1–31 January 2026. Delivery is the following
          calendar day, 2 January–1 February. All controls use Europe/London;
          January is GMT.
        </p>
        <p>
          The default 09:30 cutoff is an illustrative internal decision time,
          not a universal market deadline. Change it to match the client’s
          workflow.
        </p>
      </section>
      <section className="panel method-card">
        <span className="step">02</span>
        <h2>Choose eligible publications</h2>
        <code>max(publishTime) where publishTime ≤ cutoff</code>
        <p>
          Apply this separately to every target startTime. Forecast age measures
          time since publication; lead time measures publication to delivery.
          Later updates cannot enter an earlier decision.
        </p>
      </section>
      <section className="panel method-card">
        <span className="step">03</span>
        <h2>Match without inventing data</h2>
        <p>
          Use only WINDFOR and FUELHH with fuelType WIND. The downloaded January
          forecast points are hourly; actuals are half-hourly.
        </p>
        <p>
          Score exact startTime matches only. A :30 actual with no forecast
          stays unpaired. No interpolation, zero filling, or estimated full-day
          energy totals. This is a timestamp-matched evaluation, not a complete
          half-hour energy backtest.
        </p>
      </section>
      <section className="panel method-card">
        <span className="step">04</span>
        <h2>Quantify error</h2>
        <code>error = forecast MW − actual MW</code>
        <div className="formula-list">
          <p>
            <strong>MAE</strong> = mean(|error|) · typical magnitude
          </p>
          <p>
            <strong>RMSE</strong> = √mean(error²) · larger misses weigh more
          </p>
          <p>
            <strong>Bias</strong> = mean(error) · signed tendency
          </p>
          <p>
            <strong>WAPE</strong> = 100 × Σ|error| / Σactual
          </p>
          <p>
            <strong>P90</strong> = 90th percentile of |error|, linear
            interpolation
          </p>
        </div>
        <p>
          Metrics pool matched observations; missing values are excluded and
          counted. WAPE is undefined when total matched actual is zero. A zero
          bias can hide large cancelling errors.
        </p>
      </section>
      <section className="panel method-card">
        <span className="step">05</span>
        <h2>Keep hindsight visible</h2>
        <p>
          The accuracy view uses the latest retrieved actual publication for
          each timestamp. “Prior typical error” uses earlier January decisions
          and only actuals published by the replay cutoff.
        </p>
        <p>
          Source publication time is a proxy for availability. A retrospective
          download cannot establish when a client’s system received it. No
          calibrated probability bands are claimed from this short sample.
        </p>
      </section>
      <section className="panel method-card">
        <span className="step">06</span>
        <h2>Know the commercial boundary</h2>
        <p>
          Overforecast wind means potentially buying too little; underforecast
          wind means potentially buying too much. Actual procurement also needs
          the client’s demand, contracts, and portfolio exposure.
        </p>
        <p>
          This app supports judgement with measured error; it does not recommend
          a quantity, forecast prices, or claim savings. Great Britain Elexon
          wind coverage should not be read as every UK wind installation.
        </p>
      </section>
      <section className="panel source-card">
        <div>
          <span className="eyebrow">SOURCE AND SNAPSHOT</span>
          <h2>Real Elexon data. Reproducible results.</h2>
          <p>
            {meta
              ? `${number(meta.forecast_rows)} forecast versions · ${number(meta.actual_rows)} actual versions · ${meta.source_requests} archived source requests`
              : "Snapshot metadata currently unavailable."}
          </p>
          <p>
            Retrieved{" "}
            {meta
              ? new Date(meta.retrieved_at).toLocaleDateString("en-GB", {
                  timeZone: "Europe/London",
                })
              : "—"}{" "}
            · checksum <code>{meta?.database_sha256.slice(0, 16) ?? "—"}…</code>
          </p>
          <a
            href="https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/WINDFOR/stream"
            target="_blank"
            rel="noreferrer"
          >
            WINDFOR documentation <ArrowUpRight size={13} />
          </a>
          <a
            href="https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/FUELHH/stream"
            target="_blank"
            rel="noreferrer"
          >
            FUELHH documentation <ArrowUpRight size={13} />
          </a>
        </div>
        <Database size={44} strokeWidth={1} />
      </section>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState<View>("decision");
  const [day, setDay] = useState("2026-01-15");
  const [cutoff, setCutoff] = useState("09:30");
  const [draftDay, setDraftDay] = useState(day);
  const [draftCutoff, setDraftCutoff] = useState(cutoff);
  const [start, setStart] = useState("2026-01-01");
  const [end, setEnd] = useState("2026-01-31");
  const [draftStart, setDraftStart] = useState(start);
  const [draftEnd, setDraftEnd] = useState(end);
  const [reveal, setReveal] = useState(false);
  const [filterError, setFilterError] = useState("");
  const { data: meta } = useResource<Meta>("/api/meta");
  const nav = [
    { id: "decision" as const, label: "Decision desk", icon: LayoutDashboard },
    { id: "accuracy" as const, label: "Forecast accuracy", icon: BarChart3 },
    { id: "method" as const, label: "Methodology", icon: BookOpen },
  ];
  const navigate = (v: View) => {
    setView(v);
    setFilterError("");
  };
  const inspect = (date: string) => {
    setDay(date);
    setDraftDay(date);
    setReveal(true);
    setView("decision");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const changeDay = (value: string) => {
    setDay(value);
    setDraftDay(value);
    setReveal(false);
  };
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          aria-label="Aer home"
          onClick={(e) => {
            e.preventDefault();
            navigate("decision");
          }}
        >
          <span className="brand-mark">
            <Wind size={25} strokeWidth={1.6} />
          </span>
          <span>
            aer<span className="brand-period">.</span>
          </span>
        </a>
        <div className="workspace-label">
          WIND INTELLIGENCE <span>PILOT</span>
        </div>
        <nav aria-label="Main navigation">
          {nav.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`nav-item ${view === id ? "active" : ""}`}
              aria-current={view === id ? "page" : undefined}
              onClick={() => navigate(id)}
            >
              <Icon size={18} strokeWidth={1.7} />
              {label}
              {view === id && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="source-note">
            <span className="icon-well">
              <Database size={17} />
            </span>
            <div>
              <strong>Powered by Elexon</strong>
              <span>WINDFOR + FUELHH · WIND</span>
            </div>
          </div>
          <div className="sidebar-foot">
            <ShieldCheck size={14} />
            <span>Read-only research pilot</span>
          </div>
        </div>
      </aside>
      <div className="main-column">
        <header className="topbar">
          <span>
            Workspace <ChevronRight size={12} />
            <strong>{nav.find((n) => n.id === view)?.label}</strong>
          </span>
          <div className="topbar-right">
            <span className="replay-badge">
              <span className="dot" />
              Historical replay
            </span>
            <span className="avatar" aria-label="Great Britain pilot">
              GB
            </span>
          </div>
        </header>
        <main id="main">
          <section className="page-heading">
            <div>
              <div className="heading-kicker">
                <span className="tiny-icon">
                  <Sparkles size={13} />
                </span>{" "}
                A LITTLE MORE CLARITY. A BETTER INFORMED DECISION.
              </div>
              <h1>
                {view === "decision"
                  ? "Tomorrow, in perspective."
                  : view === "accuracy"
                    ? "Know the forecast’s limits."
                    : "Clarity starts with the method."}
              </h1>
              <p>
                {view === "decision"
                  ? "The wind forecast you could know. The uncertainty you should consider."
                  : view === "accuracy"
                    ? "Measure how decision-time forecasts performed against actual wind generation."
                    : "A transparent path from publication to decision to measured error."}
              </p>
            </div>
            <span className="period-tag">
              <CalendarDays size={15} />
              January 2026 pilot
            </span>
          </section>
          {view !== "method" && (
            <form
              className="filter-panel panel"
              onSubmit={(e) => {
                e.preventDefault();
                const fields = new FormData(e.currentTarget);
                const nextCutoff = String(fields.get("cutoff") ?? draftCutoff);
                const nextStart = String(fields.get("start") ?? draftStart);
                const nextEnd = String(fields.get("end") ?? draftEnd);
                if (nextStart > nextEnd && view === "accuracy") {
                  setFilterError(
                    "Start date must be before or equal to end date.",
                  );
                  return;
                }
                setFilterError("");
                setCutoff(nextCutoff);
                setDraftCutoff(nextCutoff);
                if (view === "decision")
                  changeDay(String(fields.get("decision_date") ?? draftDay));
                else {
                  setStart(nextStart);
                  setEnd(nextEnd);
                  setDraftStart(nextStart);
                  setDraftEnd(nextEnd);
                }
              }}
            >
              {view === "decision" ? (
                <>
                  <label className="filter-field">
                    <span>DECISION DATE</span>
                    <div>
                      <CalendarDays size={16} />
                      <input
                        name="decision_date"
                        aria-label="Decision date"
                        type="date"
                        min="2026-01-01"
                        max="2026-01-31"
                        required
                        value={draftDay}
                        onChange={(e) => setDraftDay(e.target.value)}
                      />
                    </div>
                  </label>
                  <div className="delivery-arrow">
                    <ArrowRight size={17} />
                  </div>
                  <div className="delivery-display">
                    <span>DELIVERY DATE</span>
                    <strong>{niceDate(shiftDate(day, 1), true)}</strong>
                  </div>
                </>
              ) : (
                <>
                  <label className="filter-field">
                    <span>DECISIONS FROM</span>
                    <div>
                      <CalendarDays size={16} />
                      <input
                        name="start"
                        aria-label="First decision date"
                        type="date"
                        min="2026-01-01"
                        max="2026-01-31"
                        required
                        value={draftStart}
                        onChange={(e) => setDraftStart(e.target.value)}
                      />
                    </div>
                  </label>
                  <label className="filter-field">
                    <span>DECISIONS THROUGH</span>
                    <div>
                      <input
                        name="end"
                        aria-label="Last decision date"
                        type="date"
                        min="2026-01-01"
                        max="2026-01-31"
                        required
                        value={draftEnd}
                        onChange={(e) => setDraftEnd(e.target.value)}
                      />
                    </div>
                  </label>
                </>
              )}
              <label className="filter-field cutoff-field">
                <span>BUYING CUTOFF · UK TIME</span>
                <div>
                  <Clock3 size={16} />
                  <input
                    name="cutoff"
                    aria-label="Buying decision cutoff"
                    type="time"
                    required
                    value={draftCutoff}
                    onChange={(e) => setDraftCutoff(e.target.value)}
                  />
                  <span className="timezone">GMT</span>
                </div>
              </label>
              <div className="filter-actions">
                <button className="button update" type="submit">
                  Update view <ArrowRight size={15} />
                </button>
                <a
                  className="button secondary export-button"
                  aria-label="Export current view as CSV"
                  href={
                    view === "decision"
                      ? `/api/export?decision_date=${day}&cutoff=${cutoff}&reveal=${reveal}`
                      : `/api/accuracy/export?start=${start}&end=${end}&cutoff=${cutoff}`
                  }
                  download
                >
                  <ArrowDownToLine size={16} />
                  <span>Export CSV</span>
                </a>
              </div>
            </form>
          )}
          {filterError && (
            <div role="alert" className="warning">
              {filterError}
            </div>
          )}
          {view === "decision" && (
            <div className="context-line">
              <span>
                <span className="dot" />
                Decision {niceDate(day)} at {cutoff} → delivery{" "}
                {niceDate(shiftDate(day, 1))}
                <span className="context-separator">/</span> Forecasts published
                by cutoff only
              </span>
              <div>
                <button
                  className="icon-button"
                  aria-label="Previous decision day"
                  disabled={day === "2026-01-01"}
                  onClick={() => changeDay(shiftDate(day, -1))}
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  className="icon-button"
                  aria-label="Next decision day"
                  disabled={day === "2026-01-31"}
                  onClick={() => changeDay(shiftDate(day, 1))}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
          {view === "accuracy" && (
            <div className="context-line">
              <span>
                <Info size={14} />
                Retrospective evaluation · latest retrieved actuals · exact
                timestamp matching
              </span>
              <span>
                {niceDate(start)}–{niceDate(end)}
              </span>
            </div>
          )}
          {view === "decision" ? (
            <DecisionView
              day={day}
              cutoff={cutoff}
              reveal={reveal}
              setReveal={setReveal}
              inspectDay={() => navigate("accuracy")}
            />
          ) : view === "accuracy" ? (
            <AccuracyView
              cutoff={cutoff}
              start={start}
              end={end}
              inspect={inspect}
            />
          ) : (
            <MethodView meta={meta} />
          )}
          <footer className="footer">
            <span>
              <Wind size={16} /> aer.{" "}
              <span>Wind intelligence, with perspective.</span>
            </span>
            <span>Elexon data · Great Britain · January 2026 replay</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
