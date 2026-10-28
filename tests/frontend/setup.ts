import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/");
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
export class ResizeObserverMock {
  constructor(private callback: ResizeObserverCallback) {}
  observe(target: Element) {
    this.callback(
      [
        {
          target,
          contentRect: { width: 1000, height: 330 },
        } as ResizeObserverEntry,
      ],
      this as unknown as ResizeObserver,
    );
  }
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", ResizeObserverMock);
Object.defineProperty(HTMLElement.prototype, "getBoundingClientRect", {
  configurable: true,
  value: () => ({
    width: 1000,
    height: 330,
    top: 0,
    left: 0,
    right: 1000,
    bottom: 330,
    x: 0,
    y: 0,
    toJSON() {},
  }),
});
Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
  configurable: true,
  get: () => 1000,
});
Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
  configurable: true,
  get: () => 330,
});
