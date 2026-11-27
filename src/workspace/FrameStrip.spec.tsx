// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AnnounceProvider, REANNOUNCE_DELAY_MS } from "./announce";
import FrameStrip, { PHOTO_TYPES } from "./FrameStrip";
import { moveItem } from "./model";
import { type Frame } from "./types";

const makeFrames = (...ids: string[]): Frame[] =>
  ids.map((id) => ({
    id,
    blob: new Blob([id]),
    source: { kind: "photo", fileName: `${id}.png` },
    src: `blob:test/${id}`,
  }));

/* Owns the frames like the page will, so moves and removals really
 * re-render. */
const Harness = ({
  initial,
  onAddPhotos = () => undefined,
}: {
  initial: Frame[];
  onAddPhotos?: (files: File[]) => void;
}) => {
  const [frames, setFrames] = useState(initial);
  return (
    <AnnounceProvider>
      <FrameStrip
        frames={frames}
        onMove={(id, to) => setFrames((f) => [...moveItem(f, id, to)])}
        onRemove={(id) => setFrames((f) => f.filter((x) => x.id !== id))}
        onAddPhotos={onAddPhotos}
      />
    </AnnounceProvider>
  );
};

const removeButton = (name: string) => screen.getByRole("button", { name });

const spoken = () => {
  act(() => {
    vi.advanceTimersByTime(REANNOUNCE_DELAY_MS);
  });
  return screen.getByRole("status").textContent;
};

