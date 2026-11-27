// @vitest-environment jsdom
import { act, render, renderHook, screen } from "@testing-library/react";
import { type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  AnnounceProvider,
  REANNOUNCE_DELAY_MS,
  useAnnounce,
} from "./announce";

const wrapper = ({ children }: { children: ReactNode }) => (
  <AnnounceProvider>{children}</AnnounceProvider>
);

/* Renders the provider and hands back announce() plus the live region. */
const setup = () => {
  const hook = renderHook(() => useAnnounce(), { wrapper });
  const region = screen.getByRole("status");
  // Block bodies on purpose: a callback that returns a value picks act()'s
  // async overload, which hands back a Promise nobody awaits.
  const announce = (message: string): void => {
    act(() => {
      hook.result.current.announce(message);
    });
  };
  const settle = (): void => {
    act(() => {
      vi.advanceTimersByTime(REANNOUNCE_DELAY_MS);
    });
  };

  return { hook, region, announce, settle };
};

describe("AnnounceProvider", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders children and an empty polite live region up front", () => {
    render(
      <AnnounceProvider>
        <p>workspace</p>
      </AnnounceProvider>,
    );

    const region = screen.getByRole("status");
    expect(screen.getByText("workspace")).toBeTruthy();
    expect(region.getAttribute("aria-live")).toBe("polite");
    expect(region.getAttribute("aria-atomic")).toBe("true");
    expect(region.textContent).toBe("");
  });

  it("writes the message into the region after a beat", () => {
    const { region, announce, settle } = setup();

    announce("Frame 3 added.");
    expect(region.textContent).toBe("");

    settle();
    expect(region.textContent).toBe("Frame 3 added.");
  });

  it("empties the region first, so a repeated message is a change", () => {
    const { region, announce, settle } = setup();

    announce("Frame removed. 2 left.");
    settle();
    announce("Frame removed. 2 left.");

    expect(region.textContent).toBe("");
    settle();
    expect(region.textContent).toBe("Frame removed. 2 left.");
  });

  it("speaks only the last of several quick calls", () => {
    const { region, announce, settle } = setup();

    announce("Frame 1 added.");
    announce("Frame 2 added.");
    announce("Frame 3 added.");
    settle();

    expect(region.textContent).toBe("Frame 3 added.");
    act(() => {
      vi.runAllTimers();
    });
    expect(region.textContent).toBe("Frame 3 added.");
  });

  it.each(["", "   "])("ignores a blank message (%j)", (blank) => {
    const { region, announce, settle } = setup();

    announce("Frame 1 added.");
    settle();
    announce(blank);
    settle();

    expect(region.textContent).toBe("Frame 1 added.");
  });

  it("keeps announce() the same function across re-renders", () => {
    const { hook } = setup();
    const first = hook.result.current.announce;

    hook.rerender();

    expect(hook.result.current.announce).toBe(first);
  });

  it("cancels a pending message on unmount", () => {
    const { hook, announce } = setup();

    announce("Frame 1 added.");
    hook.unmount();

    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("useAnnounce", () => {
  it("throws outside the provider instead of failing silently", () => {
    // React 18 logs the error and rethrows it through window's "error"
    // event, which jsdom prints. Both are expected here; keep output clean.
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const swallow = (event: ErrorEvent) => event.preventDefault();
    window.addEventListener("error", swallow);

    try {
      expect(() => renderHook(() => useAnnounce())).toThrow(
        "useAnnounce must be used inside <AnnounceProvider>",
      );
    } finally {
      window.removeEventListener("error", swallow);
    }
  });
});
