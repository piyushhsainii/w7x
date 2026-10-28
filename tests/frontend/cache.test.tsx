import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import {
  QueryClientProvider,
  focusManager,
  onlineManager,
} from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../src/App";
import {
  createQueryClient,
  useDecisionQuery,
  useAccuracyQuery,
  SnapshotSubscriptions,
} from "../../src/query";
import { HttpError } from "../../src/api";
import { setOutcome } from "../../src/outcome";
import decision from "./fixtures/decision.json";
import accuracy from "./fixtures/accuracy.json";
import meta from "./fixtures/meta.json";
import { ResizeObserverMock } from "./setup";

// jsdom has no CSS layout. Use a fixed measurement boundary while exercising
// the real Recharts chart, axes, series, and React reconciliation below it.
vi.mock("recharts", async (importOriginal) => {
  const original = await importOriginal<typeof import("recharts")>();
  const { cloneElement } = await import("react");
  return {
    ...original,
    ResponsiveContainer: ({ children }: { children: React.ReactElement }) =>
      cloneElement(children, { width: 1000, height: 330 } as object),
  };
});

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", ResizeObserverMock);
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  setOutcome("", false);
});
function mockFetch() {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const path = String(input);
    return new Response(
      JSON.stringify(
        path.includes("/accuracy")
          ? accuracy
          : path.includes("/meta")
            ? meta
            : decision,
      ),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  });
}
function count(fetcher: ReturnType<typeof mockFetch>, path: string) {
  return fetcher.mock.calls.filter(([url]) => String(url).includes(path))
    .length;
}
function Desk({ day = "2026-01-15" }: { day?: string }) {
  const q = useDecisionQuery(day, "09:30");
  return <span data-testid="desk">{q.data?.decision_date ?? "loading"}</span>;
}
function Scores() {
  const q = useAccuracyQuery("2026-01-01", "2026-01-31", "09:30");
  return <span>{q.data ? "scores ready" : "loading"}</span>;
}

