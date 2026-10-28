/** Presentation only: keep ISO values internally and display UK dates consistently. */
export const number = (value: number | null | undefined, digits = 0) =>
  value == null
    ? "—"
    : value.toLocaleString("en-GB", { maximumFractionDigits: digits });

export function dateLabel(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Europe/London",
  }).format(new Date(value.length === 10 ? `${value}T12:00:00Z` : value));
}

export function clockLabel(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Europe/London",
      }).format(new Date(value)) + " GMT"
    : "Not available";
}

export const publicationLabel = (value: string | null) =>
  value ? `${dateLabel(value)}, ${clockLabel(value)}` : "Not available";

export function shiftDate(day: string, delta: number) {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

export const signed = (value: number | null | undefined) =>
  value == null ? "—" : `${value > 0 ? "+" : ""}${number(value)}`;

export const direction = (value: number | null | undefined) =>
  value == null || value === 0 ? "neutral" : value > 0 ? "over" : "under";

export const validDay = (value: string) =>
  /^2026-01-(0[1-9]|[12][0-9]|3[01])$/.test(value);
export const validClock = (value: string) =>
  /^(?:[01][0-9]|2[0-3]):[0-5][0-9]$/.test(value);
