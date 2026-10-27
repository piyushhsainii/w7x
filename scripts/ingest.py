"""Download only the assignment's two Elexon datasets and build an immutable snapshot.

Run from repository root: python scripts/ingest.py
Cached gzip responses are reused. --refresh explicitly re-downloads public data.
The existing database is replaced only after a complete successful import.
"""
from __future__ import annotations

import argparse
import gzip
import hashlib
import json
import math
import sqlite3
import time
from contextlib import closing
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
BASE = "https://data.elexon.co.uk/bmrs/api/v1/datasets/"
UTC = timezone.utc


def stamp(value: str) -> str:
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        raise ValueError("Source timestamp must include timezone")
    return parsed.astimezone(UTC).isoformat(timespec="seconds").replace("+00:00", "Z")


def days(start: date, end: date):
    while start <= end:
        yield start
        start += timedelta(days=1)


def fetch(dataset: str, day: date, refresh: bool) -> tuple[list, dict]:
    cache = ROOT / "data" / "raw" / f"{dataset}-{day.isoformat()}.json.gz"
    meta = cache.with_suffix(".meta.json")
    if dataset == "WINDFOR":
        params = {"publishDateTimeFrom": f"{day}T00:00:00Z",
                  "publishDateTimeTo": f"{day + timedelta(days=1)}T00:00:00Z"}
    else:
        params = {"settlementDateFrom": str(day), "settlementDateTo": str(day), "fuelType": "WIND"}
    url = BASE + dataset + "/stream?" + urlencode(params)
    if cache.exists() and meta.exists() and not refresh:
        payload = gzip.decompress(cache.read_bytes())
        details = json.loads(meta.read_text())
        if hashlib.sha256(payload).hexdigest() != details["sha256"]:
            raise ValueError(f"Cached response checksum mismatch: {cache.name}")
    else:
        for attempt in range(4):
            try:
                request = Request(url, headers={"User-Agent": "WindPilot/1.0", "Accept": "application/json"})
                with urlopen(request, timeout=60) as response:
                    payload = response.read(12_000_001)
                if len(payload) > 12_000_000:
                    raise ValueError("Unexpectedly large upstream response")
                break
            except (HTTPError, URLError, TimeoutError) as exc:
                if isinstance(exc, HTTPError) and exc.code not in (429, 500, 502, 503, 504):
                    raise
                if attempt == 3:
                    raise
                time.sleep(2 ** attempt)
        details = {"url": url, "retrieved_at": datetime.now(UTC).isoformat(),
                   "sha256": hashlib.sha256(payload).hexdigest(), "file": cache.name}
        cache.write_bytes(gzip.compress(payload, mtime=0))
        meta.write_text(json.dumps(details, indent=2), encoding="utf-8")
    result = json.loads(payload)
    if not isinstance(result, list) or not result:
        raise ValueError(f"Missing or invalid source response: {dataset} {day}")
    details["rows"] = len(result)
    return result, details


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--refresh", action="store_true")
    args = parser.parse_args()
    (ROOT / "data" / "raw").mkdir(parents=True, exist_ok=True)
    forecasts, actuals, sources = {}, {}, []
    identical_duplicates = 0
    for dataset, start, end in [("WINDFOR", date(2025, 12, 30), date(2026, 1, 31)),
                                ("FUELHH", date(2026, 1, 2), date(2026, 2, 1))]:
        for day in days(start, end):
            rows, details = fetch(dataset, day, args.refresh)
            sources.append(details)
            for row in rows:
                if dataset == "FUELHH" and row.get("fuelType") != "WIND":
                    continue
                target, published = stamp(row["startTime"]), stamp(row["publishTime"])
                value = float(row["generation"])
                if not math.isfinite(value) or value < 0:
                    raise ValueError(f"Invalid wind generation at {target}")
                key = target, published
                dest = forecasts if dataset == "WINDFOR" else actuals
                if key in dest:
                    if dest[key] != value:
                        raise ValueError(f"Conflicting duplicate {dataset} {key}")
                    identical_duplicates += 1
                dest[key] = value
            print(f"{dataset} {day}: {len(rows)} rows", flush=True)
    tmp = ROOT / "data" / "wind.tmp.sqlite"
    with closing(sqlite3.connect(tmp)) as conn:
        conn.executescript("""
            DROP TABLE IF EXISTS forecasts;
            DROP TABLE IF EXISTS actuals;
            CREATE TABLE forecasts(start_time TEXT NOT NULL, publish_time TEXT NOT NULL,
                generation REAL NOT NULL CHECK(generation >= 0), PRIMARY KEY(start_time, publish_time));
            CREATE TABLE actuals(start_time TEXT NOT NULL, publish_time TEXT NOT NULL,
                generation REAL NOT NULL CHECK(generation >= 0), PRIMARY KEY(start_time, publish_time));
            CREATE INDEX forecasts_publish ON forecasts(publish_time);
        """)
        conn.executemany("INSERT INTO forecasts VALUES(?,?,?)", [(t, p, g) for (t, p), g in forecasts.items()])
        conn.executemany("INSERT INTO actuals VALUES(?,?,?)", [(t, p, g) for (t, p), g in actuals.items()])
        conn.execute("PRAGMA integrity_check").fetchone()
        conn.commit()
    tmp.replace(ROOT / "data" / "wind.sqlite")
    manifest = {"source": "Elexon Insights", "mode": "historical-replay", "synthetic": False,
                "decision_start": "2026-01-01", "decision_end": "2026-01-31",
                "delivery_start": "2026-01-02", "delivery_end": "2026-02-01",
                "built_at": datetime.now(UTC).isoformat(), "forecast_rows": len(forecasts),
                "actual_rows": len(actuals), "identical_duplicates_removed": identical_duplicates,
                "database_sha256": hashlib.sha256((ROOT / "data" / "wind.sqlite").read_bytes()).hexdigest(),
                "alignment": "Exact startTime match; no interpolation or resampling",
                "sources": sources}
    (ROOT / "data" / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"Complete: {len(forecasts)} forecast versions; {len(actuals)} actual versions", flush=True)


if __name__ == "__main__":
    main()