describe("snapshot cache and outcome interaction", () => {
  it("keeps a pending request alive across navigation and shares it with new observers", async () => {
    const client = createQueryClient();
    let finish: ((response: Response) => void) | undefined;
    const fetcher = mockFetch();
    fetcher.mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          finish = resolve;
        }),
    );
    const tree = (visible: boolean) => (
      <QueryClientProvider client={client}>
        <SnapshotSubscriptions
          day="2026-01-15"
          cutoff="09:30"
          start="2026-01-01"
          end="2026-01-31"
        />
        {visible && <Desk />}
      </QueryClientProvider>
    );
    const result = render(tree(true));
    result.rerender(tree(false));
    result.rerender(tree(true));
    expect(count(fetcher, "/decision")).toBe(1);
    await act(async () => {
      finish?.(new Response(JSON.stringify(decision), { status: 200 }));
    });
    await screen.findByText("2026-01-15");
    expect(count(fetcher, "/decision")).toBe(1);
    result.unmount();
    client.clear();
  });

  it("keeps content visible when a manual refresh receives 429 and does not retry", async () => {
    const client = createQueryClient();
    const fetcher = mockFetch();
    const result = render(
      <QueryClientProvider client={client}>
        <App />
      </QueryClientProvider>,
    );
    await screen.findByRole("button", { name: "Show actual outcome" });
    await waitFor(() => expect(client.isFetching()).toBe(0));
    const chart = result.container.querySelector(".recharts-wrapper");
    fetcher.mockImplementationOnce(
      async () =>
        new Response(JSON.stringify({ detail: "Rate limited" }), {
          status: 429,
        }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Refresh data" }));
    await screen.findByText(/Rate limited.*Previous data remains visible/);
    expect(count(fetcher, "/decision")).toBe(2);
    expect(result.container.querySelector(".recharts-wrapper")).toBe(chart);
    expect(
      screen.queryByRole("heading", { name: "Loading the selected view" }),
    ).toBeNull();
    result.unmount();
    client.clear();
  });
  it("keeps one request per key across ten navigation loops; refresh is current-page only", async () => {
    const fetcher = mockFetch();
    const client = createQueryClient();
    const result = render(
      <QueryClientProvider client={client}>
        <App />
      </QueryClientProvider>,
    );
    await screen.findByRole("button", { name: "Show actual outcome" });
    await waitFor(() => expect(client.isFetching()).toBe(0));
    for (let i = 0; i < 10; i++) {
      fireEvent.click(
        screen.getByRole("link", { name: "Decision desk", exact: true }),
      );
      fireEvent.click(
        screen.getByRole("link", { name: "Forecast accuracy", exact: true }),
      );
      fireEvent.click(
        screen.getByRole("link", { name: "Methodology", exact: true }),
      );
      fireEvent.click(
        screen.getByRole("link", { name: "Decision desk", exact: true }),
      );
      fireEvent.click(
        screen.getByRole("link", { name: "Forecast accuracy", exact: true }),
      );
    }
    await act(async () => {
      focusManager.setFocused(false);
      focusManager.setFocused(true);
      onlineManager.setOnline(false);
      onlineManager.setOnline(true);
    });
    expect(count(fetcher, "/decision")).toBe(1);
    expect(count(fetcher, "/accuracy")).toBe(1);
    expect(count(fetcher, "/meta")).toBe(1);
    fireEvent.click(screen.getByRole("button", { name: "Refresh data" }));
    await waitFor(() => expect(count(fetcher, "/accuracy")).toBe(2));
    expect(count(fetcher, "/decision")).toBe(1);
    result.unmount();
    client.clear();
  });

  it("toggle never fetches, navigates, scrolls or replaces the chart/table; preserves selection and pagination", async () => {
    const fetcher = mockFetch();
    const client = createQueryClient();
    const result = render(
      <QueryClientProvider client={client}>
        <App />
      </QueryClientProvider>,
    );
    await screen.findByRole("button", { name: "Show actual outcome" });
    await waitFor(() => expect(client.isFetching()).toBe(0));
    fireEvent.click(
      screen.getByRole("button", { name: "Next audit table page" }),
    );
    fireEvent.click(
      screen.getByRole("row", { name: "Inspect 08:00 GMT forecast" }),
    );
    const table = result.container.querySelector("table"),
      chart = result.container.querySelector(".recharts-wrapper"),
      main = result.container.querySelector("main");
    expect(chart).not.toBeNull();
    const calls = fetcher.mock.calls.length,
      location = window.location.href;
    const ticks =
      result.container.querySelector(".recharts-yAxis")?.textContent;
    const scrollTo = vi.mocked(window.scrollTo);
    scrollTo.mockClear();
    const rootRender = vi.fn();
    document.addEventListener("aer:app-render", rootRender);
    for (let i = 0; i < 10; i++) {
      fireEvent.click(
        screen.getByRole("button", { name: "Show actual outcome" }),
      );
      fireEvent.click(
        screen.getByRole("button", { name: "Hide actual outcome" }),
      );
    }
    expect(fetcher).toHaveBeenCalledTimes(calls);
    expect(window.location.href).toBe(location);
    expect(scrollTo).not.toHaveBeenCalled();
    expect(rootRender).not.toHaveBeenCalled();
    document.removeEventListener("aer:app-render", rootRender);
    expect(result.container.querySelector("table")).toBe(table);
    expect(result.container.querySelector(".recharts-wrapper")).toBe(chart);
    expect(result.container.querySelector("main")).toBe(main);
    expect(result.container.querySelector(".recharts-yAxis")?.textContent).toBe(
      ticks,
    );
    expect(
      screen.getByRole("row", { name: "Inspect 08:00 GMT forecast" }).className,
    ).toContain("selected-row");
    expect(
      screen
        .getByRole("button", { name: "Previous audit table page" })
        .hasAttribute("disabled"),
    ).toBe(false);
    expect(
      fetcher.mock.calls
        .filter(([url]) => String(url).includes("/decision"))
        .every(([url]) => String(url).endsWith("reveal=true")),
    ).toBe(true);
    result.unmount();
    client.clear();
  });

  it("deduplicates concurrent observers, requests one new date and reuses an earlier date", async () => {
    const fetcher = mockFetch();
    const client = createQueryClient();
    const tree = (day: string) => (
      <QueryClientProvider client={client}>
        <SnapshotSubscriptions
          day={day}
          start="2026-01-01"
          end="2026-01-31"
          cutoff="09:30"
        />
        <Desk day={day} />
        <Scores />
      </QueryClientProvider>
    );
    const result = render(tree("2026-01-15"));
    await screen.findByText("scores ready");
    await waitFor(() => expect(client.isFetching()).toBe(0));
    expect(count(fetcher, "/decision")).toBe(1);
    result.rerender(tree("2026-01-16"));
    await waitFor(() => expect(client.isFetching()).toBe(0));
    expect(count(fetcher, "/decision")).toBe(2);
    result.rerender(tree("2026-01-15"));
    await waitFor(() => expect(client.isFetching()).toBe(0));
    expect(count(fetcher, "/decision")).toBe(2);
    expect(count(fetcher, "/accuracy")).toBe(1);
    result.unmount();
    client.clear();
  });

  it("debounces rapid next-day clicks into one new request", async () => {
    const fetcher = mockFetch();
    const client = createQueryClient();
    const result = render(
      <QueryClientProvider client={client}>
        <App />
      </QueryClientProvider>,
    );
    await screen.findByRole("button", { name: "Show actual outcome" });
    for (let i = 0; i < 3; i++)
      fireEvent.click(
        screen.getByRole("button", { name: "Next decision day" }),
      );
    expect(count(fetcher, "/decision")).toBe(1);
    await waitFor(() => expect(count(fetcher, "/decision")).toBe(2));
    expect(
      String(
        fetcher.mock.calls
          .filter(([url]) => String(url).includes("/decision"))
          .at(-1)?.[0],
      ),
    ).toContain("decision_date=2026-01-18");
    result.unmount();
    client.clear();
  });

  it("passes AbortSignal and cancels a superseded key while retaining previous data", async () => {
    const client = createQueryClient();
    const fetcher = mockFetch();
    const result = render(
      <QueryClientProvider client={client}>
        <Desk />
      </QueryClientProvider>,
    );
    await screen.findByText("2026-01-15");
    let signal: AbortSignal | undefined;
    fetcher.mockImplementationOnce(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          signal = init?.signal as AbortSignal;
          signal.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError")),
          );
        }),
    );
    result.rerender(
      <QueryClientProvider client={client}>
        <Desk day="2026-01-16" />
      </QueryClientProvider>,
    );
    expect(screen.getByTestId("desk").textContent).toBe("2026-01-15");
    result.rerender(
      <QueryClientProvider client={client}>
        <Desk day="2026-01-17" />
      </QueryClientProvider>,
    );
    expect(signal?.aborted).toBe(true);
    await waitFor(() => expect(client.isFetching()).toBe(0));
    result.unmount();
    client.clear();
  });

  it.each([400, 401, 403, 404, 422, 429])(
    "does not retry HTTP %s",
    async (status) => {
      const client = createQueryClient();
      const fn = vi.fn().mockRejectedValue(new HttpError("Rejected", status));
      await expect(
        client.fetchQuery({ queryKey: ["failure", status], queryFn: fn }),
      ).rejects.toThrow("Rejected");
      expect(fn).toHaveBeenCalledTimes(1);
      client.clear();
    },
  );
  it("retries a server failure once with the configured backoff", async () => {
    const client = createQueryClient();
    const fn = vi.fn().mockRejectedValue(new HttpError("Unavailable", 503));
    const start = Date.now();
    await expect(
      client.fetchQuery({ queryKey: ["failure"], queryFn: fn }),
    ).rejects.toThrow("Unavailable");
    expect(fn).toHaveBeenCalledTimes(2);
    expect(Date.now() - start).toBeGreaterThanOrEqual(950);
    client.clear();
  });
});
