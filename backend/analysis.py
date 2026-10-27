"""Pure, testable rules for forecast selection and quantitative evaluation."""
from __future__ import annotations

import math
import sqlite3
from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

LONDON = ZoneInfo("Europe/London")
FIRST_DAY, LAST_DAY = date(2026, 1, 1), date(2026, 1, 31)


def iso(value: datetime) -> str:
    return value.astimezone(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def decision_cutoff(day: date, clock: str) -> datetime:
    return datetime.combine(day, time.fromisoformat(clock), tzinfo=LONDON)


def percentile(values: list[float], q: float) -> float | None:
    if not values:
        return None
    ordered = sorted(values)
    index = (len(ordered) - 1) * q
    lo, hi = math.floor(index), math.ceil(index)
    return ordered[lo] + (ordered[hi] - ordered[lo]) * (index - lo)


def metrics(rows: list[dict]) -> dict:
    paired = [r for r in rows if r.get("forecast_mw") is not None and r.get("actual_mw") is not None]
    n = len(paired)
    keys = ("mae_mw", "rmse_mw", "bias_mw", "wape_pct", "p90_absolute_error_mw",
            "overforecast_pct", "mean_overforecast_mw")
    if not n:
        return {"count": 0, **dict.fromkeys(keys)}
    errors = [r["forecast_mw"] - r["actual_mw"] for r in paired]
    absolute = [abs(e) for e in errors]
    actual_total = sum(r["actual_mw"] for r in paired)
    over = [e for e in errors if e > 0]
    result = {"count": n, "mae_mw": sum(absolute) / n,
              "rmse_mw": math.sqrt(sum(e * e for e in errors) / n),
              "bias_mw": sum(errors) / n,
              "wape_pct": 100 * sum(absolute) / actual_total if actual_total > 0 else None,
              "p90_absolute_error_mw": percentile(absolute, .9),
              "overforecast_pct": 100 * len(over) / n,
              "mean_overforecast_mw": sum(over) / len(over) if over else 0.0}
    return {k: round(v, 3) if isinstance(v, float) else v for k, v in result.items()}


def select_day(conn: sqlite3.Connection, day: date, clock: str, actual_as_of: str | None = None) -> dict:
    """Each target independently gets its latest eligible published forecast.

    Actuals default to latest retrieved vintage (retrospective evaluation).
    actual_as_of is required when calculating information available to a replay.
    Missing forecasts/actuals remain None; never fabricate values.
    """
    cutoff = decision_cutoff(day, clock)
    delivery = day + timedelta(days=1)
    start = datetime.combine(delivery, time.min, tzinfo=LONDON)
    end = datetime.combine(delivery + timedelta(days=1), time.min, tzinfo=LONDON)
    lower, upper = iso(start), iso(end)
    forecasts = conn.execute("""
        SELECT start_time, publish_time, generation FROM (
          SELECT *, ROW_NUMBER() OVER(PARTITION BY start_time ORDER BY publish_time DESC) AS rank
          FROM forecasts WHERE start_time >= ? AND start_time < ? AND publish_time <= ?
        ) WHERE rank = 1 ORDER BY start_time
        """, (lower, upper, iso(cutoff))).fetchall()
    actuals = conn.execute("""
        SELECT start_time, publish_time, generation FROM (
          SELECT *, ROW_NUMBER() OVER(PARTITION BY start_time ORDER BY publish_time DESC) AS rank
          FROM actuals WHERE start_time >= ? AND start_time < ? AND publish_time <= ?
        ) WHERE rank = 1 ORDER BY start_time
        """, (lower, upper, actual_as_of or "9999")).fetchall()
    fmap = {r[0]: r for r in forecasts}
    amap = {r[0]: r for r in actuals}
    rows, cursor = [], start
    while cursor < end:
        target = iso(cursor)
        f, a = fmap.get(target), amap.get(target)
        forecast, actual = f[2] if f else None, a[2] if a else None
        rows.append({"start_time": target, "label": cursor.strftime("%H:%M"),
                     "forecast_mw": forecast, "publish_time": f[1] if f else None,
                     "forecast_age_hours": round((cutoff - datetime.fromisoformat(f[1].replace("Z", "+00:00"))).total_seconds() / 3600, 2) if f else None,
                     "lead_time_hours": round((cursor - datetime.fromisoformat(f[1].replace("Z", "+00:00"))).total_seconds() / 3600, 2) if f else None,
                     "actual_mw": actual, "actual_publish_time": a[1] if a else None,
                     "error_mw": forecast - actual if forecast is not None and actual is not None else None})
        cursor += timedelta(minutes=30)
    values = [r[2] for r in forecasts]
    publish_times = sorted({r[1] for r in forecasts})
    return {"decision_date": day.isoformat(), "delivery_date": delivery.isoformat(),
            "cutoff": iso(cutoff), "cutoff_clock": clock, "timezone": "Europe/London",
            "rows": rows, "forecast_count": len(forecasts), "actual_count": len(actuals),
            "settlement_count": len(rows), "expected_native_points": 24,
            "forecast_coverage_pct": round(100 * len(forecasts) / 24, 1),
            "settlement_coverage_pct": round(100 * len(forecasts) / len(rows), 1),
            "mean_forecast_mw": round(sum(values) / len(values), 2) if values else None,
            "peak_forecast_mw": max(values) if values else None,
            "min_forecast_mw": min(values) if values else None,
            "publish_times": publish_times,
            "oldest_age_hours": max((r["forecast_age_hours"] for r in rows if r["publish_time"]), default=None),
            "metrics": metrics(rows)}


def summarize(conn: sqlite3.Connection, start: date, end: date, clock: str,
              actual_as_of: str | None = None) -> dict:
    days, rows = [], []
    cursor = start
    while cursor <= end:
        result = select_day(conn, cursor, clock, actual_as_of)
        days.append({"decision_date": str(cursor), "delivery_date": result["delivery_date"],
                     "forecast_count": result["forecast_count"], "actual_count": result["actual_count"],
                     **result["metrics"]})
        rows.extend(result["rows"])
        cursor += timedelta(days=1)
    return {"start": str(start), "end": str(end), "cutoff_clock": clock,
            "metrics": metrics(rows), "days": days, "decision_days": len(days),
            "expected_native_points": len(days) * 24,
            "selected_forecasts": sum(d["forecast_count"] for d in days),
            "settlement_points": len(rows),
            "missing_actual_at_forecast": sum(r["forecast_mw"] is not None and r["actual_mw"] is None for r in rows),
            "missing_native_forecasts": sum(r["label"].endswith(":00") and r["forecast_mw"] is None for r in rows)}
