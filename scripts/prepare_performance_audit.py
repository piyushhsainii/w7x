"""Inject local-only fetch/layout instrumentation after `vite build --mode audit`.

Never use the resulting dist directory as a production artifact; a normal build
cleans it and removes both the instrumentation and React profiling bundle.
"""
from pathlib import Path

root = Path(__file__).resolve().parents[1]
dist = root / "dist"
asset = dist / "assets/performance-audit.js"
asset.write_text((root / "scripts/performance-audit.js").read_text(encoding="utf-8"), encoding="utf-8")
index = dist / "index.html"
html = index.read_text(encoding="utf-8")
if "performance-audit.js" not in html:
    html = html.replace("<head>", '<head><script src="/assets/performance-audit.js"></script>')
index.write_text(html, encoding="utf-8")
