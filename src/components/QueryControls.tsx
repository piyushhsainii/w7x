import { useEffect, useState, type ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import type { UseQueryResult } from "@tanstack/react-query";
import { useOutcome } from "../outcome";
import { ExportButton, Icon } from "./ui";

export function OutcomeRegion({
  day,
  cutoff,
  children,
}: {
  day: string;
  cutoff: string;
  children: (visible: boolean, update: (next: boolean) => void) => ReactNode;
}) {
  const [visible, update] = useOutcome(day, cutoff);
  return children(visible, update);
}

export function QueryControls({ query }: { query: UseQueryResult }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => tick((n) => n + 1), 30000);
    return () => clearInterval(timer);
  }, []);
  const minutes = Math.max(
    0,
    Math.floor((Date.now() - query.dataUpdatedAt) / 60000),
  );
  return (
    <div className="query-controls" aria-live="polite">
      <span>
        {query.isPlaceholderData
          ? "Updating filters… showing previous selection"
          : query.dataUpdatedAt
            ? `Updated ${minutes < 1 ? "just now" : `${minutes} min ago`}`
            : "Awaiting snapshot"}
      </span>
      <button
        className="icon-button"
        type="button"
        aria-label="Refresh data"
        title="Refresh data for this view"
        disabled={query.isFetching}
        onClick={() => {
          void query.refetch({ cancelRefetch: false });
        }}
      >
        <span className={query.isFetching ? "refresh-spin" : ""}>
          <Icon icon={RefreshCw} size={18} />
        </span>
      </button>
      {query.error && (
        <span role="alert">
          {query.error.message} Previous data remains visible.
        </span>
      )}
    </div>
  );
}

// Both layers stay in the layout: the taller/wider layer reserves space.
export function OutcomeStack({
  revealed,
  hidden,
  shown,
}: {
  revealed: boolean;
  hidden: ReactNode;
  shown: ReactNode;
}) {
  return (
    <span className="outcome-stack">
      <span
        aria-hidden={revealed}
        style={{ visibility: revealed ? "hidden" : "visible" }}
      >
        {hidden}
      </span>
      <span
        aria-hidden={!revealed}
        style={{ visibility: revealed ? "visible" : "hidden" }}
      >
        {shown}
      </span>
    </span>
  );
}
export function DecisionExport({
  day,
  cutoff,
}: {
  day: string;
  cutoff: string;
}) {
  const [revealed] = useOutcome(day, cutoff);
  return (
    <ExportButton
      href={`/api/export?decision_date=${day}&cutoff=${cutoff}&reveal=${revealed}`}
    />
  );
}
