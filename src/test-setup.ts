import "@testing-library/jest-dom/vitest";

import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});

if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

// Node 25+ defines its own global localStorage, which is undefined unless
// Node runs with --localstorage-file. Vitest's jsdom environment only copies
// the window properties the global does not already have, so under Node 26
// jsdom tests see Node's undefined localStorage instead of jsdom's working
// one. Vitest exposes the JSDOM instance as globalThis.jsdom; point
// localStorage back at its window's.
const jsdomWindow = (globalThis as { jsdom?: { window: Window } }).jsdom?.window;
if (jsdomWindow) {
  Object.defineProperty(globalThis, "localStorage", {
    value: jsdomWindow.localStorage,
    configurable: true,
    writable: true,
  });
}

// jsdom has no ResizeObserver; Radix's Slider (via @radix-ui/react-use-size)
// reads it on mount to measure the thumb, so any test rendering a Slider
// throws without this stub.
if (typeof window !== "undefined" && !window.ResizeObserver) {
  window.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// Vitest's built-in Blob/URL shim throws on URL.createObjectURL for a Blob
// built by this codebase's own export/thumbnail code (an internal "_buffer"
// field it expects is absent). Downloads and thumbnail previews only need a
// revocable, unique string here, not a resolvable blob: URL, since nothing
// in jsdom ever navigates to it.
let objectUrlCounter = 0;
URL.createObjectURL = () => `blob:mock-${objectUrlCounter++}`;
URL.revokeObjectURL = () => {};
