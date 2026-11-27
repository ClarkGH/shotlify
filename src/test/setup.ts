import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Testing Library only auto-cleans when test globals are on; ours are off.
// Unmount whatever a spec rendered so the next one starts with an empty
// document.
afterEach(() => {
  cleanup();
});

// jsdom has <dialog> but not showModal() or close(). Just enough to open,
// close and fire "close" like a browser; the real thing (focus trap,
// inert page, Esc, backdrop) is checked in Chromium by `pnpm a11y`.
if (
  typeof HTMLDialogElement !== "undefined" &&
  typeof HTMLDialogElement.prototype.showModal !== "function"
) {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    if (!this.hasAttribute("open")) return;
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
}
