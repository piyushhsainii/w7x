import { useEffect, useState } from "react";
import {
  BookOpenText,
  CalendarClock,
  ChevronRight,
  Database,
  History,
  Target,
  Wind,
} from "lucide-react";
import type { Meta } from "./api";
import { dateLabel, shiftDate, validClock, validDay } from "./format";
import { useResource } from "./hooks";
import AccuracyView from "./components/AccuracyView";
import DecisionView from "./components/DecisionView";
import MethodView from "./components/MethodView";
import {
  CutoffField,
  DateField,
  ExportButton,
  Hint,
  Icon,
} from "./components/ui";

type View = "decision" | "accuracy" | "method";

export default function App() {
  const [view, setView] = useState<View>("decision");
  const [day, setDay] = useState("2026-01-15");
  const [cutoff, setCutoff] = useState("09:30");
  const [draftDay, setDraftDay] = useState(day);
  const [draftCutoff, setDraftCutoff] = useState(cutoff);
  const [start, setStart] = useState("2026-01-01");
  const [end, setEnd] = useState("2026-01-31");
  const [draftStart, setDraftStart] = useState(start);
  const [draftEnd, setDraftEnd] = useState(end);
  const [reveal, setReveal] = useState(false);
  const [filterError, setFilterError] = useState("");
  const { data: meta } = useResource<Meta>("/api/meta");
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
          setReveal(false);
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
    setDay(value);
    setDraftDay(value);
    setReveal(false);
  };
  useEffect(() => {
    if (view !== "decision") return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        target.closest(
          "input,textarea,select,[contenteditable],svg,[role=button],[role=application],table",
        )
      )
        return;
      if (event.key === "ArrowLeft" && day !== "2026-01-01") {
        event.preventDefault();
        changeDay(shiftDate(day, -1));
      }
      if (event.key === "ArrowRight" && day !== "2026-01-31") {
        event.preventDefault();
        changeDay(shiftDate(day, 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [view, day]);

  const navigate = (next: View) => {
    setView(next);
    setFilterError("");
    window.scrollTo({ top: 0, behavior: "auto" });
  };
  const inspect = (selected: string) => {
    setDay(selected);
    setDraftDay(selected);
    setReveal(true);
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
      ? `As known at ${cutoff} GMT on ${dateLabel(day)}. Review available wind and earlier forecast error before buying.`
      : view === "accuracy"
        ? "Compare decision-time wind forecasts with actual generation and quantify the size and direction of error."
        : "Publication timing, exact timestamp matching, error definitions, and the limits of this pilot.";
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          aria-label="Aer home"
          onClick={(e) => {
            e.preventDefault();
            navigate("decision");
          }}
        >
          <span className="brand-mark">
            <Icon icon={Wind} size={26} />
          </span>
          aer.
        </a>
        <div className="workspace-label">
          Wind intelligence <span>Pilot</span>
        </div>
        <nav aria-label="Main navigation">
          {navigation.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${view === item.id ? "active" : ""}`}
              aria-current={view === item.id ? "page" : undefined}
              onClick={() => navigate(item.id)}
            >
              <Icon icon={item.icon} size={18} />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-source">
          <Icon icon={Database} size={18} />
          <div>
            <strong>Elexon source data</strong>
            <span>WINDFOR + FUELHH · WIND</span>
          </div>
        </div>
      </aside>
      <div className="main-column">
        <header className="topbar">
          <span className="breadcrumb">
            Workspace
            <Icon icon={ChevronRight} size={18} />
            <strong>{navigation.find((n) => n.id === view)?.label}</strong>
          </span>
          <Hint
            label="Historical replay: replay of past data, not live"
            text="Replay of past data, not live."
          >
            <Icon icon={History} size={18} />
            Historical replay
          </Hint>
        </header>
        <main id="main" tabIndex={-1}>
          <div className="page-heading">
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
          {view !== "method" && (
            <section className="panel filter-panel" aria-label="View filters">
              <div className="filter-fields">
                {view === "decision" ? (
                  <DateField
                    label="Decision date"
                    value={draftDay}
                    onChange={setDraftDay}
                    previous={() => changeDay(shiftDate(day, -1))}
                    next={() => changeDay(shiftDate(day, 1))}
                    previousDisabled={day === "2026-01-01"}
                    nextDisabled={day === "2026-01-31"}
                  />
                ) : (
                  <>
                    <DateField
                      label="First decision date"
                      value={draftStart}
                      onChange={setDraftStart}
                    />
                    <DateField
                      label="Last decision date"
                      value={draftEnd}
                      onChange={setDraftEnd}
                    />
                  </>
                )}
                <CutoffField value={draftCutoff} onChange={setDraftCutoff} />
                <div className="filter-export">
                  <ExportButton
                    href={
                      view === "decision"
                        ? `/api/export?decision_date=${day}&cutoff=${cutoff}&reveal=${reveal}`
                        : `/api/accuracy/export?start=${start}&end=${end}&cutoff=${cutoff}`
                    }
                  />
                </div>
              </div>
              {filterError && (
                <p className="filter-error" role="alert">
                  {filterError}
                </p>
              )}
              <p className="active-filters" aria-live="polite">
                {view === "decision" ? (
                  <>
                    Decision {dateLabel(day)} at {cutoff} GMT → delivery{" "}
                    {dateLabel(shiftDate(day, 1))} · only forecasts published by
                    the cutoff
                  </>
                ) : (
                  <>
                    Decisions {dateLabel(start)}–{dateLabel(end)} at {cutoff}{" "}
                    GMT · retrospective actuals · exact timestamp matching
                  </>
                )}
              </p>
            </section>
          )}
          {view === "decision" ? (
            <DecisionView
              day={day}
              cutoff={cutoff}
              reveal={reveal}
              setReveal={setReveal}
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
            <MethodView meta={meta} cutoff={cutoff} />
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
