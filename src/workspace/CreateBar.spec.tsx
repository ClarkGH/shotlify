// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import CreateBar from "./CreateBar";

const renderBar = (frameCount: number) => {
  const onCreate = vi.fn();
  render(<CreateBar frameCount={frameCount} onCreate={onCreate} />);
  const button = screen.getByRole("button", { name: "Create slideshow" });
  return { onCreate, button };
};

/* The text a screen reader reads as the button's description. */
const description = (button: HTMLElement) =>
  (button.getAttribute("aria-describedby") ?? "")
    .split(" ")
    .map((id) => document.getElementById(id)?.textContent ?? "")
    .join(" ")
    .trim();

describe("CreateBar", () => {
  it("is a region named for its action", () => {
    renderBar(1);

    expect(screen.getByRole("region", { name: "Create slideshow" }))
      .toBeTruthy();
  });

  it("shows the privacy line", () => {
    renderBar(1);

    expect(
      screen.getByText(
        "Nothing is stored. Download your slideshow or it's gone.",
      ),
    ).toBeTruthy();
  });

  it("blocks with a reason when there are no frames", () => {
    const { button, onCreate } = renderBar(0);

    expect(button.getAttribute("aria-disabled")).toBe("true");
    expect(description(button)).toBe("No frames collected");

    fireEvent.click(button);
    expect(onCreate).not.toHaveBeenCalled();
  });

  it("keeps the reason out of the reading order (hidden, not sr-only)", () => {
    const { button } = renderBar(0);

    // aria-describedby still reads a hidden element; hidden stops a screen
    // reader browsing the page from also reading it as stray text.
    const id = button.getAttribute("aria-describedby") ?? "";
    expect(document.getElementById(id)?.hidden).toBe(true);
  });

  it("stays focusable while blocked, so the reason can be heard", () => {
    const { button } = renderBar(0);

    button.focus();
    expect(document.activeElement).toBe(button);
  });

  it.each([-1, Number.NaN])("blocks on a bad count (%s)", (count) => {
    const { button, onCreate } = renderBar(count);

    fireEvent.click(button);
    expect(button.getAttribute("aria-disabled")).toBe("true");
    expect(onCreate).not.toHaveBeenCalled();
  });

  it("creates when there are frames", () => {
    const { button, onCreate } = renderBar(3);

    expect(button.getAttribute("aria-disabled")).toBeNull();
    expect(description(button)).toBe("");

    fireEvent.click(button);
    expect(onCreate).toHaveBeenCalledTimes(1);
  });
});
