import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { dateLabel, shiftDate, validDay } from "../format";
import { useAccuracyQuery, useDecisionQuery } from "../query";
import { QueryControls } from "./QueryControls";
import { Icon } from "./ui";

function Popover({
  title,
  trigger,
  close,
  children,
  wide = false,
}: {
  title: string;
  trigger: RefObject<HTMLButtonElement | null>;
  close: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const heading = useId();
  const [position, setPosition] = useState({ top: 64, left: 12 });
  useLayoutEffect(() => {
    function place() {
      const anchor = trigger.current?.getBoundingClientRect();
      if (!anchor || !panel.current) return;
      const width = panel.current.getBoundingClientRect().width;
      const availableWidth = document.documentElement.clientWidth || innerWidth;
      setPosition({
        top: anchor.bottom + 8,
        left: Math.max(12, Math.min(anchor.left, availableWidth - width - 12)),
      });
    }
    function outside(event: PointerEvent) {
      if (
        !panel.current?.contains(event.target as Node) &&
        !trigger.current?.contains(event.target as Node)
      )
        close();
    }
    place();
    (
      panel.current?.querySelector<HTMLElement>("[data-initial-focus]") ??
      panel.current?.querySelector<HTMLElement>("input") ??
      panel.current?.querySelector<HTMLElement>("button")
    )?.focus({ preventScroll: true });
    document.addEventListener("pointerdown", outside);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      document.removeEventListener("pointerdown", outside);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      trigger.current?.focus({ preventScroll: true });
    };
  }, []);
  return createPortal(
    <div
      ref={panel}
      className={`toolbar-popover ${wide ? "filters-popover" : ""} ${title === "Forecast cutoff" ? "cutoff-popover" : ""}`}
      role="dialog"
      aria-label={title}
      aria-labelledby={heading}
      style={{ top: position.top, left: position.left }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          close();
        }
        if (event.key === "Tab") {
          const controls = Array.from(
            panel.current?.querySelectorAll<HTMLElement>(
              'input,button:not([disabled]):not([tabindex="-1"]),a[href]',
            ) ?? [],
          );
          const first = controls[0],
            last = controls[controls.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }
      }}
    >
      <div className="popover-heading">
        <h2 id={heading}>{title}</h2>
        <button
          type="button"
          className="icon-button"
          aria-label={`Close ${title.toLowerCase()}`}
          onClick={close}
        >
          <Icon icon={X} size={18} />
        </button>
      </div>
      {children}
    </div>,
    document.body,
  );
}

function DateInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <label className="popover-field" htmlFor={id}>
      <span>{label}</span>
      <input
        id={id}
        type="date"
        min="2026-01-01"
        max="2026-01-31"
        value={value}
        onInput={(e) => onChange(e.currentTarget.value)}
        onChange={(e) => onChange(e.currentTarget.value)}
      />
    </label>
  );
}

function CutoffInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <div className="cutoff-editor">
      <label className="popover-field" htmlFor={id}>
        <span>Forecast cutoff · UK time (GMT)</span>
        <input
          id={id}
          type="time"
          step={60}
          required
          value={value}
          onInput={(e) => onChange(e.currentTarget.value)}
          onChange={(e) => onChange(e.currentTarget.value)}
        />
      </label>
      <button
        type="button"
        className="reset-cutoff"
        onClick={() => onChange("09:30")}
      >
        Reset to 09:30
      </button>
      <p>Only forecasts published at or before this time are used.</p>
    </div>
  );
}

