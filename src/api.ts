export type Metrics = {
  count: number;
  mae_mw: number | null;
  rmse_mw: number | null;
  bias_mw: number | null;
  wape_pct: number | null;
  p90_absolute_error_mw: number | null;
  overforecast_pct: number | null;
  mean_overforecast_mw: number | null;
};
export type Interval = {
  start_time: string;
  label: string;
  forecast_mw: number | null;
  publish_time: string | null;
  forecast_age_hours: number | null;
  lead_time_hours: number | null;
  actual_mw: number | null;
  actual_publish_time: string | null;
  error_mw: number | null;
};
export type Decision = {
  decision_date: string;
  delivery_date: string;
  cutoff: string;
  cutoff_clock: string;
  rows: Interval[];
  forecast_count: number;
  actual_count: number | null;
  settlement_count: number;
  expected_native_points: number;
  forecast_coverage_pct: number;
  settlement_coverage_pct: number;
  mean_forecast_mw: number | null;
  peak_forecast_mw: number | null;
  min_forecast_mw: number | null;
  publish_times: string[];
  oldest_age_hours: number | null;
  metrics: Metrics | null;
  outcome_revealed: boolean;
  prior_performance: {
    start: string;
    end: string;
    metrics: Metrics;
    available_as_of: string;
  } | null;
};
export type DayScore = Metrics & {
  decision_date: string;
  delivery_date: string;
  forecast_count: number;
  actual_count: number;
};
export type Accuracy = {
  start: string;
  end: string;
  cutoff_clock: string;
  metrics: Metrics;
  days: DayScore[];
  decision_days: number;
  expected_native_points: number;
  selected_forecasts: number;
  settlement_points: number;
  missing_actual_at_forecast: number;
  missing_native_forecasts: number;
};
export type Meta = {
  retrieved_at: string;
  database_sha256: string;
  forecast_rows: number;
  actual_rows: number;
  synthetic: boolean;
  source_requests: number;
};
export async function getJson<T>(
  path: string,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(path, {
    signal,
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(
      typeof body?.detail === "string"
        ? body.detail
        : `Unable to load data (${response.status}). Please retry.`,
    );
  }
  return response.json();
}
