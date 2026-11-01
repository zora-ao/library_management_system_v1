import "@testing-library/jest-dom/vitest";

class ResizeObserverMock {
  constructor(callback: ResizeObserverCallback) {
    void callback;
  }

  observe(target: Element) {
    void target;
  }

  unobserve(target: Element) {
    void target;
  }

  disconnect() {}
}

globalThis.ResizeObserver = ResizeObserverMock as typeof ResizeObserver;
