import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Testing Library only auto-cleans when test globals are on; ours are off.
// Unmount whatever a spec rendered so the next one starts with an empty
// document.
afterEach(() => {
  cleanup();
});
