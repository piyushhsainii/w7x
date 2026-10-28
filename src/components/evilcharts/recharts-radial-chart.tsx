/** @license MIT — EvilCharts, Copyright (c) 2026 Gurbinder.
 * Selected radial root/series/gradient parts adapted from revision
 * 8b9c26d1f6b21033506f0cc8017e7940c7c26ad4. See UPSTREAM.md.
 */
import { useId, useMemo, type ComponentProps, type ReactNode } from "react";
import {
  PolarAngleAxis,
  RadialBar as RechartsRadialBar,
  RadialBarChart as RechartsRadialBarChart,
} from "recharts";
import { ChartContainer, type ChartConfig } from "./chart-container";

export function EvilRadialChart<T extends Record<string, unknown>>({
  config,
  data,
  nameKey,
  children,
  max,
  variant = "full",
  innerRadius = "30%",
  outerRadius = "100%",
  chartProps,
}: {
  config: ChartConfig;
  data: T[];
  nameKey: keyof T & string;
  children: ReactNode;
  max?: number;
  variant?: "full" | "semi";
  innerRadius?: number | string;
  outerRadius?: number | string;
  chartProps?: Omit<
    ComponentProps<typeof RechartsRadialBarChart>,
    "data" | "children"
  >;
}) {
  const chartId = useId().replace(/:/g, "");
  const preparedData = useMemo(
    () =>
      data.map((item) => ({
        ...item,
        fill: `url(#${chartId}-radial-colors-${item[nameKey] as string})`,
      })),
    [data, nameKey, chartId],
  );
  const angles =
    variant === "semi"
      ? { startAngle: 180, endAngle: 0, cx: "50%", cy: "70%" }
      : { startAngle: 90, endAngle: -270, cx: "50%", cy: "50%" };
  return (
    <ChartContainer config={config}>
      <RechartsRadialBarChart
        id={chartId}
        data={preparedData}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        {...angles}
        {...chartProps}
      >
        {max != null && max > 0 && (
          <PolarAngleAxis
            type="number"
            domain={[0, max]}
            tick={false}
            axisLine={false}
          />
        )}
        {children}
        <defs>
          {Object.entries(config).map(([key, entry]) => (
            <linearGradient
              key={key}
              id={`${chartId}-radial-colors-${key}`}
              x1="0"
              y1="0"
              x2="1"
              y2="1"
            >
              {Array.from(
                { length: Math.max(2, entry.colors.length) },
                (_, index) => (
                  <stop
                    key={index}
                    offset={`${(index / (Math.max(2, entry.colors.length) - 1)) * 100}%`}
                    stopColor={`var(--color-${key}-${Math.min(index, entry.colors.length - 1)})`}
                  />
                ),
              )}
            </linearGradient>
          ))}
        </defs>
      </RechartsRadialBarChart>
    </ChartContainer>
  );
}
function RadialBar({
  dataKey,
  cornerRadius = 5,
  barSize = 14,
  showBackground = true,
  radialBarProps,
}: {
  dataKey: string;
  cornerRadius?: number;
  barSize?: number;
  showBackground?: boolean;
  radialBarProps?: Omit<ComponentProps<typeof RechartsRadialBar>, "dataKey">;
}) {
  return (
    <RechartsRadialBar
      dataKey={dataKey}
      cornerRadius={cornerRadius}
      barSize={barSize}
      background={showBackground}
      isAnimationActive={false}
      {...radialBarProps}
    />
  );
}
EvilRadialChart.RadialBar = RadialBar;
