import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { ChevronDown, Clock3, X } from "lucide-react";
import { dateLabel, shiftDate, validDay } from "../format";
import { Icon } from "./ui";

const ROW_HEIGHT = 44;
const twoDigits = (value: number) => String(value).padStart(2, "0");
const QUICK_TIMES = ["09:00", "09:30", "10:00"];

function TimeWheel({
  label,
  count,
  value,
  onChange,
  onMoving,
  column,
  otherColumn,
  reset,
}: {
  label: string;
  count: number;
  value: number;
  onChange: (value: number) => void;
  onMoving: (moving: boolean) => void;
  column: RefObject<HTMLDivElement | null>;
  otherColumn: RefObject<HTMLDivElement | null>;
  reset: number;
}) {
  const id = useId();
  const settleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  useLayoutEffect(() => {
    if (column.current) column.current.scrollTop = value * ROW_HEIGHT;
    // Only explicit resets reposition the wheel; user scrolling must never be
    // chased by an effect, which would interrupt native touch momentum.
    return () => clearTimeout(settleTimer.current);
  }, [reset]);
  function settling() {
    onMoving(true);
    clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => onMoving(false), 150);
  }
  function choose(next: number, smooth = false) {
    const selected = Math.max(0, Math.min(count - 1, next));
    onChange(selected);
    settling();
    column.current?.scrollTo({
      top: selected * ROW_HEIGHT,
      behavior:
        smooth &&
        !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
          ? "smooth"
          : "auto",
    });
  }
  return (
    <div className="time-wheel-column">
      <span className="time-wheel-label" id={`${id}-label`}>
        {label}
      </span>
      <div className="time-wheel-window">
        <div
          ref={column}
          className="time-wheel"
          role="listbox"
          tabIndex={0}
          aria-labelledby={`${id}-label`}
          aria-describedby={`${id}-help`}
          aria-activedescendant={`${id}-${value}`}
          aria-orientation="vertical"
          onScroll={(event) => {
            const next = Math.max(
              0,
              Math.min(
                count - 1,
                Math.round(event.currentTarget.scrollTop / ROW_HEIGHT),
              ),
            );
            if (next !== value) onChange(next);
            settling();
          }}
          onKeyDown={(event) => {
            const moves: Record<string, number> = {
              ArrowUp: value - 1,
              ArrowDown: value + 1,
              PageUp: value - 5,
              PageDown: value + 5,
              Home: 0,
              End: count - 1,
            };
            if (event.key in moves) {
              event.preventDefault();
              event.stopPropagation();
              choose(moves[event.key]);
            } else if (
              event.key === "ArrowLeft" ||
              event.key === "ArrowRight"
            ) {
              event.preventDefault();
              event.stopPropagation();
              otherColumn.current?.focus({ preventScroll: true });
            }
          }}
        >
          {Array.from({ length: count }, (_, index) => (
            <div
              key={index}
              id={`${id}-${index}`}
              role="option"
              aria-selected={value === index}
              className={`time-wheel-option ${value === index ? "selected" : ""}`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                column.current?.focus({ preventScroll: true });
                choose(index, true);
              }}
            >
              {twoDigits(index)}
            </div>
          ))}
        </div>
      </div>
      <span id={`${id}-help`} className="sr-only">
        Scroll, tap a number, or use up and down arrows. Left and right switch
        columns.
      </span>
    </div>
  );
}

