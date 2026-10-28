import { useState } from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, expect, it, vi } from "vitest";
import CutoffField from "../../src/components/CutoffPicker";
import App from "../../src/App";
import { createQueryClient } from "../../src/query";
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
  // jsdom does not provide the browser's native modal/focus implementation.
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
  HTMLElement.prototype.scrollTo = function (options) {
    if (typeof options === "object") this.scrollTop = options.top ?? 0;
  };
  vi.stubGlobal("ResizeObserver", ResizeObserverMock);
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});

function Harness({ changed }: { changed: (value: string) => void }) {
  const [value, setValue] = useState("09:30");
  return (
    <CutoffField
      value={value}
      decisionDate="2026-01-15"
      onChange={(next) => {
        changed(next);
        setValue(next);
      }}
    />
  );
}
function openPicker() {
  fireEvent.click(
    screen.getByRole("button", { name: /Choose forecast cutoff time/ }),
  );
}
async function apply() {
  const button = screen.getByRole("button", { name: "Apply time" });
  await waitFor(() => expect(button.hasAttribute("disabled")).toBe(false));
  fireEvent.click(button);
}

it("opens at the current time, supports keyboard column changes, and applies exactly once", async () => {
  const changed = vi.fn();
  render(<Harness changed={changed} />);
  openPicker();
  const hours = screen.getByRole("listbox", { name: "Cutoff hours" }),
    minutes = screen.getByRole("listbox", { name: "Cutoff minutes" });
  expect(hours.scrollTop).toBe(9 * 44);
  expect(minutes.scrollTop).toBe(30 * 44);
  fireEvent.keyDown(hours, { key: "ArrowDown" });
  fireEvent.keyDown(hours, { key: "ArrowRight" });
  expect(document.activeElement).toBe(minutes);
  fireEvent.keyDown(minutes, { key: "Home" });
  expect(changed).not.toHaveBeenCalled();
  await apply();
  expect(changed).toHaveBeenCalledExactlyOnceWith("10:00");
  expect(screen.queryByRole("dialog")).toBeNull();
  const trigger = screen.getByRole("button", {
    name: "Choose forecast cutoff time (10:00 GMT)",
  });
  expect(document.activeElement).toBe(trigger);
});

it("Cancel and Escape discard draft choices and reopening restores the applied time", () => {
  const changed = vi.fn();
  render(<Harness changed={changed} />);
  openPicker();
  fireEvent.keyDown(screen.getByRole("listbox", { name: "Cutoff minutes" }), {
    key: "End",
  });
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(changed).not.toHaveBeenCalled();
  openPicker();
  expect(
    screen.getByRole("listbox", { name: "Cutoff minutes" }).scrollTop,
  ).toBe(30 * 44);
  fireEvent(
    screen.getByRole("dialog"),
    new Event("cancel", { cancelable: true, bubbles: false }),
  );
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(changed).not.toHaveBeenCalled();
});

it("clamps keyboard navigation at midnight and 23:59", async () => {
  const changed = vi.fn();
  render(<Harness changed={changed} />);
  openPicker();
  const hours = screen.getByRole("listbox", { name: "Cutoff hours" }),
    minutes = screen.getByRole("listbox", { name: "Cutoff minutes" });
  for (const column of [hours, minutes]) {
    fireEvent.keyDown(column, { key: "Home" });
    fireEvent.keyDown(column, { key: "ArrowUp" });
  }
  expect(hours.scrollTop).toBe(0);
  expect(minutes.scrollTop).toBe(0);
  for (const column of [hours, minutes]) {
    fireEvent.keyDown(column, { key: "End" });
    fireEvent.keyDown(column, { key: "ArrowDown" });
  }
  await apply();
  expect(changed).toHaveBeenCalledExactlyOnceWith("23:59");
});

it("keeps keyboard focus inside the picker at both ends of its tab order", () => {
  render(<Harness changed={vi.fn()} />);
  openPicker();
  const first = screen.getByRole("button", { name: "Close cutoff picker" }),
    last = screen.getByRole("button", { name: "Apply time" });
  last.focus();
  fireEvent.keyDown(last, { key: "Tab" });
  expect(document.activeElement).toBe(first);
  fireEvent.keyDown(first, { key: "Tab", shiftKey: true });
  expect(document.activeElement).toBe(last);
});

it("selects snapped scroll positions without reducing minute resolution", async () => {
  const changed = vi.fn();
  render(<Harness changed={changed} />);
  openPicker();
  fireEvent.scroll(screen.getByRole("listbox", { name: "Cutoff hours" }), {
    target: { scrollTop: 7 * 44 },
  });
  fireEvent.scroll(screen.getByRole("listbox", { name: "Cutoff minutes" }), {
    target: { scrollTop: 17 * 44 },
  });
  await apply();
  expect(changed).toHaveBeenCalledExactlyOnceWith("07:17");
});

it("automatically applies the compact topbar cutoff through existing query parameters", async () => {
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
  const initial = fetcher.mock.calls.length;
  fireEvent.click(screen.getByRole("button", { name: "Cutoff 09:30 GMT" }));
  fireEvent.change(screen.getByLabelText(/Forecast cutoff.*UK time/), {
    target: { value: "09:00" },
  });
  expect(fetcher).toHaveBeenCalledTimes(initial);
  expect(screen.queryByRole("button", { name: "Apply time" })).toBeNull();
  await waitFor(() => expect(fetcher.mock.calls.length).toBe(initial + 2));
  const requests = fetcher.mock.calls
    .slice(initial)
    .map(([url]) => String(url));
  expect(requests.every((url) => url.includes("cutoff=09:00"))).toBe(true);
  expect(requests.filter((url) => url.includes("/decision?")).length).toBe(1);
  expect(requests.filter((url) => url.includes("/accuracy?")).length).toBe(1);
  expect(new URL(window.location.href).searchParams.get("cutoff")).toBe(
    "09:00",
  );
  result.unmount();
  client.clear();
});
