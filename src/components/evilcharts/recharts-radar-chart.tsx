/** @license MIT — EvilCharts, Copyright (c) 2026 Gurbinder.
 * Selected radar root/series/axis/gradient parts adapted from revision
 * 8b9c26d1f6b21033506f0cc8017e7940c7c26ad4. See UPSTREAM.md.
 */
import {
  createContext,
  useContext,
  useId,
  useMemo,
  type ComponentProps,
  type ReactNode,
} from "react";
import {
  PolarAngleAxis as RechartsPolarAngleAxis,
  PolarGrid as RechartsPolarGrid,
  PolarRadiusAxis as RechartsPolarRadiusAxis,
  Radar as RechartsRadar,
  RadarChart as RechartsRadarChart,
  Tooltip,
} from "recharts";
import { ChartContainer, type ChartConfig } from "./chart-container";

const RadarContext = createContext<ChartConfig | null>(null);
function useRadarConfig() {
  const config = useContext(RadarContext);
  if (!config)
    throw new Error("Radar parts must be used within EvilRadarChart");
  return config;
}
export function EvilRadarChart<T extends Record<string, unknown>>({
  config,
  data,
  children,
  chartProps,
}: {
  config: ChartConfig;
  data: T[];
  children: ReactNode;
  chartProps?: Omit<
    ComponentProps<typeof RechartsRadarChart>,
    "children" | "data"
  >;
}) {
  const chartId = useId().replace(/:/g, "");
  const context = useMemo(() => config, [config]);
  return (
    <RadarContext.Provider value={context}>
      <ChartContainer config={config}>
        <RechartsRadarChart id={chartId} data={data} {...chartProps}>
          {children}
        </RechartsRadarChart>
      </ChartContainer>
    </RadarContext.Provider>
  );
}

function ColorStops({
  dataKey,
  colorsCount,
  opacities,
}: {
  dataKey: string;
  colorsCount: number;
  opacities?: number[];
}) {
  const count = Math.max(2, colorsCount);
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <stop
          key={index}
          offset={`${(index / (count - 1)) * 100}%`}
          stopColor={`var(--color-${dataKey}-${Math.min(index, colorsCount - 1)})`}
          stopOpacity={opacities?.[index] ?? 1}
        />
      ))}
    </>
  );
}
function Radar({
  dataKey,
  variant = "filled",
  fillOpacity = 0.3,
  radarProps,
}: {
  dataKey: string;
  variant?: "filled" | "lines";
  fillOpacity?: number;
  radarProps?: Omit<ComponentProps<typeof RechartsRadar>, "dataKey">;
}) {
  const config = useRadarConfig();
  const id = useId().replace(/:/g, "");
  const colorsCount = config[dataKey]?.colors.length ?? 1;
  const filled = variant === "filled";
  return (
    <>
      <RechartsRadar
        dataKey={dataKey}
        name={config[dataKey]?.label}
        stroke={`url(#${id}-radar-stroke-${dataKey})`}
        strokeWidth={2}
        fill={filled ? `url(#${id}-radar-fill-${dataKey})` : "none"}
        fillOpacity={filled ? fillOpacity : 0}
        isAnimationActive={false}
        {...radarProps}
      />
      <defs>
        <linearGradient
          id={`${id}-radar-stroke-${dataKey}`}
          x1="0"
          y1="0"
          x2="1"
          y2="1"
        >
          <ColorStops dataKey={dataKey} colorsCount={colorsCount} />
        </linearGradient>
        {filled && (
          <radialGradient
            id={`${id}-radar-fill-${dataKey}`}
            cx="50%"
            cy="50%"
            r="50%"
          >
            <ColorStops
              dataKey={dataKey}
              colorsCount={colorsCount}
              opacities={[0.8, 0.3]}
            />
          </radialGradient>
        )}
      </defs>
    </>
  );
}
function PolarGrid({
  gridType = "polygon",
  stroke = "var(--color-grid)",
  strokeOpacity = 1,
  strokeDasharray = "3 4",
  ...props
}: ComponentProps<typeof RechartsPolarGrid>) {
  return (
    <RechartsPolarGrid
      gridType={gridType}
      stroke={stroke}
      strokeOpacity={strokeOpacity}
      strokeDasharray={strokeDasharray}
      {...props}
    />
  );
}
function PolarAngleAxis({
  tick = { fill: "var(--color-muted)", fontSize: 12 },
  tickLine = false,
  reversed = false,
  scale = "auto",
  ...props
}: Omit<
  ComponentProps<typeof RechartsPolarAngleAxis>,
  "ref" | "reversed" | "scale"
> &
  Partial<
    Pick<ComponentProps<typeof RechartsPolarAngleAxis>, "reversed" | "scale">
  >) {
  return (
    <RechartsPolarAngleAxis
      tick={tick}
      tickLine={tickLine}
      reversed={reversed}
      scale={scale}
      {...props}
    />
  );
}
function PolarRadiusAxis({
  tick = { fill: "var(--color-muted)", fontSize: 12 },
  tickLine = false,
  axisLine = false,
  ...props
}: Omit<ComponentProps<typeof RechartsPolarRadiusAxis>, "ref">) {
  return (
    <RechartsPolarRadiusAxis
      tick={tick}
      tickLine={tickLine}
      axisLine={axisLine}
      {...props}
    />
  );
}
EvilRadarChart.Radar = Radar;
EvilRadarChart.PolarGrid = PolarGrid;
EvilRadarChart.PolarAngleAxis = PolarAngleAxis;
EvilRadarChart.PolarRadiusAxis = PolarRadiusAxis;
EvilRadarChart.Tooltip = Tooltip;