function CutoffDialog({
  value,
  decisionDate,
  onApply,
  onDismiss,
  trigger,
}: {
  value: string;
  decisionDate?: string;
  onApply: (value: string) => void;
  onDismiss: () => void;
  trigger: RefObject<HTMLButtonElement | null>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const hours = useRef<HTMLDivElement>(null);
  const minutes = useRef<HTMLDivElement>(null);
  const [hour, setHour] = useState(Number(value.slice(0, 2)));
  const [minute, setMinute] = useState(Number(value.slice(3, 5)));
  const [hourMoving, setHourMoving] = useState(false);
  const [minuteMoving, setMinuteMoving] = useState(false);
  const [reset, setReset] = useState(0);
  const [ready, setReady] = useState(false);
  const title = useId();
  const description = useId();
  const selected = `${twoDigits(hour)}:${twoDigits(minute)}`;
  useLayoutEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    dialog.current?.showModal();
    setReady(true);
    return () => {
      dialog.current?.close();
      (trigger.current ?? previousFocus)?.focus({ preventScroll: true });
    };
  }, []);
  useLayoutEffect(() => {
    if (ready) hours.current?.focus({ preventScroll: true });
  }, [ready]);
  return (
    <dialog
      ref={dialog}
      className="cutoff-dialog"
      aria-labelledby={title}
      aria-describedby={description}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const controls = Array.from(
          dialog.current?.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [role="listbox"]',
          ) ?? [],
        );
        const first = controls[0],
          last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus({ preventScroll: true });
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus({ preventScroll: true });
        }
      }}
      onCancel={(event) => {
        event.preventDefault();
        onDismiss();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onDismiss();
      }}
    >
      <div className="cutoff-sheet">
        <div className="cutoff-dialog-heading">
          <div>
            <h2 id={title}>Choose forecast cutoff</h2>
            <p>24-hour clock · UK time (GMT in January)</p>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onDismiss}
            aria-label="Close cutoff picker"
          >
            <Icon icon={X} />
          </button>
        </div>
        <p id={description} className="cutoff-description">
          Only forecasts published at or before this time on the decision date
          are included.
        </p>
        {decisionDate && validDay(decisionDate) && (
          <p className="cutoff-date-context">
            Decision {dateLabel(decisionDate)} → delivery{" "}
            {dateLabel(shiftDate(decisionDate, 1))}
          </p>
        )}
        <div className="cutoff-wheels">
          {ready && (
            <>
              <TimeWheel
                label="Cutoff hours"
                count={24}
                value={hour}
                onChange={setHour}
                onMoving={setHourMoving}
                column={hours}
                otherColumn={minutes}
                reset={reset}
              />
              <span className="time-wheel-colon" aria-hidden="true">
                :
              </span>
              <TimeWheel
                label="Cutoff minutes"
                count={60}
                value={minute}
                onChange={setMinute}
                onMoving={setMinuteMoving}
                column={minutes}
                otherColumn={hours}
                reset={reset}
              />
            </>
          )}
        </div>
        <p className="wheel-instructions">
          Swipe or scroll to choose. Tap a number to select it.
        </p>
        <div
          className="cutoff-quick-picks"
          role="group"
          aria-label="Quick cutoff times"
        >
          {QUICK_TIMES.map((time) => (
            <button
              type="button"
              key={time}
              aria-pressed={selected === time}
              onClick={() => {
                setHour(Number(time.slice(0, 2)));
                setMinute(Number(time.slice(3, 5)));
                setReset((n) => n + 1);
                setHourMoving(false);
                setMinuteMoving(false);
              }}
            >
              {time}
            </button>
          ))}
        </div>
        <div className="cutoff-dialog-footer">
          <span className="cutoff-preview" aria-live="off">
            {selected} <span>GMT</span>
          </span>
          <div>
            <button
              type="button"
              className="button secondary"
              onClick={onDismiss}
            >
              Cancel
            </button>
            <button
              type="button"
              className="button"
              disabled={hourMoving || minuteMoving}
              onClick={() => onApply(selected)}
            >
              Apply time
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}

export default function CutoffField({
  value,
  onChange,
  decisionDate,
}: {
  value: string;
  onChange: (value: string) => void;
  decisionDate?: string;
}) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  return (
    <div className="time-control">
      <label htmlFor={id}>Forecast cutoff · UK time</label>
      <button
        type="button"
        ref={trigger}
        className="time-picker-trigger"
        id={id}
        aria-label={`Choose forecast cutoff time (${value} GMT)`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <Icon icon={Clock3} size={18} />
        <span className="cutoff-value">{value}</span>
        <span className="cutoff-zone">GMT</span>
        <Icon icon={ChevronDown} size={18} />
      </button>
      {open && (
        <CutoffDialog
          value={value}
          decisionDate={decisionDate}
          onDismiss={() => setOpen(false)}
          trigger={trigger}
          onApply={(time) => {
            onChange(time);
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}
