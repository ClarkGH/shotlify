import { describe, expect, it } from "vitest";

import {
  aloneInRow,
  DRAG_THRESHOLD,
  dropSlot,
  edgeSpeed,
  MAX_SCROLL,
  passedThreshold,
  type Rect,
  scrollSpeeds,
  slotToIndex,
} from "./drag";

/* Tiles like the real strip: 168 wide, 138 tall, 14 apart. `perRow`
 * wraps them the way the strip does below sm. */
const tiles = (count: number, perRow = Infinity): Rect[] =>
  Array.from({ length: count }, (_, i) => {
    const column = i % perRow;
    const row = Math.floor(i / perRow);
    const left = column * 182;
    const top = row * 152;
    return { left, top, right: left + 168, bottom: top + 138 };
  });

describe("passedThreshold", () => {
  it("stays a click until the pointer moves far enough", () => {
    const start = { x: 100, y: 100 };

    expect(passedThreshold(start, { x: 103, y: 104 })).toBe(false);
    expect(passedThreshold(start, { x: 100 + DRAG_THRESHOLD, y: 100 }))
      .toBe(true);
  });

  it("counts movement in any direction", () => {
    expect(passedThreshold({ x: 0, y: 0 }, { x: -5, y: -5 })).toBe(true);
  });
});

describe("dropSlot, one row (the filmstrip)", () => {
  const row = tiles(3);

  it.each([
    ["left of everything", -50, 0],
    ["over the first tile's left half", 40, 0],
    ["over the first tile's right half", 120, 1],
    ["in the gap after the first tile", 175, 1],
    ["over the middle tile's right half", 300, 2],
    ["over the last tile's right half", 500, 3],
    ["right of everything", 900, 3],
  ])("%s → slot %i", (_, x, slot) => {
    expect(dropSlot(row, { x, y: 60 })).toBe(slot);
  });

  it("ignores how far above or below the row the pointer is", () => {
    expect(dropSlot(row, { x: 120, y: -400 })).toBe(1);
    expect(dropSlot(row, { x: 120, y: 900 })).toBe(1);
  });
});

describe("dropSlot, wrapped rows (320px)", () => {
  // Row 1: tiles 0 1 2 (y 0..138). Row 2: tiles 3 4 (y 152..290).
  const wrapped = tiles(5, 3);

  it("picks a slot in the row under the pointer", () => {
    expect(dropSlot(wrapped, { x: 40, y: 200 })).toBe(3);
    expect(dropSlot(wrapped, { x: 300, y: 200 })).toBe(5);
  });

  it("drops at the end of a row before the next row's first tile", () => {
    expect(dropSlot(wrapped, { x: 520, y: 60 })).toBe(3);
  });

  it("uses the nearest row when the pointer is between rows", () => {
    expect(dropSlot(wrapped, { x: 40, y: 140 })).toBe(0);
    expect(dropSlot(wrapped, { x: 40, y: 150 })).toBe(3);
  });

  it("uses the last row below everything, the first above", () => {
    expect(dropSlot(wrapped, { x: 120, y: 2000 })).toBe(4);
    expect(dropSlot(wrapped, { x: 120, y: -2000 })).toBe(1);
  });
});