function JanuaryCalendar({
  day,
  change,
  close,
}: {
  day: string;
  change: (value: string) => void;
  close: () => void;
}) {
  const grid = useRef<HTMLDivElement>(null);
  const [focused, setFocused] = useState(
    validDay(day) ? Number(day.slice(-2)) : 15,
  );
  return (
    <>
      <DateInput label="Decision date" value={day} onChange={change} />
      <div className="calendar-month">January 2026</div>
      <div className="calendar-weekdays" aria-hidden="true">
        {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div
        className="calendar-days"
        ref={grid}
        role="group"
        aria-label="January 2026 decision dates"
        onKeyDown={(event) => {
          const moves: Record<string, number> = {
            ArrowLeft: focused - 1,
            ArrowRight: focused + 1,
            ArrowUp: focused - 7,
            ArrowDown: focused + 7,
            Home: 1,
            End: 31,
          };
          if (event.key in moves) {
            event.preventDefault();
            event.stopPropagation();
            const next = Math.max(1, Math.min(31, moves[event.key]));
            setFocused(next);
            grid.current
              ?.querySelector<HTMLButtonElement>(`[data-day="${next}"]`)
              ?.focus();
          }
        }}
      >
        <span aria-hidden="true" />
        <span aria-hidden="true" />
        <span aria-hidden="true" />
        {Array.from({ length: 31 }, (_, index) => {
          const n = index + 1;
          const date = `2026-01-${String(n).padStart(2, "0")}`;
          return (
            <button
              key={n}
              data-day={n}
              data-initial-focus={n === focused ? "" : undefined}
              tabIndex={n === focused ? 0 : -1}
              type="button"
              aria-label={dateLabel(date)}
              aria-pressed={date === day}
              onFocus={() => setFocused(n)}
              onClick={() => {
                change(date);
                close();
              }}
            >
              {n}
            </button>
          );
        })}
      </div>
      <p className="popover-note">
        Buying day · delivery is the following day.
      </p>
    </>
  );
}

export function WorkspaceRefresh({
  view,
  day,
  cutoff,
  start,
  end,
}: {
  view: "decision" | "accuracy";
  day: string;
  cutoff: string;
  start: string;
  end: string;
}) {
  return view === "decision" ? (
    <DecisionRefresh day={day} cutoff={cutoff} />
  ) : (
    <AccuracyRefresh start={start} end={end} cutoff={cutoff} />
  );
}
function DecisionRefresh({ day, cutoff }: { day: string; cutoff: string }) {
  return <QueryControls query={useDecisionQuery(day, cutoff)} />;
}
function AccuracyRefresh({
  start,
  end,
  cutoff,
}: {
  start: string;
  end: string;
  cutoff: string;
}) {
  return <QueryControls query={useAccuracyQuery(start, end, cutoff)} />;
}

export default function TopbarControls({
  view,
  day,
  cutoff,
  start,
  end,
  changeDay,
  changeCutoff,
  changeStart,
  changeEnd,
}: {
  view: "decision" | "accuracy";
  day: string;
  cutoff: string;
  start: string;
  end: string;
  changeDay: (value: string) => void;
  changeCutoff: (value: string) => void;
  changeStart: (value: string) => void;
  changeEnd: (value: string) => void;
}) {
  const [open, setOpen] = useState<"date" | "cutoff" | "filters" | null>(null);
  const date = useRef<HTMLButtonElement>(null),
    time = useRef<HTMLButtonElement>(null),
    filters = useRef<HTMLButtonElement>(null);
  const close = () => setOpen(null);
  const range = (
    <div className="date-range-editor">
      <DateInput
        label="First decision date"
        value={start}
        onChange={changeStart}
      />
      <DateInput label="Last decision date" value={end} onChange={changeEnd} />
      <p className="popover-note">
        Apply the same cutoff to every decision date.
      </p>
    </div>
  );
  const dayButtons = (
    <>
      <button
        type="button"
        className="icon-button"
        aria-label="Previous day"
        title="Previous day (←)"
        aria-keyshortcuts="ArrowLeft"
        disabled={!validDay(day) || day === "2026-01-01"}
        onClick={() => changeDay(shiftDate(day, -1))}
      >
        <Icon icon={ChevronLeft} />
      </button>
      <button
        type="button"
        ref={date}
        className="toolbar-button date-trigger"
        aria-label={`Decision date: ${validDay(day) ? dateLabel(day) : "Choose a date"}`}
        aria-haspopup="dialog"
        aria-expanded={open === "date"}
        onClick={() => setOpen(open === "date" ? null : "date")}
      >
        <Icon icon={CalendarDays} size={18} />
        {validDay(day) ? dateLabel(day) : "Choose a date"}
      </button>
      <button
        type="button"
        className="icon-button"
        aria-label="Next day"
        title="Next day (→)"
        aria-keyshortcuts="ArrowRight"
        disabled={!validDay(day) || day === "2026-01-31"}
        onClick={() => changeDay(shiftDate(day, 1))}
      >
        <Icon icon={ChevronRight} />
      </button>
    </>
  );
  return (
    <>
      <div className="desktop-filters">
        <div className="toolbar-date-group">
          {view === "decision" ? (
            dayButtons
          ) : (
            <button
              type="button"
              ref={date}
              className="toolbar-button date-range-trigger"
              aria-label="Choose decision date range"
              aria-haspopup="dialog"
              aria-expanded={open === "date"}
              onClick={() => setOpen(open === "date" ? null : "date")}
            >
              <Icon icon={CalendarDays} size={18} />
              {validDay(start) && validDay(end)
                ? `${Number(start.slice(-2))}–${Number(end.slice(-2))} Jan 2026`
                : "Choose date range"}
            </button>
          )}
        </div>
        <span className="toolbar-separator" aria-hidden="true" />
        <button
          type="button"
          ref={time}
          className="toolbar-button cutoff-chip"
          aria-label={`Cutoff ${cutoff} GMT`}
          aria-haspopup="dialog"
          aria-expanded={open === "cutoff"}
          onClick={() => setOpen(open === "cutoff" ? null : "cutoff")}
        >
          <Icon icon={Clock3} size={18} />
          Cutoff {cutoff} GMT
        </button>
        <span className="toolbar-separator" aria-hidden="true" />
      </div>
      <button
        type="button"
        ref={filters}
        className="toolbar-button mobile-filters-trigger"
        aria-haspopup="dialog"
        aria-expanded={open === "filters"}
        onClick={() => setOpen(open === "filters" ? null : "filters")}
      >
        <Icon icon={SlidersHorizontal} size={18} />
        Filters
      </button>
      {open && (
        <Popover
          key={`${open}-${view}`}
          title={
            open === "date"
              ? view === "decision"
                ? "Decision date"
                : "Decision date range"
              : open === "cutoff"
                ? "Forecast cutoff"
                : "Filters"
          }
          trigger={open === "date" ? date : open === "cutoff" ? time : filters}
          close={close}
          wide={open === "filters"}
        >
          {open === "date" ? (
            view === "decision" ? (
              <JanuaryCalendar day={day} change={changeDay} close={close} />
            ) : (
              range
            )
          ) : open === "cutoff" ? (
            <CutoffInput value={cutoff} onChange={changeCutoff} />
          ) : (
            <>
              {view === "decision" ? (
                <DateInput
                  label="Decision date"
                  value={day}
                  onChange={changeDay}
                />
              ) : (
                range
              )}
              <CutoffInput value={cutoff} onChange={changeCutoff} />
            </>
          )}
        </Popover>
      )}
    </>
  );
}
