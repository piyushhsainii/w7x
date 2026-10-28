"""Read-only API for a reproducible January 2026 Elexon pilot."""
from __future__ import annotations

import csv
import hashlib
import io
import json
import logging
import sqlite3
from contextlib import contextmanager
from datetime import date, timedelta
from functools import lru_cache
from pathlib import Path
from typing import Annotated

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles

from backend.analysis import FIRST_DAY, LAST_DAY, decision_cutoff, iso, select_day, summarize

ROOT = Path(__file__).resolve().parents[1]
CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'"
app = FastAPI(title="Aer Wind Intelligence", version="1.0.0", docs_url="/api/docs", openapi_url="/api/openapi.json", redoc_url=None)
Clock = Annotated[str, Query(pattern=r"^(?:[01][0-9]|2[0-3]):[0-5][0-9]$")]


@lru_cache(maxsize=1)
def manifest() -> dict:
    content = json.loads((ROOT / "data/manifest.json").read_text(encoding="utf-8"))
    digest = hashlib.sha256((ROOT / "data/wind.sqlite").read_bytes()).hexdigest()
    if digest != content["database_sha256"]:
        raise RuntimeError("Snapshot checksum mismatch")
    return content


@contextmanager
def connect():
    manifest()
    conn = sqlite3.connect((ROOT / "data/wind.sqlite").as_uri() + "?mode=ro&immutable=1", uri=True)
    try:
        yield conn
    finally:
        conn.close()


def validate_date(day: date):
    if not FIRST_DAY <= day <= LAST_DAY:
        raise HTTPException(422, "Decision dates must be in January 2026.")


@app.middleware("http")
async def security_headers(request: Request, call_next):
    try:
        response = await call_next(request)
    except Exception:
        logging.exception("Request failed")
        response = Response('{"detail":"Data temporarily unavailable. Check the snapshot and server logs."}', status_code=503, media_type="application/json")
    cache_paths = {"/api/meta", "/api/health", "/api/decision", "/api/accuracy", "/api/export", "/api/accuracy/export"}
    if request.method == "GET" and request.url.path in cache_paths and response.status_code == 200:
        body = b"".join([chunk async for chunk in response.body_iterator])
        etag = '"' + hashlib.sha256(body).hexdigest() + '"'
        headers = dict(response.headers)
        headers.update({"Cache-Control": "public, max-age=300, stale-while-revalidate=600", "ETag": etag})
        candidates = [value.strip().removeprefix("W/") for value in request.headers.get("if-none-match", "").split(",")]
        if etag in candidates or "*" in candidates:
            headers.pop("content-length", None)
            response = Response(status_code=304, headers=headers, background=response.background)
        else:
            response = Response(body, status_code=response.status_code, headers=headers, background=response.background)
    response.headers.update({"X-Content-Type-Options": "nosniff", "X-Frame-Options": "DENY",
                             "Referrer-Policy": "strict-origin-when-cross-origin",
                             "Permissions-Policy": "camera=(), microphone=(), geolocation=()"})
    # Swagger's own third-party assets are deliberately excluded from the application CSP.
    if request.url.path not in ("/api/docs", "/api/docs/oauth2-redirect"):
        response.headers["Content-Security-Policy"] = CSP
    return response


@app.get("/api/health")
def health():
    details = manifest()
    return {"status": "ok", "mode": "historical-replay", "synthetic": False,
            "database_sha256": details["database_sha256"]}


@app.get("/api/meta")
def metadata():
    details = manifest()
    return {**{k: v for k, v in details.items() if k != "sources"},
            "source_requests": len(details["sources"]),
            "retrieved_at": max(s["retrieved_at"] for s in details["sources"]),
            "default_decision_date": "2026-01-15", "default_cutoff": "09:30",
            "notice": "Historical replay, not a live feed or trade recommendation.",
            "native_resolution": "Hourly WINDFOR; half-hourly FUELHH. Exact timestamp matching.",
            "actual_vintage": "Latest actual publication retrieved in the immutable snapshot."}


@lru_cache(maxsize=256)
def decision_data(day: date, clock: str, reveal: bool) -> dict:
    with connect() as conn:
        result = select_day(conn, day, clock)
        if day > FIRST_DAY:
            history = summarize(conn, FIRST_DAY, day - timedelta(days=1), clock,
                                actual_as_of=iso(decision_cutoff(day, clock)))
            result["prior_performance"] = {"start": history["start"], "end": history["end"],
                                            "metrics": history["metrics"],
                                            "available_as_of": result["cutoff"]}
        else:
            result["prior_performance"] = None
    if not reveal:
        for row in result["rows"]:
            row.update(actual_mw=None, actual_publish_time=None, error_mw=None)
        result["metrics"] = None
        result["actual_count"] = None
    result["outcome_revealed"] = reveal
    return result


@app.get("/api/decision")
def decision(decision_date: date = date(2026, 1, 15), cutoff: Clock = "09:30", reveal: bool = False):
    validate_date(decision_date)
    return decision_data(decision_date, cutoff, reveal)


@lru_cache(maxsize=128)
def accuracy_data(start: date, end: date, cutoff: str) -> dict:
    with connect() as conn:
        return summarize(conn, start, end, cutoff)


@app.get("/api/accuracy")
def accuracy(start: date = FIRST_DAY, end: date = LAST_DAY, cutoff: Clock = "09:30"):
    validate_date(start)
    validate_date(end)
    if start > end:
        raise HTTPException(422, "Start date must not be after end date.")
    return accuracy_data(start, end, cutoff)


@app.get("/api/export")
def export(decision_date: date = date(2026, 1, 15), cutoff: Clock = "09:30", reveal: bool = False):
    validate_date(decision_date)
    result = decision_data(decision_date, cutoff, reveal)
    output = io.StringIO(newline="")
    columns = ["decision_date", "cutoff_utc", "delivery_date", "start_time", "forecast_mw", "publish_time",
               "forecast_age_hours", "lead_time_hours", "actual_mw", "actual_publish_time", "error_mw"]
    writer = csv.DictWriter(output, fieldnames=columns, extrasaction="ignore", lineterminator="\n")
    writer.writeheader()
    for row in result["rows"]:
        writer.writerow({"decision_date": str(decision_date), "cutoff_utc": result["cutoff"],
                         "delivery_date": result["delivery_date"], **row})
    return Response(output.getvalue(), media_type="text/csv", headers={
        "Content-Disposition": f'attachment; filename="wind-{decision_date}-{cutoff.replace(":", "")}.csv"'})


@app.get("/api/accuracy/export")
def export_accuracy(start: date = FIRST_DAY, end: date = LAST_DAY, cutoff: Clock = "09:30"):
    summary = accuracy(start, end, cutoff)
    output = io.StringIO(newline="")
    columns = list(summary["days"][0])
    writer = csv.DictWriter(output, fieldnames=columns, lineterminator="\n")
    writer.writeheader()
    writer.writerows(summary["days"])
    return Response(output.getvalue(), media_type="text/csv", headers={
        "Content-Disposition": f'attachment; filename="accuracy-{start}-{end}.csv"'})


if (ROOT / "dist/assets").exists():
    app.mount("/assets", StaticFiles(directory=ROOT / "dist/assets"), name="assets")


@app.get("/favicon.svg", include_in_schema=False)
def favicon():
    return FileResponse(ROOT / "public/favicon.svg")


@app.get("/", include_in_schema=False)
def frontend():
    index = ROOT / "dist/index.html"
    if not index.exists():
        raise HTTPException(503, "Frontend not built. Run npm run build or use the Vite dev server.")
    return FileResponse(index)
