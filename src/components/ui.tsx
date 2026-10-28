import { useId, useRef, type ReactNode } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  Info,
  LoaderCircle,
  Minus,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { dateLabel, direction, number, signed } from "../format";

export function Icon({
  icon: Component,
  size = 20,
}: {
  icon: LucideIcon;
  size?: number;
}) {
  return <Component size={size} strokeWidth={1.75} aria-hidden="true" />;
}

export function Hint({
  text,
  children,
  label,
}: {
  text: string;
  children?: ReactNode;
  label?: string;
}) {
  const id = useId();
  return (
    <span className="hint">
      <button
        type="button"
        className={children ? "term-button" : "help-button"}
        aria-label={label ?? text}
        aria-describedby={id}
      >
        {children ?? <Icon icon={Info} size={18} />}
      </button>
      <span id={id} role="tooltip" className="hint-content">
        {text}
      </span>
    </span>
  );
}

export const definitions = {
  MAE: "Mean absolute error: the average size of forecast errors, ignoring whether wind was overforecast or underforecast.",
  RMSE: "Root mean squared error: an error measure that gives larger forecast misses more weight.",
  Bias: "Mean signed error, forecast minus actual: positive means wind was overforecast on average.",
  WAPE: "Total absolute error divided by total matched actual generation, as a percentage; not a probability of correctness.",
  P90: "The historical 90th percentile of absolute error: 90% of observed errors were at or below this size, not a future guarantee.",
};
export type Term = keyof typeof definitions;
export function Glossary({ term }: { term: Term }) {
  return (
    <Hint text={definitions[term]} label={`${term}: definition`}>
      {term}
      <Icon icon={Info} size={14} />
    </Hint>
  );
}

export function MetricCard({
  icon,
  label,
  value,
  unit,
  caption,
  term,
  tone = "neutral",
}: {
  icon: LucideIcon;
  label: ReactNode;
  value: ReactNode;
  unit?: string;
  caption: ReactNode;
  term?: Term;
  tone?: string;
}) {
  return (
    <article className={`panel metric-card tone-${tone}`}>
      <div className="metric-top">
        <h2>
          {label}
          {term &&
            (typeof label === "string" &&
            label.toLowerCase().includes(term.toLowerCase()) ? (
              <Hint text={definitions[term]} label={`${term}: definition`} />
            ) : (
              <>
                {" "}
                · <Glossary term={term} />
              </>
            ))}
        </h2>
        <span className="metric-icon">
          <Icon icon={icon} />
        </span>
      </div>
      <div className="metric-value">
        {value}
        {unit && <span className="metric-unit">{unit}</span>}
      </div>
      <div className="caption">{caption}</div>
    </article>
  );
}

export function KeyFinding({ children }: { children: ReactNode }) {
  return (
    <section className="key-finding" aria-label="Key finding">
      <h2>Key finding</h2>
      <p>{children}</p>
    </section>
  );
}

export function SignedError({
  value,
  describe = false,
}: {
  value: number | null | undefined;
  describe?: boolean;
}) {
  const kind = direction(value);
  const label =
    value == null
      ? "No matched error"
      : kind === "over"
        ? "Wind overforecast"
        : kind === "under"
          ? "Wind underforecast"
          : "No signed error";
  return (
    <span
      className={`signed-error semantic-${kind}`}
      aria-label={`${signed(value)} MW. ${label}`}
      title={label}
    >
      <Icon
        icon={
          kind === "over" ? TrendingUp : kind === "under" ? TrendingDown : Minus
        }
        size={18}
      />
      <span>
        {signed(value)}
        {describe && (
          <>
            {" "}
            MW <span className="direction-label">· {label}</span>
          </>
        )}
      </span>
    </span>
  );
}

export function Status({
  loading,
  error,
  retry,
}: {
  loading: boolean;
  error: string;
  retry: () => void;
}) {
  if (error)
    return (
      <section className="panel state" role="alert">
        <Icon icon={Info} size={28} />
        <h2>Unable to load this view</h2>
        <p>{error}</p>
        <button className="button" onClick={retry}>
          <Icon icon={RefreshCw} size={18} />
          Try again
        </button>
      </section>
    );
  if (loading)
    return (
      <section className="panel state" role="status">
        <span className="spin">
          <Icon icon={LoaderCircle} size={28} />
        </span>
        <h2>Loading the selected view</h2>
        <p>
          Retrieving decision-time forecasts and existing quantitative results.
        </p>
      </section>
    );
  return null;
}

export function DateField({
  label,
  value,
  onChange,
  previous,
  next,
  previousDisabled,
  nextDisabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  previous?: () => void;
  next?: () => void;
  previousDisabled?: boolean;
  nextDisabled?: boolean;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="date-control">
      <label htmlFor={id}>{label}</label>
      <div className="date-row">
        {previous && (
          <button
            type="button"
            className="icon-button"
            onClick={previous}
            disabled={previousDisabled}
            aria-label="Previous decision day"
            title="Previous day (←)"
          >
            <Icon icon={ChevronLeft} />
          </button>
        )}
        <div className="formatted-date">
          <Icon icon={CalendarDays} size={18} />
          <span aria-hidden="true">
            {value && /^\d{4}-\d{2}-\d{2}$/.test(value)
              ? dateLabel(value)
              : "Choose a date"}
          </span>
          <input
            ref={input}
            id={id}
            aria-label={label}
            type="date"
            min="2026-01-01"
            max="2026-01-31"
            required
            value={value}
            onInput={(e) => onChange(e.currentTarget.value)}
            onChange={(e) => onChange(e.currentTarget.value)}
          />
        </div>
        {next && (
          <button
            type="button"
            className="icon-button"
            onClick={next}
            disabled={nextDisabled}
            aria-label="Next decision day"
            title="Next day (→)"
          >
            <Icon icon={ChevronRight} />
          </button>
        )}
      </div>
    </div>
  );
}

export function CutoffField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <div className="time-control">
      <label htmlFor={id}>Decision cutoff · UK time</label>
      <div className="time-input">
        <Icon icon={Clock3} size={18} />
        <input
          id={id}
          type="time"
          required
          aria-label="Buying decision cutoff"
          value={value}
          onInput={(e) => onChange(e.currentTarget.value)}
          onChange={(e) => onChange(e.target.value)}
        />
        <span>GMT</span>
      </div>
    </div>
  );
}

export function ExportButton({
  href,
  label = "Export CSV",
}: {
  href: string;
  label?: string;
}) {
  return (
    <a className="button secondary" href={href} download>
      <Icon icon={Download} size={18} />
      {label}
    </a>
  );
}

export function CoverageLine({
  matched,
  expected,
  children,
}: {
  matched: number;
  expected: number;
  children: ReactNode;
}) {
  return (
    <details className="coverage-line">
      <summary>
        <strong>
          {matched === expected ? "Data complete" : "Check data coverage"}:{" "}
          {number(matched)}/{number(expected)} matched
        </strong>
        <span>Details</span>
      </summary>
      <div className="coverage-content">{children}</div>
    </details>
  );
}
