// Local QA instrumentation, injected before the app bundle; never deployed.
(() => {
  const counts = {};
  let rootRenders = 0;
  let shifts = 0;
  let checks = [];
  let pending = null;
  let chart = null;
  let table = null;
  const profiles = [];
  const originalFetch = window.fetch;
  function output() {
    const panel = document.getElementById("audit-results");
    if (panel)
      panel.textContent = JSON.stringify(
        {
          counts,
          rootRenders,
          layoutShiftSum: shifts,
          profiles,
          toggleChecks: checks,
        },
        null,
        2,
      );
  }
  window.fetch = function (input, init) {
    const url = String(input);
    if (url.startsWith("/api/")) {
      counts[url] = (counts[url] || 0) + 1;
      output();
    }
    return originalFetch.call(this, input, init);
  };
  document.addEventListener("aer:app-render", () => {
    rootRenders++;
    output();
  });
  document.addEventListener("aer:profile", (event) => {
    profiles.push(event.detail);
    output();
  });
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        shifts += entry.value;
      }
      output();
    }).observe({ type: "layout-shift", buffered: true });
  } catch {}
  function measure() {
    const boxes = {};
    for (const selector of [
      ".forecast-chart",
      ".context-panel",
      ".audit-panel",
      ".kpi-grid",
      ".integrity-panel",
    ]) {
      const node = document.querySelector(selector);
      if (node) {
        const r = node.getBoundingClientRect();
        boxes[selector] = {
          top: Math.round(r.top + scrollY),
          height: Math.round(r.height),
          width: Math.round(r.width),
        };
      }
    }
    return {
      scrollY,
      url: location.href,
      boxes,
      rootRenders,
      layoutShiftSum: shifts,
      profileCount: profiles.length,
      calls: Object.values(counts).reduce((a, b) => a + b, 0),
      axis: document.querySelector(".recharts-yAxis")?.textContent,
    };
  }
  document.addEventListener(
    "click",
    (event) => {
      if (event.target.closest(".outcome-button")) {
        pending = measure();
        chart = document.querySelector(".recharts-wrapper");
        table = document.querySelector(".decision-audit-table,table");
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            const next = measure();
            checks.push({
              before: pending,
              after: next,
              sameChart: chart === document.querySelector(".recharts-wrapper"),
              sameTable:
                table === document.querySelector(".decision-audit-table,table"),
            });
            output();
          }),
        );
      }
    },
    true,
  );
  document.addEventListener("DOMContentLoaded", () => {
    const details = document.createElement("details");
    details.id = "audit-panel";
    details.style.cssText =
      "margin:20px;padding:12px;background:#fff;color:#111;font:12px monospace";
    const summary = document.createElement("summary");
    summary.textContent = "Local performance audit";
    details.append(summary);
    const panel = document.createElement("pre");
    panel.id = "audit-results";
    details.append(panel);
    document.body.append(details);
    output();
  });
})();
