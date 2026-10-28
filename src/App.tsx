import { useEffect, useState } from "react";
import {
  BookOpenText,
  CalendarClock,
  ChevronRight,
  History,
  Target,
} from "lucide-react";
import { setOutcome } from "./outcome";
import { dateLabel, shiftDate, validClock, validDay } from "./format";
import { SnapshotSubscriptions, useMetaQuery } from "./query";
import AccuracyView from "./components/AccuracyView";
import DecisionView from "./components/DecisionView";
import MethodView from "./components/MethodView";
import Sidebar from "./components/Sidebar";
import TopbarControls, { WorkspaceRefresh } from "./components/TopbarControls";
import { Hint, Icon } from "./components/ui";

type View = "decision" | "accuracy" | "method";

export default function App() {
  // Compile-time diagnostic only; removed from ordinary production builds.
  useEffect(() => {
    if (import.meta.env.DEV || import.meta.env.MODE === "audit") {
      document.dispatchEvent(new Event("aer:app-render"));
    }
  });
  const [view, setView] = useState<View>("decision");
  const [day, setDay] = useState("2026-01-15");
  const [cutoff, setCutoff] = useState(() => {
    const saved = new URLSearchParams(window.location.search).get("cutoff");
    return saved && validClock(saved) ? saved : "09:30";
  });
  const [draftDay, setDraftDay] = useState(day);
  const [draftCutoff, setDraftCutoff] = useState(cutoff);
  const [start, setStart] = useState("2026-01-01");
  const [end, setEnd] = useState("2026-01-31");
  const [draftStart, setDraftStart] = useState(start);
  const [draftEnd, setDraftEnd] = useState(end);
  const [filterError, setFilterError] = useState("");
  const { data: meta } = useMetaQuery();
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("cutoff", cutoff);
    // Replace the UI preference in place; never navigate or reset scroll.
    if (url.href !== window.location.href)
      window.history.replaceState(window.history.state, "", url);
  }, [cutoff]);
  const navigation = [
    { id: "decision" as const, label: "Decision desk", icon: CalendarClock },
    { id: "accuracy" as const, label: "Forecast accuracy", icon: Target },
    { id: "method" as const, label: "Methodology", icon: BookOpenText },
  ];
  // Only UI timing changes: the same endpoint, parameter values, and backend rules apply.
  useEffect(() => {
    if (view === "method") return;
    const timer = window.setTimeout(() => {
      if (!validClock(draftCutoff)) {
        setFilterError("Enter a valid cutoff between 00:00 and 23:59 GMT.");
        return;
      }
      if (view === "decision") {
        if (!validDay(draftDay)) {
          setFilterError("Choose a decision date in January 2026.");
          return;
        }
        if (day !== draftDay || cutoff !== draftCutoff) {
          setDay(draftDay);
          setCutoff(draftCutoff);
          setOutcome(`${draftDay}|${draftCutoff}`, false);
        }
      } else {
        if (!validDay(draftStart) || !validDay(draftEnd)) {
          setFilterError("Choose January 2026 decision dates.");
          return;
        }
        if (draftStart > draftEnd) {
          setFilterError("Start date must be before or equal to end date.");
          return;
        }
        setStart(draftStart);
        setEnd(draftEnd);
        setCutoff(draftCutoff);
      }
      setFilterError("");
    }, 300);
    return () => window.clearTimeout(timer);
  }, [view, draftDay, draftCutoff, draftStart, draftEnd, day, cutoff]);

  const changeDay = (value: string) => {
    if (!validDay(value)) return;
    setDraftDay(value);
  };
  useEffect(() => {
    if (view !== "decision") return;
    const onKey = (event: KeyboardEvent) => {
      if (!validDay(draftDay)) return;
      const target = event.target as HTMLElement;
      if (
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        target.closest(
          "input,textarea,select,[contenteditable],svg,[role=button],[role=application],[role=dialog],table",
        )
      )
        return;
      if (event.key === "ArrowLeft" && draftDay !== "2026-01-01") {
        event.preventDefault();
        changeDay(shiftDate(draftDay, -1));
      }
      if (event.key === "ArrowRight" && draftDay !== "2026-01-31") {
        event.preventDefault();
        changeDay(shiftDate(draftDay, 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [view, draftDay]);

  const navigate = (next: View) => {
    setView(next);
    setFilterError("");
    window.scrollTo({ top: 0, behavior: "auto" });
  };
  const inspect = (selected: string) => {
    setDay(selected);
    setDraftDay(selected);
    setOutcome(`${selected}|${cutoff}`, true);
    navigate("decision");
  };
  const title =
    view === "decision"
      ? `Wind forecast for ${dateLabel(shiftDate(day, 1))}`
      : view === "accuracy"
        ? `How accurate were ${cutoff} forecasts in January?`
        : "How forecasts are selected and scored";
  const subtitle =
    view === "decision"
      ? `As known at ${cutoff} GMT on ${dateLabel(day)}`
      : view === "accuracy"
        ? "Compare decision-time wind forecasts with actual generation and quantify the size and direction of error."
        : "Publication timing, exact timestamp matching, error definitions, and the limits of this pilot.";
  return (
    <div className={`app-shell workspace-${view}`}>
      <SnapshotSubscriptions
        day={day}
        cutoff={cutoff}
        start={start}
        end={end}
      />
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Sidebar items={navigation} active={view} onNavigate={navigate} />
      <div className="main-column">
        <header className="topbar">
          <span className="breadcrumb">
            <span className="breadcrumb-root">Workspace</span>
            <Icon icon={ChevronRight} size={18} />
            <strong>{navigation.find((n) => n.id === view)?.label}</strong>
          </span>
          <div className="topbar-actions">
            {view !== "method" && (
              <>
                <TopbarControls
                  view={view}
                  day={draftDay}
                  cutoff={draftCutoff}
                  start={draftStart}
                  end={draftEnd}
                  changeDay={setDraftDay}
                  changeCutoff={setDraftCutoff}
                  changeStart={setDraftStart}
                  changeEnd={setDraftEnd}
                />
                <WorkspaceRefresh
                  view={view}
                  day={day}
                  cutoff={cutoff}
                  start={start}
                  end={end}
                />
              </>
            )}
            <span className="replay-badge">
              <Hint
                label="Historical replay: replay of past data, not live"
                text="Replay of past data, not live."
              >
                <Icon icon={History} size={18} />
                <span>Historical replay</span>
              </Hint>
            </span>
          </div>
        </header>
        <main id="main" tabIndex={-1}>
          <div className="page-heading">
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
          {view !== "method" && filterError && (
            <p className="filter-error" role="alert">
              {filterError}
            </p>
          )}
          {view === "decision" ? (
            <DecisionView
              day={day}
              cutoff={cutoff}
              openAccuracy={() => navigate("accuracy")}
            />
          ) : view === "accuracy" ? (
            <AccuracyView
              cutoff={cutoff}
              start={start}
              end={end}
              inspect={inspect}
            />
          ) : (
            <MethodView meta={meta ?? null} cutoff={cutoff} />
          )}
          <footer className="footer">
            <span>aer. · Wind forecast decision support</span>
            <span>Great Britain · January 2026 historical pilot</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
