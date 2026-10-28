import { keepPreviousData, QueryClient, useQuery } from "@tanstack/react-query";
import {
  getJson,
  HttpError,
  type Accuracy,
  type Decision,
  type Meta,
} from "./api";

// The bundled January snapshot is immutable. Refresh is always an explicit action.
export const SNAPSHOT_STALE_TIME = Infinity;
export const SNAPSHOT_GC_TIME = 60 * 60 * 1000;
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: SNAPSHOT_STALE_TIME,
        gcTime: SNAPSHOT_GC_TIME,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
        retry: (failures, error) =>
          !(
            error instanceof HttpError &&
            error.status >= 400 &&
            error.status < 500
          ) && failures < 1,
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000),
      },
    },
  });
}
export const queryClient = createQueryClient();
export function useDecisionQuery(day: string, cutoff: string) {
  return useQuery({
    queryKey: ["decision", day, cutoff],
    queryFn: ({ signal }) =>
      getJson<Decision>(
        `/api/decision?decision_date=${day}&cutoff=${cutoff}&reveal=true`,
        signal,
      ),
    placeholderData: keepPreviousData,
  });
}
export function useAccuracyQuery(start: string, end: string, cutoff: string) {
  return useQuery({
    queryKey: ["accuracy", start, end, cutoff],
    queryFn: ({ signal }) =>
      getJson<Accuracy>(
        `/api/accuracy?start=${start}&end=${end}&cutoff=${cutoff}`,
        signal,
      ),
    placeholderData: keepPreviousData,
  });
}
export function useMetaQuery() {
  return useQuery({
    queryKey: ["meta"],
    queryFn: ({ signal }) => getJson<Meta>("/api/meta", signal),
  });
}

// Keep one observer for both workspaces across navigation. This warms their
// current keys once and keeps an in-flight request alive while a page unmounts.
// Superseded keys still lose their observers and consume fetch's AbortSignal.
export function SnapshotSubscriptions({
  day,
  cutoff,
  start,
  end,
}: {
  day: string;
  cutoff: string;
  start: string;
  end: string;
}) {
  useDecisionQuery(day, cutoff);
  useAccuracyQuery(start, end, cutoff);
  return null;
}
