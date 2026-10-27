import csv
import io
from datetime import datetime

import pytest
from fastapi.testclient import TestClient

from backend.main import app

client = TestClient(app)


def test_health_checks_real_snapshot():
    result = client.get("/api/health")
    assert result.status_code == 200
    assert result.json()["synthetic"] is False
    assert len(result.json()["database_sha256"]) == 64


@pytest.mark.parametrize("query", ["decision_date=2026-02-01", "decision_date=2025-12-31", "cutoff=25:30", "cutoff=09:60", "cutoff=bad", "decision_date=2026-01-01%27%20OR%201=1"])
def test_invalid_parameters_rejected(query):
    assert client.get(f"/api/decision?{query}").status_code == 422


def test_hidden_outcome_is_not_sent_to_browser():
    result = client.get("/api/decision?decision_date=2026-01-15").json()
    assert result["metrics"] is None
    assert result["actual_count"] is None
    assert all(r["actual_mw"] is None and r["error_mw"] is None and r["actual_publish_time"] is None for r in result["rows"])
    assert result["forecast_count"] == 24


def test_reveal_and_cutoff_provenance():
    result = client.get("/api/decision?decision_date=2026-01-15&cutoff=09:30&reveal=true").json()
    assert result["metrics"]["count"] == 24
    assert all(r["publish_time"] <= result["cutoff"] for r in result["rows"] if r["publish_time"])
    assert len(result["rows"]) == 48
    assert result["settlement_coverage_pct"] == 50


def test_no_prior_history_on_first_day():
    result = client.get("/api/decision?decision_date=2026-01-01").json()
    assert result["prior_performance"] is None


def test_default_month_scores_and_boundaries():
    result = client.get("/api/accuracy").json()
    assert result["metrics"]["count"] == 744
    assert result["decision_days"] == 31
    assert result["days"][-1]["delivery_date"] == "2026-02-01"
    assert result["missing_actual_at_forecast"] == 0


def test_reversed_range_rejected():
    assert client.get("/api/accuracy?start=2026-01-20&end=2026-01-01").status_code == 422


def test_csv_obeys_hidden_outcome_and_has_provenance():
    response = client.get("/api/export")
    rows = list(csv.DictReader(io.StringIO(response.text)))
    assert len(rows) == 48
    assert all(r["actual_mw"] == "" for r in rows)
    assert rows[0]["cutoff_utc"].endswith("Z")
    assert "attachment" in response.headers["content-disposition"]


def test_accuracy_csv_has_same_scores():
    rows = list(csv.DictReader(io.StringIO(client.get("/api/accuracy/export").text)))
    assert len(rows) == 31
    assert float(rows[0]["mae_mw"]) == client.get("/api/accuracy").json()["days"][0]["mae_mw"]


def test_security_headers_and_readonly_api():
    response = client.get("/api/meta")
    assert response.headers["x-content-type-options"] == "nosniff"
    assert "frame-ancestors 'none'" in response.headers["content-security-policy"]
    assert "access-control-allow-origin" not in response.headers
    assert client.post("/api/decision").status_code == 405


def test_cache_does_not_leak_revealed_data_into_hidden_response():
    client.get("/api/decision?reveal=true")
    hidden = client.get("/api/decision?reveal=false").json()
    assert all(r["actual_mw"] is None for r in hidden["rows"])
