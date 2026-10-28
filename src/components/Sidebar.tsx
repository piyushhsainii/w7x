import {
  useEffect,
  useId,
  useState,
  useSyncExternalStore,
  type FocusEvent,
  type PointerEvent,
} from "react";
import { createPortal } from "react-dom";
import { Database, Wind, type LucideIcon } from "lucide-react";
import { Icon } from "./ui";

type Destination = "decision" | "accuracy" | "method";
type Item = { id: Destination; label: string; icon: LucideIcon };
const MOBILE = "(max-width: 767px)";
const RAIL = "(min-width: 768px) and (max-width: 1023px)";
function subscribeViewport(listener: () => void) {
  const queries = [MOBILE, RAIL].map((query) => window.matchMedia?.(query));
  queries.forEach((query) => query?.addEventListener("change", listener));
  return () =>
    queries.forEach((query) => query?.removeEventListener("change", listener));
}
function viewportMode() {
  return window.matchMedia?.(MOBILE).matches
    ? "mobile"
    : window.matchMedia?.(RAIL).matches
      ? "rail"
      : "full";
}
const SOURCE_DESCRIPTION =
  "Elexon data: WINDFOR · FUELHH · wind. January 2026 snapshot";

/** Presentation only: all destinations use the application's existing callback. */
export default function Sidebar({
  items,
  active,
  onNavigate,
}: {
  items: Item[];
  active: Destination;
  onNavigate: (destination: Destination) => void;
}) {
  const mode = useSyncExternalStore(
    subscribeViewport,
    viewportMode,
    () => "full",
  );
  const tooltipId = useId();
  const [tooltip, setTooltip] = useState<{
    text: string;
    left: number;
    top: number;
  } | null>(null);
  useEffect(() => setTooltip(null), [mode]);
  const showTooltip = (
    text: string,
    event: FocusEvent<HTMLElement> | PointerEvent<HTMLElement>,
  ) => {
    if (mode !== "rail") return;
    const rect = event.currentTarget.getBoundingClientRect();
    const edge =
      event.currentTarget.closest(".sidebar")?.getBoundingClientRect().right ??
      rect.right;
    setTooltip({
      text,
      left: edge + 8,
      top: rect.top + rect.height / 2,
    });
  };
  const primary = (
    <nav
      className={mode === "mobile" ? "mobile-tabbar" : "primary-navigation"}
      aria-label="Primary"
    >
      {mode === "full" && <p className="navigation-heading">Analysis</p>}
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <a
              className={`nav-item ${active === item.id ? "active" : ""}`}
              href="#"
              aria-label={item.label}
              aria-current={active === item.id ? "page" : undefined}
              aria-describedby={
                mode === "rail" && tooltip?.text === item.label
                  ? tooltipId
                  : undefined
              }
              title={mode === "rail" ? undefined : item.label}
              onFocus={(event) => showTooltip(item.label, event)}
              onBlur={() => setTooltip(null)}
              onPointerEnter={(event) => showTooltip(item.label, event)}
              onPointerLeave={() => setTooltip(null)}
              onKeyDown={(event) => {
                if (event.key === "Escape") setTooltip(null);
              }}
              onClick={(event) => {
                event.preventDefault();
                setTooltip(null);
                onNavigate(item.id);
              }}
            >
              <Icon icon={item.icon} size={20} />
              <span className="navigation-label">
                {mode === "mobile" && item.id === "accuracy"
                  ? "Accuracy"
                  : item.label}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );

  if (mode === "mobile") return primary;
  return (
    <>
      <aside
        className={`sidebar ${mode === "rail" ? "sidebar-rail" : ""}`}
        aria-label="Workspace sidebar"
      >
        <div className="sidebar-header">
          <a
            className="brand"
            href="#"
            aria-label="Aer home"
            title="Aer home"
            onClick={(event) => {
              event.preventDefault();
              onNavigate("decision");
            }}
          >
            <span className="brand-mark">
              <Icon icon={Wind} size={24} />
            </span>
            <span className="brand-wordmark">aer.</span>
          </a>
        </div>
        <div className="sidebar-main">
          <div className="workspace-label">
            Wind intelligence <span className="pilot-badge">Pilot</span>
          </div>
          {primary}
        </div>
        <footer className="sidebar-source">
          <span
            className="source-icon"
            role="img"
            aria-label={SOURCE_DESCRIPTION}
            title={mode === "rail" ? undefined : SOURCE_DESCRIPTION}
            tabIndex={mode === "rail" ? 0 : undefined}
            aria-describedby={
              mode === "rail" && tooltip?.text === SOURCE_DESCRIPTION
                ? tooltipId
                : undefined
            }
            onFocus={(event) => showTooltip(SOURCE_DESCRIPTION, event)}
            onBlur={() => setTooltip(null)}
            onPointerEnter={(event) => showTooltip(SOURCE_DESCRIPTION, event)}
            onPointerLeave={() => setTooltip(null)}
            onKeyDown={(event) => {
              if (event.key === "Escape") setTooltip(null);
            }}
          >
            <Icon icon={Database} size={18} />
          </span>
          <div className="source-details">
            <strong>Elexon data</strong>
            <p className="source-terms">
              <span>WINDFOR</span>
              <span className="source-separator" aria-hidden="true">
                {" "}
                ·{" "}
              </span>
              <span>FUELHH</span>
              <span className="source-separator" aria-hidden="true">
                {" "}
                ·{" "}
              </span>
              <span>wind</span>
            </p>
            <p className="snapshot-label">January 2026 snapshot</p>
          </div>
        </footer>
      </aside>
      {mode === "rail" &&
        tooltip &&
        createPortal(
          <span
            id={tooltipId}
            role="tooltip"
            className="sidebar-tooltip"
            style={{ left: tooltip.left, top: tooltip.top }}
          >
            {tooltip.text}
          </span>,
          document.body,
        )}
    </>
  );
}
