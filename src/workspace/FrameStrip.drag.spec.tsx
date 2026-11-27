// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AnnounceProvider, REANNOUNCE_DELAY_MS } from "./announce";
import FrameStrip from "./FrameStrip";
import { moveItem } from "./model";
import { type Frame } from "./types";

/* Pointer drag in jsdom. There's no layout, so getBoundingClientRect is
 * faked: tiles are 168×138, 14 apart, `perRow` to a row; the strip's dark
 * box (the drop zone) is 0..1000 × 0..400. Real Chromium runs in 4c.5. */
let perRow = Infinity;
/* The strip's sideways scroll: tiles shift left by this much. */
let stripScroll = 0;
/* The strip's height; taller than jsdom's 768px window runs off screen. */
let zoneHeight = 400;

const fakeLayout = () => {
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
    function (this: Element) {
      const box = (left: number, top: number, w: number, h: number) =>
        ({
          left, top, right: left + w, bottom: top + h, width: w, height: h,
          x: left, y: top, toJSON: () => ({}),
        }) as DOMRect;

      const tiles = Array.from(document.querySelectorAll("[data-frame-id]"));
      const index = tiles.indexOf(this);
      if (index !== -1) {
        const column = index % perRow;
        const row = Math.floor(index / perRow);
        return box(column * 182 - stripScroll, row * 152, 168, 138);
      }
      if (this.querySelector("ol")) return box(0, 0, 1000, zoneHeight);
      return box(0, 0, 0, 0);
    },
  );
};

const makeFrames = (...ids: string[]): Frame[] =>
  ids.map((id) => ({
    id,
    blob: new Blob([id]),
    source: { kind: "photo", fileName: `${id}.png` },
    src: `blob:test/${id}`,
  }));

const Harness = ({ initial }: { initial: Frame[] }) => {
  const [frames, setFrames] = useState(initial);
  return (
    <AnnounceProvider>
      <FrameStrip
        frames={frames}
        onMove={(id, to) => setFrames((f) => [...moveItem(f, id, to)])}
        onRemove={(id) => setFrames((f) => f.filter((x) => x.id !== id))}
        onAddPhotos={() => undefined}
      />
    </AnnounceProvider>
  );
};

const order = () =>
  Array.from(
    document.querySelectorAll<HTMLElement>("li[data-frame-id]"),
    (li) => li.dataset.frameId,
  );
const photo = (id: string) => {
  const element = document.querySelector(`[data-frame-id="${id}"] img`)
    ?.parentElement;
  if (!element) throw new Error(`no photo for ${id}`);
  return element;
};
const ghost = () => document.body.querySelector(":scope > li[aria-hidden]");
const markOf = (id: string) =>
  document.querySelector(`[data-frame-id="${id}"]`)?.getAttribute("data-drop");

type Init = { x: number; y: number; type?: string; button?: number };
const pointer = (
  kind: "pointerDown" | "pointerMove" | "pointerUp" | "pointerCancel",
  element: HTMLElement,
  { x, y, type = "mouse", button = 0 }: Init,
) =>
  fireEvent[kind](element, {
    pointerId: 1,
    pointerType: type,
    button,
    clientX: x,
    clientY: y,
  });

const handle = (id: string) => {
  const element = document.querySelector<HTMLElement>(
    `[data-frame-id="${id}"] [data-drag-handle]`,
  );
  if (!element) throw new Error(`no handle for ${id}`);
  return element;
};

/* Press on `id`'s photo (or handle), move through `path`, and (unless
 * `release` is false) let go at the last point. Points are in the fake
 * layout. */
const drag = (
  id: string,
  path: Init[],
  release = true,
  from: "photo" | "handle" = "photo",
) => {
  const target = from === "photo" ? photo(id) : handle(id);
  const [first, ...rest] = path;
  if (!first) throw new Error("empty path");
  pointer("pointerDown", target, first);
  for (const point of rest) pointer("pointerMove", target, point);
  const last = rest[rest.length - 1] ?? first;
  if (release) pointer("pointerUp", target, last);
  return target;
};

