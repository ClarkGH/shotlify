// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import FrameTile from "./FrameTile";
import { type Frame } from "./types";

const frame: Frame = {
  id: "f-2",
  blob: new Blob(["hi"]),
  source: { kind: "capture", videoName: "dance.mov", time: 12 },
  src: "blob:test/f-2",
};

/* A tile is an <li>, so render it inside an <ol> like FrameStrip does. */
const renderTile = (position = 2, total = 5) => {
  const onMove = vi.fn();
  const onRemove = vi.fn();
  const list = document.body.appendChild(document.createElement("ol"));
  const view = render(
    <FrameTile
      frame={frame}
      position={position}
      total={total}
      onMove={onMove}
      onRemove={onRemove}
    />,
    { container: list },
  );
  return { ...view, onMove, onRemove };
};

const button = (name: string) => screen.getByRole("button", { name });

describe("FrameTile", () => {
  it("is a list item tagged with its frame id", () => {
    renderTile();

    const item = screen.getByRole("listitem");
    expect(item.getAttribute("data-frame-id")).toBe("f-2");
  });

  it("shows the frame with alt text naming its position and source", () => {
    renderTile();

    const image = screen.getByRole("img", {
      name: "Frame 2, from dance.mov at 00:12",
    });
    expect(image.getAttribute("src")).toBe(frame.src);
  });

  it("names its buttons with position and total, in reading order", () => {
    renderTile();

    expect(
      screen.getAllByRole("button").map((b) => b.getAttribute("aria-label")),
    ).toEqual([
      "View frame 2, from dance.mov at 00:12",
      "Move frame 2 of 5 earlier",
      "Move frame 2 of 5 later",
      "Remove frame 2 of 5",
    ]);
  });

  it("reports a move earlier or later with its own id", () => {
    const { onMove } = renderTile();

    fireEvent.click(button("Move frame 2 of 5 earlier"));
    fireEvent.click(button("Move frame 2 of 5 later"));

    expect(onMove.mock.calls).toEqual([
      ["f-2", -1],
      ["f-2", 1],
    ]);
  });

  it("reports its own id once when remove is pressed", () => {
    const { onRemove } = renderTile();

    fireEvent.click(button("Remove frame 2 of 5"));

    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onRemove).toHaveBeenCalledWith("f-2");
  });

  it("blocks moving the first frame earlier, but keeps it focusable", () => {
    const { onMove } = renderTile(1, 3);
    const earlier = button("Move frame 1 of 3 earlier");

    fireEvent.click(earlier);

    expect(onMove).not.toHaveBeenCalled();
    expect(earlier.getAttribute("aria-disabled")).toBe("true");
    expect(earlier.hasAttribute("disabled")).toBe(false);
    expect(button("Move frame 1 of 3 later").getAttribute("aria-disabled"))
      .toBeNull();
  });

  it("blocks moving the last frame later", () => {
    const { onMove } = renderTile(3, 3);

    fireEvent.click(button("Move frame 3 of 3 later"));

    expect(onMove).not.toHaveBeenCalled();
    expect(button("Move frame 3 of 3 later").getAttribute("aria-disabled"))
      .toBe("true");
  });

  it("blocks both moves when it's the only frame", () => {
    renderTile(1, 1);

    expect(button("Move frame 1 of 1 earlier").getAttribute("aria-disabled"))
      .toBe("true");
    expect(button("Move frame 1 of 1 later").getAttribute("aria-disabled"))
      .toBe("true");
  });

  it("uses plain buttons, so none submits a surrounding form", () => {
    renderTile();

    for (const b of screen.getAllByRole("button")) {
      expect(b.getAttribute("type")).toBe("button");
    }
  });

  it("shows a zero-padded number that screen readers skip", () => {
    const { container } = renderTile();

    const number = container.querySelector("[aria-hidden='true']");
    expect(number?.textContent).toBe("02");
  });
});