describe("FrameStrip", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("labels the section with its heading and shows the hint", () => {
    render(<Harness initial={makeFrames("a")} />);

    expect(screen.getByRole("region", { name: "Slideshow order" }))
      .toBeTruthy();
    expect(screen.getByText("Frames play left to right.")).toBeTruthy();
  });

  it("lists frames in order with their positions", () => {
    render(<Harness initial={makeFrames("a", "b", "c")} />);

    const list = screen.getByRole("list", {
      name: "Frames in slideshow order",
    });
    const items = list.querySelectorAll("li");
    expect(Array.from(items, (li) => li.dataset.frameId))
      .toEqual(["a", "b", "c"]);
    expect(removeButton("Remove frame 3 of 3")).toBeTruthy();
  });

  it("shows the empty state and no list when there are no frames", () => {
    render(<Harness initial={[]} />);

    expect(screen.getByText("View your slideshow's frames here"))
      .toBeTruthy();
    expect(screen.queryByRole("list")).toBeNull();
  });

  it("offers Add photos for PNG, JPEG and WebP and passes files up", () => {
    const onAddPhotos = vi.fn();
    render(<Harness initial={[]} onAddPhotos={onAddPhotos} />);

    const input = screen.getByLabelText<HTMLInputElement>("Add photos");
    expect(input.accept).toBe(PHOTO_TYPES);
    expect(input.multiple).toBe(true);

    const photo = new File(["x"], "a.png", { type: "image/png" });
    Object.defineProperty(input, "files", {
      value: [photo],
      configurable: true,
    });
    fireEvent.change(input);

    expect(onAddPhotos).toHaveBeenCalledWith([photo]);
  });

  it("moves focus to the frame that slides into place", () => {
    render(<Harness initial={makeFrames("a", "b", "c")} />);

    removeButton("Remove frame 2 of 3").focus();
    fireEvent.click(removeButton("Remove frame 2 of 3"));

    // "c" slid into position 2 of 2.
    expect(document.activeElement).toBe(removeButton("Remove frame 2 of 2"));
    expect(
      (document.activeElement?.closest("li") as HTMLElement).dataset.frameId,
    ).toBe("c");
  });

  it("moves focus back one when the last frame goes", () => {
    render(<Harness initial={makeFrames("a", "b")} />);

    fireEvent.click(removeButton("Remove frame 2 of 2"));

    expect(document.activeElement).toBe(removeButton("Remove frame 1 of 1"));
  });

  it("moves focus to the heading when the only frame goes", () => {
    render(<Harness initial={makeFrames("a")} />);

    fireEvent.click(removeButton("Remove frame 1 of 1"));

    expect(document.activeElement).toBe(
      screen.getByRole("heading", { name: "Slideshow order" }),
    );
    expect(screen.getByText("View your slideshow's frames here"))
      .toBeTruthy();
  });

  it("keeps the heading out of the Tab order", () => {
    render(<Harness initial={[]} />);

    expect(
      screen.getByRole("heading", { name: "Slideshow order" })
        .getAttribute("tabindex"),
    ).toBe("-1");
  });

  it("announces how many frames are left", () => {
    render(<Harness initial={makeFrames("a", "b", "c")} />);

    fireEvent.click(removeButton("Remove frame 1 of 3"));
    expect(spoken()).toBe("Frame removed. 2 left.");

    fireEvent.click(removeButton("Remove frame 1 of 2"));
    fireEvent.click(removeButton("Remove frame 1 of 1"));
    expect(spoken()).toBe("Frame removed. 0 left.");
  });

  describe("moving", () => {
    const order = () =>
      Array.from(document.querySelectorAll("li"), (li) => li.dataset.frameId);
    const focusedFrame = () =>
      (document.activeElement?.closest("li") as HTMLElement | null)?.dataset
        .frameId;

    it("moves a frame later, keeps focus on its later button, announces",
      () => {
        render(<Harness initial={makeFrames("a", "b", "c")} />);
        const later = removeButton("Move frame 1 of 3 later");
        later.focus();

        fireEvent.click(later);

        expect(order()).toEqual(["b", "a", "c"]);
        expect(document.activeElement)
          .toBe(removeButton("Move frame 2 of 3 later"));
        expect(focusedFrame()).toBe("a");
        expect(spoken()).toBe("Moved to position 2 of 3.");
      });

    it("moves a frame earlier and keeps focus on its earlier button", () => {
      render(<Harness initial={makeFrames("a", "b", "c")} />);
      removeButton("Move frame 3 of 3 earlier").focus();

      fireEvent.click(removeButton("Move frame 3 of 3 earlier"));

      expect(order()).toEqual(["a", "c", "b"]);
      expect(document.activeElement)
        .toBe(removeButton("Move frame 2 of 3 earlier"));
      expect(focusedFrame()).toBe("c");
      expect(spoken()).toBe("Moved to position 2 of 3.");
    });

    it("keeps focus on the now-blocked button when a frame reaches an end",
      () => {
        render(<Harness initial={makeFrames("a", "b")} />);
        removeButton("Move frame 2 of 2 earlier").focus();

        fireEvent.click(removeButton("Move frame 2 of 2 earlier"));

        const earlier = removeButton("Move frame 1 of 2 earlier");
        expect(document.activeElement).toBe(earlier);
        expect(earlier.getAttribute("aria-disabled")).toBe("true");
        expect(spoken()).toBe("Moved to position 1 of 2.");
      });

    it("does nothing at the ends: no move, no announcement", () => {
      render(<Harness initial={makeFrames("a", "b")} />);

      fireEvent.click(removeButton("Move frame 1 of 2 earlier"));
      fireEvent.click(removeButton("Move frame 2 of 2 later"));

      expect(order()).toEqual(["a", "b"]);
      expect(spoken()).toBe("");
    });

    it("takes several moves in a row from the keyboard", () => {
      render(<Harness initial={makeFrames("a", "b", "c", "d")} />);
      removeButton("Move frame 1 of 4 later").focus();

      for (let i = 0; i < 3; i += 1) {
        const focused = document.activeElement as HTMLElement;
        fireEvent.click(focused);
      }

      expect(order()).toEqual(["b", "c", "d", "a"]);
      expect(focusedFrame()).toBe("a");
      expect(spoken()).toBe("Moved to position 4 of 4.");
    });
  });
});
