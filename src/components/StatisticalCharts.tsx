import { memo, useMemo } from "react";
import { EvilRadarChart } from "./evilcharts/recharts-radar-chart";
import { EvilRadialChart } from "./evilcharts/recharts-radial-chart";
import type { Interval } from "../api";
import { number, publicationLabel } from "../format";
const OVERFORECAST_CONFIG = {
  overforecast: {
    label: "Historical overforecast",
    colors: ["var(--color-over)"],
  },
};
const WIND_CONFIG = {
  forecast_mw: {
    label: "Selected forecast",
    colors: ["var(--color-primary)", "var(--color-text)"],
  },
  actual_mw: { label: "Actual wind", colors: ["var(--color-under)"] },
};

/** A share of historical observations, never an accuracy score or future probability. */
export const OverforecastRadial = memo(function OverforecastRadial({
  value,
  count,
}: {
  value: number | null;
  count: number;
}) {
  const data = useMemo(
    () => [{ name: "overforecast", value: value ?? 0 }],
    [value],
  );
  return (
    <figure
      className="overforecast-radial"
      role="img"
      aria-label={
        value == null
          ? "No paired observations to measure overforecast share"
          : `${number(value, 1)} percent of ${number(count)} matched observations overforecast wind. This is historical frequency, not future probability.`
      }
    >
      <div className="radial-plot" aria-hidden="true">
        <EvilRadialChart
          config={OVERFORECAST_CONFIG}
          data={data}
          nameKey="name"
          max={100}
          innerRadius="76%"
          outerRadius="94%"
          chartProps={{ width: 180, height: 180 }}
        >
          <EvilRadialChart.RadialBar
            dataKey="value"
            cornerRadius={8}
            barSize={14}
            radialBarProps={{
              background: { fill: "var(--color-grid)" },
              isAnimationActive: false,
            }}
          />
        </EvilRadialChart>
        <div className="radial-center">
          <strong>
            {number(value, 1)}
            {value != null && <span>%</span>}
          </strong>
          <span>overforecast</span>
        </div>
      </div>
      <figcaption>{number(count)} matched observations</figcaption>
    </figure>
  );
});

function WindSnapshotTooltip({
  active,
  payload,
  revealed,
}: {
  active?: boolean;
  payload?: { payload: Interval }[];
  revealed: boolean;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
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
          <div>
            <dt>Actual</dt>
            <dd>{number(row.actual_mw)} MW</dd>
          </div>
        )}
      </dl>
    </div>
  );
}

export const WindProfileRadar = memo(function WindProfileRadar({
  rows,
  domain,
  revealed,
}: {
  rows: Interval[];
  domain: [number, number];
  revealed: boolean;
}) {
  if (rows.length !== 6 || rows.some((row) => row.forecast_mw == null)) {
    return (
      <div className="wind-profile-radar radar-empty" role="status">
        <p>
          All six native forecasts are needed for this profile. Inspect
          available points and gaps in the timeline or audit trail.
        </p>
      </div>
    );
  }
  return (
    <div
      className="wind-profile-radar"
      role="img"
      aria-label={`Wind generation at six four-hour snapshots, in megawatts. Forecast${revealed ? " and actual wind" : "; actual outcome hidden"}. Full values and source times are in the forecast audit trail.`}
    >
      <EvilRadarChart
        config={WIND_CONFIG}
        data={rows}
        chartProps={{
          outerRadius: "65%",
          margin: { top: 20, right: 28, bottom: 20, left: 28 },
        }}
      >
        <EvilRadarChart.PolarGrid />
        <EvilRadarChart.PolarAngleAxis dataKey="label" />
        <EvilRadarChart.PolarRadiusAxis
          domain={domain}
          tickCount={3}
          angle={60}
          tickFormatter={(value) => number(value)}
        />
        <EvilRadarChart.Tooltip
          content={<WindSnapshotTooltip revealed={revealed} />}
        />
        <EvilRadarChart.Radar
          dataKey="forecast_mw"
          variant="filled"
          fillOpacity={0.16}
          radarProps={{
            strokeWidth: 2.5,
            dot: { r: 3 },
            connectNulls: false,
            isAnimationActive: false,
          }}
        />
        <EvilRadarChart.Radar
          dataKey="actual_mw"
          variant="lines"
          radarProps={{
            hide: !revealed,
            strokeDasharray: "6 4",
            strokeWidth: 2,
            dot: { r: 3 },
            connectNulls: false,
            isAnimationActive: false,
          }}
        />
      </EvilRadarChart>
    </div>
  );
});