describe("dropSlot, one tile per row (narrow phones)", () => {
  // A column: every tile has the same left edge, one below the other
  // (y 0..138, 152..290, 304..442).
  const column = tiles(3, 1);

  it.each([
    ["the first tile's upper half", 40, 0],
    ["the first tile's lower half", 100, 1],
    ["the gap between the first two", 145, 1],
    ["the middle tile's lower half", 260, 2],
    ["the last tile's lower half", 420, 3],
    ["below everything", 900, 3],
  ])("%s (y %i) → slot %i", (_, y, slot) => {
    // x stays at the left, where a finger on the handle would be.
    expect(dropSlot(column, { x: 20, y })).toBe(slot);
  });

  it("ignores x within a one-tile row", () => {
    expect(dropSlot(column, { x: 160, y: 40 })).toBe(0);
    expect(dropSlot(column, { x: 5, y: 260 })).toBe(2);
  });

  it("uses height for a lone tile on the last row of a wrapped strip",
    () => {
      // Two per row, five tiles: e sits alone on row 3 (y 304..442).
      const wrapped = tiles(5, 2);

      expect(dropSlot(wrapped, { x: 20, y: 320 })).toBe(4);
      expect(dropSlot(wrapped, { x: 20, y: 430 })).toBe(5);
      // Rows with two tiles still go by x.
      expect(dropSlot(wrapped, { x: 120, y: 200 })).toBe(3);
    });
});

describe("aloneInRow", () => {
  it("is true for each tile of a column, false in a shared row", () => {
    expect([0, 1, 2].map((i) => aloneInRow(tiles(3, 1), i)))
      .toEqual([true, true, true]);
    expect([0, 1, 2].map((i) => aloneInRow(tiles(3), i)))
      .toEqual([false, false, false]);
  });

  it("is true only for the odd tile out on a wrapped last row", () => {
    expect([0, 1, 2, 3, 4].map((i) => aloneInRow(tiles(5, 2), i)))
      .toEqual([false, false, false, false, true]);
  });

  it("is false for an index that isn't there", () => {
    expect(aloneInRow(tiles(2), 5)).toBe(false);
    expect(aloneInRow([], 0)).toBe(false);
  });
});

describe("dropSlot, edge cases", () => {
  it("returns 0 with no tiles", () => {
    expect(dropSlot([], { x: 10, y: 10 })).toBe(0);
  });

  it("handles a single tile (alone in its row: by height)", () => {
    const one = tiles(1);

    expect(dropSlot(one, { x: 160, y: 10 })).toBe(0);
    expect(dropSlot(one, { x: 10, y: 130 })).toBe(1);
  });
});

describe("slotToIndex", () => {
  // Dragging frame 1 (index 1) of a, B, c, d: slots 0..4.
  it.each([
    [0, 0, "before a"],
    [1, 1, "the gap just before itself: no move"],
    [2, 1, "the gap just after itself: no move"],
    [3, 2, "between c and d"],
    [4, 3, "after d"],
  ])("slot %i → index %i (%s)", (slot, index) => {
    expect(slotToIndex(slot, 1)).toBe(index);
  });

  it("never moves a frame dropped beside itself", () => {
    for (let from = 0; from < 5; from += 1) {
      expect(slotToIndex(from, from)).toBe(from);
      expect(slotToIndex(from + 1, from)).toBe(from);
    }
  });
});