const spoken = async () => {
  await act(
    () =>
      new Promise((resolve) => {
        setTimeout(resolve, REANNOUNCE_DELAY_MS + 10);
      }),
  );
  return screen.getByRole("status").textContent;
};

describe("FrameStrip drag (mouse and pen)", () => {
  beforeEach(() => {
    perRow = Infinity;
    stripScroll = 0;
    zoneHeight = 400;
    fakeLayout();
  });

  it("moves a frame where it's dropped and announces it", async () => {
    render(<Harness initial={makeFrames("a", "b", "c")} />);

    // From the middle of a to past c's middle: the gap after c.
    drag("a", [{ x: 80, y: 60 }, { x: 200, y: 60 }, { x: 480, y: 60 }]);

    expect(order()).toEqual(["b", "c", "a"]);
    expect(await spoken()).toBe("Moved to position 3 of 3.");
  });

  it("moves a frame earlier too", () => {
    render(<Harness initial={makeFrames("a", "b", "c")} />);

    drag("c", [{ x: 440, y: 60 }, { x: 300, y: 60 }, { x: 40, y: 60 }]);

    expect(order()).toEqual(["c", "a", "b"]);
  });

  it("works with a pen", () => {
    render(<Harness initial={makeFrames("a", "b")} />);

    drag("a", [
      { x: 80, y: 60, type: "pen" },
      { x: 330, y: 60, type: "pen" },
    ]);

    expect(order()).toEqual(["b", "a"]);
  });

  it("drops into the next row when the strip wraps", () => {
    perRow = 2;
    // Row 1: a b. Row 2: c d.
    render(<Harness initial={makeFrames("a", "b", "c", "d")} />);

    drag("a", [{ x: 80, y: 60 }, { x: 100, y: 120 }, { x: 260, y: 220 }]);

    expect(order()).toEqual(["b", "c", "a", "d"]);
  });

  describe("one tile per row (narrow phones)", () => {
    // A column: a at y 0..138, b 152..290, c 304..442, all at left 0,
    // in a strip tall enough to hold it.
    beforeEach(() => {
      perRow = 1;
      zoneHeight = 600;
    });

    it("drops into the middle when dragged straight down", () => {
      render(<Harness initial={makeFrames("a", "b", "c")} />);

      // Down onto b's lower half: the gap between b and c.
      drag("a", [{ x: 40, y: 60 }, { x: 40, y: 150 }, { x: 40, y: 250 }]);

      expect(order()).toEqual(["b", "a", "c"]);
    });

    it("draws the bar across the tile, not down its side", () => {
      render(<Harness initial={makeFrames("a", "b", "c")} />);

      drag("a", [{ x: 40, y: 60 }, { x: 40, y: 250 }], false);

      expect(markOf("c")).toBe("above");
    });

    it("marks below the last tile when dropping at the end", () => {
      render(<Harness initial={makeFrames("a", "b", "c")} />);

      drag("a", [{ x: 40, y: 60 }, { x: 40, y: 430 }], false);

      expect(markOf("c")).toBe("below");
    });

    it("moves up the column too", () => {
      render(<Harness initial={makeFrames("a", "b", "c")} />);

      drag("c", [{ x: 40, y: 360 }, { x: 40, y: 200 }, { x: 40, y: 170 }]);

      expect(order()).toEqual(["a", "c", "b"]);
    });
  });

  it("keeps the bar beside tiles that share a row", () => {
    perRow = 2;
    // a b / c d / e: only e is alone.
    render(<Harness initial={makeFrames("a", "b", "c", "d", "e")} />);

    drag("a", [{ x: 80, y: 60 }, { x: 120, y: 200 }], false);
    expect(markOf("d")).toBe("before");
  });

  it("shows a ghost, dims the original and marks the gap while dragging",
    () => {
      render(<Harness initial={makeFrames("a", "b", "c")} />);

      drag("a", [{ x: 80, y: 60 }, { x: 300, y: 60 }], false);

      const copy = ghost();
      expect(copy).not.toBeNull();
      expect(copy?.hasAttribute("inert")).toBe(true);
      expect(copy?.hasAttribute("data-frame-id")).toBe(false);
      // Fixed to the viewport; the tile's `relative` would override it.
      expect(copy?.classList.contains("fixed")).toBe(true);
      expect(copy?.classList.contains("relative")).toBe(false);
      expect(
        document.querySelector('[data-frame-id="a"]')
          ?.hasAttribute("data-dragging"),
      ).toBe(true);
      // Pointer over b's right half: the gap before c.
      expect(markOf("c")).toBe("before");
      expect(markOf("b")).toBeNull();
    });

  it("marks the end of the list with the last tile's after-bar", () => {
    render(<Harness initial={makeFrames("a", "b", "c")} />);

    drag("a", [{ x: 80, y: 60 }, { x: 900, y: 60 }], false);

    expect(markOf("c")).toBe("after");
  });

  it("shows no mark over the frame's own place (it wouldn't move)", () => {
    render(<Harness initial={makeFrames("a", "b", "c")} />);

    drag("b", [{ x: 250, y: 60 }, { x: 200, y: 60 }], false);

    expect(document.querySelector("[data-drop]")).toBeNull();
  });

  it("cleans up after a drop: no ghost, no dimming, no marks", () => {
    render(<Harness initial={makeFrames("a", "b", "c")} />);

    drag("a", [{ x: 80, y: 60 }, { x: 480, y: 60 }]);

    expect(ghost()).toBeNull();
    expect(document.querySelector("[data-dragging], [data-drop]")).toBeNull();
  });

  describe("moves nothing when", () => {
    it("the pointer barely moved (it was a click)", () => {
      render(<Harness initial={makeFrames("a", "b")} />);

      drag("a", [{ x: 80, y: 60 }, { x: 83, y: 62 }]);

      expect(order()).toEqual(["a", "b"]);
      expect(ghost()).toBeNull();
    });

    it("Escape is pressed mid-drag", () => {
      render(<Harness initial={makeFrames("a", "b")} />);
      const target = drag("a", [{ x: 80, y: 60 }, { x: 330, y: 60 }], false);

      fireEvent.keyDown(window, { key: "Escape" });
      pointer("pointerUp", target, { x: 330, y: 60 });

      expect(order()).toEqual(["a", "b"]);
      expect(ghost()).toBeNull();
    });

    it("it's released outside the strip", () => {
      render(<Harness initial={makeFrames("a", "b")} />);

      drag("a", [{ x: 80, y: 60 }, { x: 330, y: 60 }, { x: 330, y: 900 }]);

      expect(order()).toEqual(["a", "b"]);
    });

    it("it's released outside with no move event out there first", () => {
      render(<Harness initial={makeFrames("a", "b")} />);
      const target = drag("a", [{ x: 80, y: 60 }, { x: 330, y: 60 }], false);

      // A fast flick: the up arrives outside before any move does.
      pointer("pointerUp", target, { x: 330, y: 900 });

      expect(order()).toEqual(["a", "b"]);
    });

    it("the browser cancels the pointer", () => {
      render(<Harness initial={makeFrames("a", "b")} />);
      const target = drag("a", [{ x: 80, y: 60 }, { x: 330, y: 60 }], false);

      pointer("pointerCancel", target, { x: 330, y: 60 });

      expect(order()).toEqual(["a", "b"]);
      expect(ghost()).toBeNull();
    });

    it("it's dropped back on its own place", async () => {
      render(<Harness initial={makeFrames("a", "b", "c")} />);

      drag("b", [{ x: 250, y: 60 }, { x: 320, y: 60 }]);

      expect(order()).toEqual(["a", "b", "c"]);
      expect(await spoken()).toBe("");
    });

    it("a finger drags on the photo (that scrolls the strip)", () => {
      render(<Harness initial={makeFrames("a", "b")} />);

      drag("a", [
        { x: 80, y: 60, type: "touch" },
        { x: 330, y: 60, type: "touch" },
      ]);

      expect(order()).toEqual(["a", "b"]);
      expect(ghost()).toBeNull();
    });

    it("it's not the main mouse button", () => {
      render(<Harness initial={makeFrames("a", "b")} />);

      drag("a", [
        { x: 80, y: 60, button: 2 },
        { x: 330, y: 60, button: 2 },
      ]);

      expect(order()).toEqual(["a", "b"]);
    });
  });

  describe("the handle", () => {
    // The handle sits under the photo; where on the tile the press
    // starts doesn't matter to the geometry, only the path does.
    it("lets a finger drag", async () => {
      render(<Harness initial={makeFrames("a", "b", "c")} />);

      drag(
        "a",
        [
          { x: 20, y: 120, type: "touch" },
          { x: 200, y: 100, type: "touch" },
          { x: 480, y: 60, type: "touch" },
        ],
        true,
        "handle",
      );

      expect(order()).toEqual(["b", "c", "a"]);
      expect(await spoken()).toBe("Moved to position 3 of 3.");
    });

    it("lets a mouse drag too", () => {
      render(<Harness initial={makeFrames("a", "b")} />);

      drag("a", [{ x: 20, y: 120 }, { x: 330, y: 60 }], true, "handle");

      expect(order()).toEqual(["b", "a"]);
    });

    it("ignores a tap", () => {
      render(<Harness initial={makeFrames("a", "b")} />);

      drag(
        "a",
        [{ x: 20, y: 120, type: "touch" }, { x: 22, y: 121, type: "touch" }],
        true,
        "handle",
      );

      expect(order()).toEqual(["a", "b"]);
      expect(ghost()).toBeNull();
    });

    it("turns off browser panning there only, and stays out of the a11y tree",
      () => {
        render(<Harness initial={makeFrames("a")} />);

        const grip = handle("a");
        expect(grip.classList.contains("touch-none")).toBe(true);
        expect(grip.getAttribute("aria-hidden")).toBe("true");
        expect(grip.textContent).toBe("01");
        expect(photo("a").classList.contains("touch-none")).toBe(false);
      });
  });

  describe("auto-scroll", () => {
    // 8 tiles run 0..1442 in a 1000-wide strip.
    const MAX_STRIP_SCROLL = 470;
    let pageScroll: ReturnType<typeof vi.fn<(x: number, y: number) => void>>;

    beforeEach(() => {
      vi.useFakeTimers({
        toFake: [
          "requestAnimationFrame", "cancelAnimationFrame",
          "setTimeout", "clearTimeout",
        ],
      });
      pageScroll = vi.fn<(x: number, y: number) => void>();
      vi.spyOn(window, "scrollBy").mockImplementation(pageScroll);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    /* jsdom has no scrolling: give the strip a working scrollLeft that
     * the fake layout follows. */
    const renderScrollable = () => {
      render(
        <Harness
          initial={makeFrames("a", "b", "c", "d", "e", "f", "g", "h")}
        />,
      );
      const zone = document.querySelector("ol")?.parentElement;
      if (!zone) throw new Error("no strip");
      Object.defineProperty(zone, "scrollLeft", {
        configurable: true,
        get: () => stripScroll,
        set: (value: number) => {
          stripScroll = Math.max(0, Math.min(value, MAX_STRIP_SCROLL));
        },
      });
    };

    const frames = (count: number) => {
      act(() => {
        vi.advanceTimersByTime(16 * count);
      });
    };

    it("scrolls the strip near its edge and drops where the tiles went",
      () => {
        renderScrollable();
        const target = drag("a", [{ x: 80, y: 60 }, { x: 990, y: 60 }], false);

        frames(60);
        expect(stripScroll).toBe(MAX_STRIP_SCROLL);
        pointer("pointerUp", target, { x: 990, y: 60 });

        // Scrolled to the end, the pointer is past h: a goes last.
        expect(order()).toEqual(["b", "c", "d", "e", "f", "g", "h", "a"]);
      });

    it("stays still away from the edges", () => {
      renderScrollable();
      drag("a", [{ x: 80, y: 60 }, { x: 500, y: 60 }], false);

      frames(30);

      expect(stripScroll).toBe(0);
      expect(pageScroll).not.toHaveBeenCalled();
    });

    it("scrolls the page near the bottom while the strip runs past it",
      () => {
        zoneHeight = 2000;
        renderScrollable();
        drag(
          "a",
          [{ x: 80, y: 60 }, { x: 500, y: window.innerHeight - 5 }],
          false,
        );

        frames(3);

        expect(pageScroll).toHaveBeenCalled();
        expect(pageScroll.mock.calls.every(([x, y]) => x === 0 && y > 0))
          .toBe(true);
      });

    it("doesn't scroll the page past the end of the strip", () => {
      // The 400px strip already ends on screen: nothing more to reach.
      renderScrollable();
      drag(
        "a",
        [{ x: 80, y: 60 }, { x: 500, y: window.innerHeight - 5 }],
        false,
      );

      frames(10);

      expect(pageScroll).not.toHaveBeenCalled();
    });

    it("stops scrolling once the drag ends", () => {
      renderScrollable();
      drag("a", [{ x: 80, y: 60 }, { x: 990, y: 60 }]);
      const after = stripScroll;

      frames(30);

      expect(stripScroll).toBe(after);
    });

    it("follows a wheel scroll even if the pointer doesn't move", () => {
      renderScrollable();
      drag("a", [{ x: 80, y: 60 }, { x: 600, y: 60 }], false);
      // x 600 is over d's left half (d is 546..714): the gap before d.
      expect(markOf("d")).toBe("before");

      stripScroll = 364; // a wheel moved the strip two tiles along
      frames(1);

      // Now 600 + 364 = 964, left of f's middle (994): before f.
      expect(markOf("d")).toBeNull();
      expect(markOf("f")).toBe("before");
    });
  });

  it("recovers from a drag the browser never ended", () => {
    render(<Harness initial={makeFrames("a", "b", "c")} />);
    // a's drag is left hanging: no pointerup or pointercancel ever comes.
    drag("a", [{ x: 80, y: 60 }, { x: 300, y: 60 }], false);
    expect(ghost()).not.toBeNull();

    // The next press still works, and the stale drag moved nothing.
    drag("c", [{ x: 440, y: 60 }, { x: 300, y: 60 }, { x: 40, y: 60 }]);

    expect(order()).toEqual(["c", "a", "b"]);
    expect(document.querySelectorAll("body > li[aria-hidden]")).toHaveLength(0);
    expect(document.querySelector("[data-dragging]")).toBeNull();
  });

  it("doesn't open the gallery when a drag ends, but a plain click does",
    () => {
      render(<Harness initial={makeFrames("a", "b")} />);
      const gallery = () => document.querySelector("dialog")?.open;

      const target = drag("a", [{ x: 80, y: 60 }, { x: 330, y: 60 }]);
      fireEvent.click(target);
      expect(gallery()).toBe(false);

      fireEvent.click(photo("a"));
      expect(gallery()).toBe(true);
    });

  it("swallows the click that ends a drag, but not a plain click", () => {
    render(<Harness initial={makeFrames("a", "b")} />);
    const clicks = vi.fn();
    document.addEventListener("click", clicks);

    const target = drag("a", [{ x: 80, y: 60 }, { x: 330, y: 60 }]);
    fireEvent.click(target);
    expect(clicks).not.toHaveBeenCalled();

    drag("b", [{ x: 80, y: 60 }, { x: 81, y: 60 }]);
    fireEvent.click(photo("b"));
    expect(clicks).toHaveBeenCalledTimes(1);

    document.removeEventListener("click", clicks);
  });
});
