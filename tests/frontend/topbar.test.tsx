import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, expect, it, vi } from "vitest";
import App from "../../src/App";
import { createQueryClient } from "../../src/query";
import { setOutcome } from "../../src/outcome";
import { ResizeObserverMock } from "./setup";
import decision from "./fixtures/decision.json";
import accuracy from "./fixtures/accuracy.json";
import meta from "./fixtures/meta.json";

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
async function mount() {
  const fetcher = vi
    .spyOn(globalThis, "fetch")
    .mockImplementation(
      async (input) =>
        new Response(
          JSON.stringify(
            String(input).includes("/accuracy")
              ? accuracy
              : String(input).includes("/meta")
                ? meta
                : decision,
          ),
          { status: 200 },
        ),
    );
  const client = createQueryClient();
  const result = render(
    <QueryClientProvider client={client}>
      <App />
    </QueryClientProvider>,
  );
  await screen.findByRole("button", { name: "Show actual outcome" });
  await waitFor(() => expect(client.isFetching()).toBe(0));
  return { fetcher, client, ...result };
}

it("restores the shared cutoff from the URL and replaces it after one debounced update without scrolling", async () => {
  window.history.replaceState(null, "", "/?cutoff=09:45&source=review#main");
  const push = vi.spyOn(window.history, "pushState");
  const { fetcher, client, unmount } = await mount();
  expect(
    fetcher.mock.calls
      .filter(([url]) => !String(url).includes("/meta"))
      .every(([url]) => String(url).includes("cutoff=09:45")),
  ).toBe(true);
  const initial = fetcher.mock.calls.length;
  vi.mocked(window.scrollTo).mockClear();
  fireEvent.click(screen.getByRole("button", { name: "Cutoff 09:45 GMT" }));
  const input = screen.getByLabelText("Forecast cutoff · UK time (GMT)");
  for (const value of ["09:00", "08:30", "10:00"])
    fireEvent.change(input, { target: { value } });
  expect(fetcher).toHaveBeenCalledTimes(initial);
  await waitFor(() => expect(fetcher.mock.calls.length).toBe(initial + 2));
  expect(
    fetcher.mock.calls
      .slice(initial)
      .every(([url]) => String(url).includes("cutoff=10:00")),
  ).toBe(true);
  expect(window.location.search).toContain("source=review");
  expect(new URL(window.location.href).searchParams.get("cutoff")).toBe(
    "10:00",
  );
  expect(window.location.hash).toBe("#main");
  expect(push).not.toHaveBeenCalled();
  expect(window.scrollTo).not.toHaveBeenCalled();
  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
  fireEvent.click(
    screen.getByRole("link", { name: "Forecast accuracy", exact: true }),
  );
  expect(screen.getByRole("button", { name: "Cutoff 10:00 GMT" })).toBeTruthy();
  expect(fetcher).toHaveBeenCalledTimes(initial + 2);
  unmount();
  client.clear();
});

it("supports calendar arrows without triggering day shortcuts and returns focus after date selection", async () => {
  const { fetcher, client, unmount } = await mount();
  const initial = fetcher.mock.calls.length;
  fireEvent.click(
    screen.getByRole("button", { name: "Decision date: 15 Jan 2026" }),
  );
  const current = screen.getByRole("button", {
    name: "15 Jan 2026",
    exact: true,
  });
  expect(document.activeElement).toBe(current);
  fireEvent.keyDown(current, { key: "ArrowRight" });
  const next = screen.getByRole("button", { name: "16 Jan 2026", exact: true });
  expect(document.activeElement).toBe(next);
  expect(
    screen
      .getByLabelText("Decision date", { selector: "input" })
      .getAttribute("value"),
  ).toBe("2026-01-15");
  expect(fetcher).toHaveBeenCalledTimes(initial);
  fireEvent.click(next);
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(document.activeElement).toBe(
    screen.getByRole("button", { name: "Decision date: 16 Jan 2026" }),
  );
  await screen.findByRole("heading", { name: "Wind forecast for 17 Jan 2026" });
  expect(
    fetcher.mock.calls
      .slice(initial)
      .filter(([url]) => String(url).includes("/decision?")).length,
  ).toBe(1);
  unmount();
  client.clear();
});

it("keeps popovers keyboard accessible, resets time automatically and validates date ranges without losing the chart", async () => {
  const { container, client, unmount } = await mount();
  fireEvent.click(screen.getByRole("button", { name: "Cutoff 09:30 GMT" }));
  const input = screen.getByLabelText("Forecast cutoff · UK time (GMT)");
  expect(document.activeElement).toBe(input);
  fireEvent.change(input, { target: { value: "10:00" } });
  fireEvent.click(screen.getByRole("button", { name: "Reset to 09:30" }));
  expect((input as HTMLInputElement).value).toBe("09:30");
  const first = screen.getByRole("button", { name: "Close forecast cutoff" });
  const last = screen.getByRole("button", { name: "Reset to 09:30" });
  last.focus();
  fireEvent.keyDown(last, { key: "Tab" });
  expect(document.activeElement).toBe(first);
  fireEvent.keyDown(first, { key: "Tab", shiftKey: true });
  expect(document.activeElement).toBe(last);
  fireEvent.keyDown(input, { key: "Escape" });
  expect(document.activeElement).toBe(
    screen.getByRole("button", { name: "Cutoff 09:30 GMT" }),
  );
  fireEvent.click(
    screen.getByRole("link", { name: "Forecast accuracy", exact: true }),
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Choose decision date range" }),
  );
  fireEvent.change(screen.getByLabelText("First decision date"), {
    target: { value: "2026-01-25" },
  });
  fireEvent.change(screen.getByLabelText("Last decision date"), {
    target: { value: "2026-01-10" },
  });
  await screen.findByText("Start date must be before or equal to end date.");
  expect(container.querySelector(".accuracy-chart")).not.toBeNull();
  fireEvent.change(screen.getByLabelText("First decision date"), {
    target: { value: "" },
  });
  await screen.findByText("Choose January 2026 decision dates.");
  const refresh = screen.getByRole("button", { name: "Refresh data" });
  expect(
    document
      .getElementById(refresh.getAttribute("aria-describedby")!)
      ?.getAttribute("aria-live"),
  ).toBe("polite");
  unmount();
  client.clear();
});
