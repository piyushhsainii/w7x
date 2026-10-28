import { lazy, Suspense, useSyncExternalStore } from "react";
import {
  ChevronRight,
  Gauge,
  Ruler,
  Scale,
  SquareRadical,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Label,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  usePlotArea,
} from "recharts";
import type { DayScore } from "../api";
import { dateLabel, direction, number, signed } from "../format";
import { useAccuracyQuery } from "../query";
import { QueryControls } from "./QueryControls";
import {
  CoverageLine,
  ExportButton,
  Glossary,
  Icon,
  KeyFinding,
  MetricCard,
  SignedError,
  Status,
} from "./ui";

const OverforecastRadial = lazy(() =>
  import("./StatisticalCharts").then((module) => ({
    default: module.OverforecastRadial,
  })),
);

function ScoreTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const day = payload[0].payload as DayScore;
  return (
    <div className="chart-tooltip">
      <strong>Decision: {dateLabel(day.decision_date)}</strong>
      <dl>
        <div>
          <dt>MAE</dt>
          <dd>{number(day.mae_mw)} MW</dd>
        </div>
        <div>
          <dt>Bias</dt>
          <dd>
            <SignedError value={day.bias_mw} />
          </dd>
        </div>
        <div>
          <dt>Matched</dt>
          <dd>{day.count}/24</dd>
        </div>
      </dl>
      <p>Activate the bar or its table row to replay this decision.</p>
    </div>
  );
}

function WorstLabel({ x, y, width, value }: any) {
  if (!value) return <g />;
  // Stagger rank 3 inside its bar so neighbouring worst-day labels stay distinct on mobile.
  const centerY = value === 3 ? y + 16 : y - 15;
  return (
    <g aria-hidden="true">
      <circle
        cx={x + width / 2}
        cy={centerY}
        r={11}
        fill="var(--color-primary)"
        stroke="var(--color-surface)"
        strokeWidth={1.5}
      />
      <text
        x={x + width / 2}
        y={centerY + 4}
        textAnchor="middle"
        fill="var(--color-on-primary)"
        fontSize={12}
        fontWeight={600}
      >
        {value}
      </text>
    </g>
  );
}

const COMPACT_QUERY = "(max-width: 639px)";
const DESKTOP_ERROR_MARGIN = { top: 42, right: 130, left: 0, bottom: 30 };
const MOBILE_ERROR_MARGIN = { top: 42, right: 18, left: 0, bottom: 30 };
function subscribeCompact(listener: () => void) {
  const media = window.matchMedia?.(COMPACT_QUERY);
  media?.addEventListener("change", listener);
  return () => media?.removeEventListener("change", listener);
}
const compactSnapshot = () =>
  window.matchMedia?.(COMPACT_QUERY).matches ?? false;

function PooledLabel({
  viewBox,
  value,
  compact,
}: {
  viewBox?: { x?: number; y?: number; width?: number };
  value: number;
  compact: boolean;
}) {
  const plot = usePlotArea();
  if (!plot || viewBox?.y == null) return null;
  const width = 110;
  const height = 46;
  const gap = 8;
  const x = compact ? plot.x + gap : plot.x + plot.width + gap;
  // Keep the pill within the chart at either axis extreme. The existing 42px
  // top margin also leaves room for the compact pill above a near-top line.
  const preferredTop = compact
    ? viewBox.y - gap - height
    : viewBox.y - height / 2;
  const minTop = compact ? 4 : plot.y;
  const y = Math.max(
    minTop,
    Math.min(preferredTop, plot.y + plot.height - height),
  );
  return (
    <g
      className="pooled-mae-label"
      role="group"
      aria-label={`Pooled MAE: ${number(value)} megawatts`}
      pointerEvents="none"
    >
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={6}
        fill="var(--color-surface)"
        stroke="var(--color-primary)"
        strokeWidth={1}
      />
      <text
        x={x + 8}
        y={y + height / 2}
        textAnchor="start"
        dominantBaseline="middle"
        fill="var(--color-primary)"
        fontSize={12}
        fontWeight={600}
      >
        <tspan x={x + 8} dy={-8}>
          Pooled MAE
        </tspan>
        <tspan x={x + 8} dy={16}>
          {number(value)} MW
        </tspan>
      </text>
    </g>
  );
}

