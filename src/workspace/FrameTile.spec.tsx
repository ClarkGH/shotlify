// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import FrameTile from "./FrameTile";
import { type Frame } from "./types";

const frame: Frame = { id: "f-2", src: "data:image/png;base64,aGk=" };

/* A tile is an <li>, so render it inside an <ol> like FrameStrip does. */
const renderTile = (onRemove = vi.fn()) => {
  const list = document.body.appendChild(document.createElement("ol"));
  const view = render(
    <FrameTile frame={frame} position={2} total={5} onRemove={onRemove} />,
    { container: list },
  );
  return { ...view, onRemove };
};

describe("FrameTile", () => {
  it("is a list item tagged with its frame id", () => {
    renderTile();

    const item = screen.getByRole("listitem");
    expect(item.getAttribute("data-frame-id")).toBe("f-2");
  });

  it("shows the frame with alt text naming its position", () => {
    renderTile();

    const image = screen.getByRole("img", { name: "Frame 2" });
    expect(image.getAttribute("src")).toBe(frame.src);
  });

  it("names the remove button with position and total", () => {
    renderTile();

    expect(
      screen.getByRole("button", { name: "Remove frame 2 of 5" }),
    ).toBeTruthy();
  });

  it("reports its own id once when remove is pressed", () => {
    const { onRemove } = renderTile();

    fireEvent.click(screen.getByRole("button"));

    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onRemove).toHaveBeenCalledWith("f-2");
  });

  it("is a plain button, so it never submits a surrounding form", () => {
    renderTile();

    expect(screen.getByRole("button").getAttribute("type")).toBe("button");
  });

  it("shows a zero-padded number that screen readers skip", () => {
    const { container } = renderTile();

    const number = container.querySelector("[aria-hidden='true']");
    expect(number?.textContent).toBe("02");
  });
});