describe("scrollSpeeds", () => {
  // The strip at 20..1000 × 500..700 in a 900px-tall window.
  const zone = { left: 20, top: 500, right: 1000, bottom: 700 };

  it("is still in the middle of everything", () => {
    expect(scrollSpeeds({ x: 500, y: 600 }, zone, 900))
      .toEqual({ strip: 0, page: 0 });
  });

  it("scrolls the strip near its sides, while level with it", () => {
    expect(scrollSpeeds({ x: 25, y: 600 }, zone, 900).strip)
      .toBeLessThan(0);
    expect(scrollSpeeds({ x: 995, y: 600 }, zone, 900).strip)
      .toBeGreaterThan(0);
  });

  it("leaves the strip alone when the pointer is above or below it", () => {
    expect(scrollSpeeds({ x: 25, y: 300 }, zone, 900).strip).toBe(0);
    expect(scrollSpeeds({ x: 25, y: 800 }, zone, 900).strip).toBe(0);
  });

  it("scrolls the page near the top or bottom while strip is past it", () => {
    // A tall wrapped strip running off both ends of the window.
    const tall = { left: 0, top: -300, right: 400, bottom: 1500 };

    expect(scrollSpeeds({ x: 200, y: 10 }, tall, 900).page)
      .toBeLessThan(0);
    expect(scrollSpeeds({ x: 200, y: 890 }, tall, 900).page)
      .toBeGreaterThan(0);
  });

  it("doesn't scroll the page when the strip is all on the other side",
    () => {
      // The strip is 500..700: nothing of it below 890 or above 10.
      expect(scrollSpeeds({ x: 500, y: 890 }, zone, 900).page).toBe(0);
      expect(scrollSpeeds({ x: 500, y: 10 }, zone, 900).page).toBe(0);
    });

  it("slows to a stop as the strip's end reaches the pointer", () => {
    const at = (bottom: number) =>
      scrollSpeeds(
        { x: 200, y: 895 },
        { left: 0, top: 0, right: 400, bottom },
        900,
      ).page;

    // Plenty of strip below: full speed for that spot (15).
    expect(at(2000)).toBe(edgeSpeed(895, 0, 900));
    expect(at(900)).toBe(4);
    expect(at(896)).toBe(0);
    expect(at(895)).toBe(0);
  });

  it("does the same going up", () => {
    const at = (top: number) =>
      scrollSpeeds(
        { x: 200, y: 5 },
        { left: 0, top, right: 400, bottom: 900 },
        900,
      ).page;

    expect(at(-2000)).toBe(edgeSpeed(5, 0, 900));
    expect(at(0)).toBe(-4);
    expect(at(4)).toBe(0);
  });

  it("can do both at once in a corner", () => {
    const corner = { left: 0, top: 0, right: 400, bottom: 1200 };
    const speeds = scrollSpeeds({ x: 395, y: 895 }, corner, 900);

    expect(speeds.strip).toBeGreaterThan(0);
    expect(speeds.page).toBeGreaterThan(0);
  });
});

describe("edgeSpeed", () => {
  // A 600px box at 100..700, 48px zones.
  it("is 0 away from the edges", () => {
    expect(edgeSpeed(400, 100, 700)).toBe(0);
    expect(edgeSpeed(148, 100, 700)).toBe(0);
    expect(edgeSpeed(652, 100, 700)).toBe(0);
  });

  it("scrolls toward the start near it, faster closer in", () => {
    const outer = edgeSpeed(140, 100, 700);
    const inner = edgeSpeed(105, 100, 700);

    expect(outer).toBeLessThan(0);
    expect(inner).toBeLessThan(outer);
  });

  it("scrolls toward the end near it", () => {
    expect(edgeSpeed(690, 100, 700)).toBeGreaterThan(0);
  });

  it("tops out at the max at or past an edge", () => {
    expect(edgeSpeed(100, 100, 700)).toBe(-MAX_SCROLL);
    expect(edgeSpeed(20, 100, 700)).toBe(-MAX_SCROLL);
    expect(edgeSpeed(700, 100, 700)).toBe(MAX_SCROLL);
    expect(edgeSpeed(5000, 100, 700)).toBe(MAX_SCROLL);
  });

  it("always moves at least a whole pixel inside a zone", () => {
    expect(edgeSpeed(147.9, 100, 700)).toBe(-1);
    expect(Number.isInteger(edgeSpeed(123.4, 100, 700))).toBe(true);
  });

  it("shrinks the zones in a box too small for both", () => {
    // 60px box: zones are 30px each, and the middle is still.
    expect(edgeSpeed(30, 0, 60)).toBe(0);
    expect(edgeSpeed(5, 0, 60)).toBeLessThan(0);
    expect(edgeSpeed(55, 0, 60)).toBeGreaterThan(0);
  });

  it("is 0 for a box with no size or a NaN position", () => {
    expect(edgeSpeed(10, 100, 100)).toBe(0);
    expect(edgeSpeed(10, 100, 50)).toBe(0);
    expect(edgeSpeed(Number.NaN, 0, 600)).toBe(0);
  });
});