export default function AccuracyView({
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
  const compact = useSyncExternalStore(
    subscribeCompact,
    compactSnapshot,
    () => false,
  );
  const resource = useAccuracyQuery(start, end, cutoff);
  const a = resource.data;
  if (!a)
    return (
      <Status
        loading={resource.isPending}
        error={resource.error?.message ?? ""}
        retry={() => {
          void resource.refetch();
        }}
      />
    );
  const m = a.metrics;
  // Presentation ranking of existing daily MAE values; no metric is recalculated.
  const worst = [...a.days]
    .filter((d) => d.mae_mw != null)
    .sort((x, y) => (y.mae_mw ?? 0) - (x.mae_mw ?? 0))
    .slice(0, 3);
  const chartDays = a.days.map((d) => ({
    ...d,
    label: d.decision_date.slice(-2),
    worst: worst.findIndex((w) => w.decision_date === d.decision_date) + 1,
  }));
  return (
    <>
      <QueryControls query={resource} />
      <KeyFinding>
        {m.count ? (
          <>
            Forecasts exceeded actual wind in{" "}
            <strong>
              {number(m.overforecast_pct, 1)}% of matched observations
            </strong>
            . Mean signed error: <strong>{signed(m.bias_mw)} MW</strong>.
            Typical absolute miss: <strong>{number(m.mae_mw)} MW</strong>;
            aggregate absolute error was{" "}
            <strong>
              {number(m.wape_pct, 1)}% of matched actual generation
            </strong>
            .
          </>
        ) : (
          "No paired observations are available for these filters."
        )}
      </KeyFinding>
      <div className="kpi-grid">
        <MetricCard
          icon={Ruler}
          label="Typical error"
          term="MAE"
          value={number(m.mae_mw)}
          unit="MW"
          caption="Average absolute miss at matched timestamps"
        />
        <MetricCard
          icon={SquareRadical}
          label="Large-error sensitivity"
          term="RMSE"
          value={number(m.rmse_mw)}
          unit="MW"
          caption="Gives larger forecast misses more weight"
        />
        <MetricCard
          icon={Scale}
          label="Directional bias"
          term="Bias"
          value={signed(m.bias_mw)}
          unit="MW"
          tone={direction(m.bias_mw)}
          caption={
            <span className={`signed-error semantic-${direction(m.bias_mw)}`}>
              <Icon
                icon={
                  m.bias_mw != null && m.bias_mw < 0
                    ? TrendingDown
                    : m.bias_mw != null && m.bias_mw > 0
                      ? TrendingUp
                      : Scale
                }
                size={18}
              />
              {m.bias_mw == null
                ? "No paired observations"
                : m.bias_mw > 0
                  ? "Wind overforecast on average"
                  : m.bias_mw < 0
                    ? "Wind underforecast on average"
                    : "No average signed tendency"}
            </span>
          }
        />
        <MetricCard
          icon={Ruler}
          label="Typical error, % of actual"
          term="WAPE"
          value={number(m.wape_pct, 1)}
          unit="%"
          caption="Total absolute error / total matched actual"
        />
      </div>
      <section className="panel primary-panel accuracy-panel">
        <div className="section-heading">
          <div>
            <h2>Daily forecast error</h2>
            <p>
              Decision dates {dateLabel(start)}–{dateLabel(end)} · {cutoff} GMT
              cutoff
            </p>
          </div>
        </div>
        <ul className="chart-legend" aria-label="Daily error chart legend">
          <li className="semantic-over">
            <Icon icon={TrendingUp} size={18} />
            <span className="legend-bar over-bar" />
            Positive bias · wind overforecast
          </li>
          <li className="semantic-under">
            <Icon icon={TrendingDown} size={18} />
            <span className="legend-bar under-bar" />
            Negative bias · wind underforecast
          </li>
          <li>
            <span className="rank-swatch">1–3</span>Highest daily MAE
          </li>
        </ul>
        <span className="axis-unit" aria-hidden="true">
          MW
        </span>
        <div
          className="accuracy-chart"
          role="group"
          aria-label="Daily mean absolute error by decision date in January 2026. Bar colour indicates signed daily bias. Numbered markers identify the three highest daily errors. A complete daily table follows."
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartDays}
              margin={compact ? MOBILE_ERROR_MARGIN : DESKTOP_ERROR_MARGIN}
              style={{ overflow: "visible" }}
              accessibilityLayer
              onClick={(state: any) => {
                const row = chartDays.find(
                  (d) => d.label === state?.activeLabel,
                );
                if (row) inspect(row.decision_date);
              }}
            >
              <CartesianGrid
                stroke="var(--color-grid)"
                vertical={false}
                strokeDasharray="3 4"
              />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "var(--color-muted)", fontSize: 12 }}
                dy={7}
                minTickGap={15}
                label={{
                  value: "Decision date · Jan 2026",
                  position: "insideBottom",
                  offset: -20,
                  fill: "var(--color-muted)",
                  fontSize: 12,
                }}
              />
              <YAxis
                width={65}
                tickFormatter={(v) => number(v)}
                axisLine={false}
                tickLine={false}
                tick={{ fill: "var(--color-muted)", fontSize: 12 }}
              />
              <Tooltip
                content={<ScoreTooltip />}
                cursor={{ fill: "var(--color-primary-surface)" }}
              />
              <Bar
                dataKey="mae_mw"
                name="Daily MAE"
                radius={[4, 4, 0, 0]}
                maxBarSize={30}
                isAnimationActive={false}
                activeBar={{ stroke: "var(--color-text)", strokeWidth: 2 }}
              >
                {chartDays.map((d) => (
                  <Cell
                    key={d.decision_date}
                    fill={`var(--color-${direction(d.bias_mw)})`}
                    stroke={d.worst ? "var(--color-text)" : "none"}
                    strokeWidth={d.worst ? 1.5 : 0}
                    cursor="pointer"
                  />
                ))}
                <LabelList dataKey="worst" content={<WorstLabel />} />
              </Bar>
              {m.mae_mw != null && (
                <ReferenceLine
                  y={m.mae_mw}
                  stroke="var(--color-primary)"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  role="img"
                  aria-label={`Pooled MAE across January: ${number(m.mae_mw)} megawatts`}
                >
                  <Label
                    content={<PooledLabel value={m.mae_mw} compact={compact} />}
                  />
                </ReferenceLine>
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div
          className="worst-days"
          aria-label="Three decisions with the highest daily MAE"
        >
          {worst.map((d, i) => (
            <button
              className="worst-day"
              key={d.decision_date}
              onClick={() => inspect(d.decision_date)}
            >
              <span className="rank">{i + 1}</span>
              <span>
                <strong>{dateLabel(d.decision_date)}</strong>
                <span>{number(d.mae_mw)} MW MAE</span>
              </span>
              <Icon icon={ChevronRight} size={18} />
            </button>
          ))}
        </div>
        <p className="caption">
          Bars show error magnitude; colour and signed bias describe direction.{" "}
          <a href="#daily-breakdown">Use the daily table</a> to inspect every
          value or replay a decision.
        </p>
      </section>
      <CoverageLine matched={m.count} expected={a.expected_native_points}>
        <dl className="coverage-details">
          <div>
            <dt>Missing hourly forecasts</dt>
            <dd>{a.missing_native_forecasts}</dd>
          </div>
          <div>
            <dt>Missing actuals at forecast timestamps</dt>
            <dd>{a.missing_actual_at_forecast}</dd>
          </div>
          <div>
            <dt>Selected hourly forecasts</dt>
            <dd>{number(a.selected_forecasts)}</dd>
          </div>
          <div>
            <dt>Half-hour settlement timestamps</dt>
            <dd>{number(a.settlement_points)}</dd>
          </div>
        </dl>
        <p>
          Hourly forecasts are not repeated or interpolated into extra half-hour
          observations.
        </p>
      </CoverageLine>
      <div className="risk-layout">
        <article className="panel risk-panel">
          <div className="section-icon">
            <Icon icon={Gauge} />
          </div>
          <h2>
            Historical large-error threshold · <Glossary term="P90" />
          </h2>
          <strong className="risk-number">
            {number(m.p90_absolute_error_mw)} <span>MW</span>
          </strong>
          <p>
            90% of observed absolute errors were at or below this size. This is
            a historical threshold, not a guaranteed range for tomorrow.
          </p>
        </article>
        <article className="panel risk-panel">
          <h2>Overforecast wind and buying exposure</h2>
          <div className="overforecast-summary">
            <Suspense
              fallback={
                <figure className="overforecast-radial" aria-hidden="true">
                  <div className="radial-plot" />
                  <figcaption>&nbsp;</figcaption>
                </figure>
              }
            >
              <OverforecastRadial value={m.overforecast_pct} count={m.count} />
            </Suspense>
            <div>
              <p>
                <strong className="semantic-over">
                  {number(m.overforecast_pct, 1)}%
                </strong>{" "}
                of matched observations overforecast wind. Among those
                observations, the mean overforecast was{" "}
                <strong>{number(m.mean_overforecast_mw)} MW</strong>.
              </p>
              <p>
                Overforecast wind can contribute to buying too little other
                power. The client’s actual position also depends on demand,
                contracts, and portfolio exposure.
              </p>
            </div>
          </div>
        </article>
      </div>
      <section className="panel daily-panel" id="daily-breakdown">
        <div className="section-heading">
          <div>
            <h2>Daily breakdown</h2>
            <p>
              All {a.days.length} rows are shown below; select a row to replay
              its decision.
            </p>
          </div>
          <ExportButton
            href={`/api/accuracy/export?start=${start}&end=${end}&cutoff=${cutoff}`}
            label="Export daily scores"
          />
        </div>
        <div className="table-scroll daily-table">
          <table>
            <caption className="sr-only">
              Daily error scores. Error is forecast minus actual. Warning icons
              identify incomplete daily samples.
            </caption>
            <thead>
              <tr>
                <th scope="col">Decision date</th>
                <th scope="col">Delivery date</th>
                <th scope="col" className="numeric">
                  MAE MW
                </th>
                <th scope="col" className="numeric">
                  RMSE MW
                </th>
                <th scope="col" className="numeric">
                  Bias MW
                </th>
                <th scope="col">
                  <span className="sr-only">Inspect</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {a.days.map((d) => (
                <tr
                  key={d.decision_date}
                  tabIndex={0}
                  onClick={() => inspect(d.decision_date)}
                  aria-label={`Replay decision ${dateLabel(d.decision_date)}`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      inspect(d.decision_date);
                    }
                  }}
                >
                  <th scope="row">
                    {dateLabel(d.decision_date)}
                    {d.count < 24 && (
                      <span
                        className="sample-warning"
                        title={`${d.count}/24 matched observations`}
                      >
                        <Icon icon={TriangleAlert} size={18} />
                        <span className="sr-only">
                          Incomplete data: {d.count}/24 matched
                        </span>
                      </span>
                    )}
                  </th>
                  <td>{dateLabel(d.delivery_date)}</td>
                  <td className="numeric">{number(d.mae_mw)}</td>
                  <td className="numeric">{number(d.rmse_mw)}</td>
                  <td className="numeric">
                    <SignedError value={d.bias_mw} />
                  </td>
                  <td className="inspect-cell">
                    <Icon icon={ChevronRight} size={18} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="table-footer">
          {a.days.length} complete rows displayed · no clipped table body · all
          errors in MW
        </p>
      </section>
    </>
  );
}
