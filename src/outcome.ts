import { useCallback, useSyncExternalStore } from "react";

// UI state only: no responses or metrics live here. App does not subscribe.
let state = { context: "", visible: false };
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
export function setOutcome(context: string, visible: boolean) {
  state = { context, visible };
  listeners.forEach((listener) => listener());
}
export function useOutcome(day: string, cutoff: string) {
  const context = `${day}|${cutoff}`;
  const visible = useSyncExternalStore(
    subscribe,
    () => state.context === context && state.visible,
    () => false,
  );
  const update = useCallback(
    (next: boolean) => setOutcome(context, next),
    [context],
  );
  return [visible, update] as const;
}
