import math
import sqlite3
from datetime import date

import pytest

from backend.analysis import decision_cutoff, iso, metrics, percentile, select_day, summarize


@pytest.fixture
def conn():
    db = sqlite3.connect(":memory:")
    db.executescript("""
        CREATE TABLE forecasts(start_time TEXT, publish_time TEXT, generation REAL);
        CREATE TABLE actuals(start_time TEXT, publish_time TEXT, generation REAL);
    """)
    yield db
    db.close()


def test_worked_example():
    rows = [{"forecast_mw": f, "actual_mw": a} for f, a in [(1000, 800), (1200, 1300), (800, 900)]]
    result = metrics(rows)
    assert result["mae_mw"] == pytest.approx(133.333, abs=.001)
    assert result["rmse_mw"] == pytest.approx(math.sqrt(20000), abs=.001)
    assert result["bias_mw"] == 0
    assert result["wape_pct"] == pytest.approx(13.333, abs=.001)


def test_missing_values_are_not_zero():
    result = metrics([{"forecast_mw": None, "actual_mw": 1200},
                      {"forecast_mw": 1000, "actual_mw": None},
                      {"forecast_mw": 0, "actual_mw": 100}])
    assert result["count"] == 1
    assert result["bias_mw"] == -100


def test_zero_total_actual_undefined_wape():
    assert metrics([{"forecast_mw": 100, "actual_mw": 0}])["wape_pct"] is None


def test_empty_metrics_are_not_perfect_accuracy():
    assert metrics([])["mae_mw"] is None
    assert metrics([])["count"] == 0


def test_percentile_linear_interpolation():
    assert percentile([0, 100], .9) == 90
    assert percentile([], .9) is None


def test_cutoff_inclusive_and_latest_per_target(conn):
    conn.executemany("INSERT INTO forecasts VALUES(?,?,?)", [
        ("2026-01-02T00:00:00Z", "2026-01-01T07:30:00Z", 1000),
        ("2026-01-02T00:00:00Z", "2026-01-01T09:30:00Z", 1200),
        ("2026-01-02T00:00:00Z", "2026-01-01T09:30:01Z", 1400),
        ("2026-01-02T01:00:00Z", "2026-01-01T07:30:00Z", 1800),
        ("2026-01-02T01:00:00Z", "2026-01-02T00:00:00Z", 1900),
    ])
    result = select_day(conn, date(2026, 1, 1), "09:30")
    assert result["rows"][0]["forecast_mw"] == 1200
    assert result["rows"][2]["forecast_mw"] == 1800
    assert result["rows"][1]["forecast_mw"] is None
    assert result["forecast_count"] == 2
    assert len(result["rows"]) == 48


def test_actual_asof_excludes_later_publications(conn):
    conn.executemany("INSERT INTO actuals VALUES(?,?,?)", [
        ("2026-01-02T00:00:00Z", "2026-01-02T00:30:00Z", 700),
        ("2026-01-02T00:00:00Z", "2026-01-03T00:00:00Z", 900),
    ])
    past = select_day(conn, date(2026, 1, 1), "09:30", "2026-01-02T09:30:00Z")
    retrospective = select_day(conn, date(2026, 1, 1), "09:30")
    assert past["rows"][0]["actual_mw"] == 700
    assert retrospective["rows"][0]["actual_mw"] == 900


def test_exact_match_does_not_duplicate_hourly_forecast(conn):
    conn.execute("INSERT INTO forecasts VALUES(?,?,?)", ("2026-01-02T00:00:00Z", "2026-01-01T07:30:00Z", 1000))
    conn.executemany("INSERT INTO actuals VALUES(?,?,?)", [
        ("2026-01-02T00:00:00Z", "2026-01-02T00:30:00Z", 800),
        ("2026-01-02T00:30:00Z", "2026-01-02T01:00:00Z", 9999)])
    result = select_day(conn, date(2026, 1, 1), "09:30")
    assert result["metrics"]["count"] == 1
    assert result["metrics"]["mae_mw"] == 200
    assert result["rows"][1]["forecast_mw"] is None


def test_january_31_delivers_february_1(conn):
    result = select_day(conn, date(2026, 1, 31), "09:30")
    assert result["delivery_date"] == "2026-02-01"
    assert result["rows"][0]["start_time"] == "2026-02-01T00:00:00Z"
    assert result["rows"][-1]["start_time"] == "2026-02-01T23:30:00Z"


def test_uk_cutoff_is_timezone_aware():
    assert iso(decision_cutoff(date(2026, 1, 1), "09:30")) == "2026-01-01T09:30:00Z"


def test_pooled_mae_weights_observations(conn):
    conn.executemany("INSERT INTO forecasts VALUES(?,?,?)", [
        ("2026-01-02T00:00:00Z", "2026-01-01T07:30:00Z", 100),
        ("2026-01-03T00:00:00Z", "2026-01-02T07:30:00Z", 300),
        ("2026-01-03T01:00:00Z", "2026-01-02T07:30:00Z", 300)])
    conn.executemany("INSERT INTO actuals VALUES(?,?,?)", [
        ("2026-01-02T00:00:00Z", "2026-01-02T00:30:00Z", 0),
        ("2026-01-03T00:00:00Z", "2026-01-03T00:30:00Z", 0),
        ("2026-01-03T01:00:00Z", "2026-01-03T01:30:00Z", 0)])
    assert summarize(conn, date(2026, 1, 1), date(2026, 1, 2), "09:30")["metrics"]["mae_mw"] == pytest.approx(233.333, abs=.001)
