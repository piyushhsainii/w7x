/** @license MIT — EvilCharts, Copyright (c) 2026 Gurbinder.
 * Adapted chart configuration/container boundary. See UPSTREAM.md and public/licenses/evilcharts-MIT.txt.
 */
import { type CSSProperties, type ReactElement } from "react";
import { ResponsiveContainer } from "recharts";

export type ChartConfig = Record<
  string,
  { label: string; colors: readonly string[] }
>;
export function ChartContainer({
  config,
  children,
}: {
  config: ChartConfig;
  children: ReactElement;
}) {
  const variables: Record<string, string> = {};
  Object.entries(config).forEach(([key, entry]) =>
    entry.colors.forEach((color, index) => {
      variables[`--color-${key}-${index}`] = color;
    }),
  );
  return (
    <div className="evil-chart" style={variables as CSSProperties}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}
