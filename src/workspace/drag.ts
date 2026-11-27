/* The geometry behind drag-to-reorder (4c), with no DOM: the strip
 * measures its tiles and passes plain numbers in. Slots are the gaps
 * between tiles: slot 0 is before the first tile, slot n after the last. */

export type Point = { x: number; y: number };
export type Rect = { left: number; top: number; right: number; bottom: number };

/* How far a mouse or pen must move before a press becomes a drag, so a
 * click (4d opens the gallery on click) is still a click. */
export const DRAG_THRESHOLD = 6;

/* Auto-scroll starts this close to an edge and tops out at MAX_SCROLL
 * pixels per frame right at (or past) it. */
export const EDGE_ZONE = 48;
export const MAX_SCROLL = 16;

export const passedThreshold = (
  start: Point,
  now: Point,
  threshold: number = DRAG_THRESHOLD,
): boolean => Math.hypot(now.x - start.x, now.y - start.y) >= threshold;

/* Tiles in list order, split into visual rows. The strip wraps below sm.
 * A tile starts a new row when its top is below the previous tile's
 * middle. (Not "starts left of the previous tile": on a narrow phone
 * every tile is alone in its row with the same left edge, so that rule
 * saw one long row and drops never landed.) */
const rowsOf = (rects: readonly Rect[]): number[][] => {
  const rows: number[][] = [];
  rects.forEach((rect, index) => {
    const previous = rects[index - 1];
    const row = rows[rows.length - 1];
    const below = previous !== undefined &&
      rect.top > (previous.top + previous.bottom) / 2;
    if (!row || below) rows.push([index]);
    else row.push(index);
  });
  return rows;
};

/* Whether tile `index` has its row to itself: every tile in a one-column
 * strip, or the odd one out on a wrapped strip's last row. Drops there go
 * by height, and the drop bar runs across instead of up and down. */
export const aloneInRow = (rects: readonly Rect[], index: number): boolean =>
  rowsOf(rects).some((row) => row.length === 1 && row[0] === index);

/* Distance from y to a row's vertical band; 0 inside it. */
const distanceToRow = (rects: readonly Rect[], row: number[], y: number) => {
  const top = Math.min(...row.map((i) => rects[i]?.top ?? Infinity));
  const bottom = Math.max(...row.map((i) => rects[i]?.bottom ?? -Infinity));
  if (y < top) return top - y;
  if (y > bottom) return y - bottom;
  return 0;
};

/* The slot (0..rects.length) the pointer is over. The nearest row wins,
 * so the pointer can be above, below or between rows. Within a row, the
 * slot is before the first tile whose middle is right of the pointer; a
 * tile alone in its row goes by height instead (upper half = before it),
 * since that's the way the pointer travels in a column. */
export const dropSlot = (rects: readonly Rect[], point: Point): number => {
  const rows = rowsOf(rects);
  let best: number[] | undefined;
  let bestDistance = Infinity;
  for (const row of rows) {
    const distance = distanceToRow(rects, row, point.y);
    if (distance < bestDistance) {
      best = row;
      bestDistance = distance;
    }
  }
  if (!best) return 0;

  const [only] = best;
  const lone = best.length === 1 && only !== undefined ? rects[only] : null;
  if (lone && only !== undefined) {
    return point.y < (lone.top + lone.bottom) / 2 ? only : only + 1;
  }

  for (const index of best) {
    const rect = rects[index];
    if (rect && point.x < (rect.left + rect.right) / 2) return index;
  }
  const last = best[best.length - 1];
  return last === undefined ? 0 : last + 1;
};

/* A slot as moveItem's final index for the frame dragged from `from`.
 * The frame leaves its own place first, so every slot after it is one
 * lower. Dropping in the gap either side of itself means no move. */
export const slotToIndex = (slot: number, from: number): number =>
  slot > from ? slot - 1 : slot;

/* How far to auto-scroll this frame. The strip (`zone`) scrolls sideways
 * only while the pointer is level with it, so a pointer near the left of
 * the window but up by the viewer doesn't drag the strip along. The page
 * scrolls near the top or bottom of the window (`viewportHeight`), which
 * is what moves the wrapped rows at 320px, but never further than keeps
 * the strip under the pointer: scrolling on would leave the pointer over
 * something a drop doesn't count on, so letting go there would do
 * nothing. */
export const scrollSpeeds = (
  pointer: Point,
  zone: Rect,
  viewportHeight: number,
): { strip: number; page: number } => {
  const speed = edgeSpeed(pointer.y, 0, viewportHeight);
  // How much strip is left past the pointer in the scroll's direction.
  const left = speed > 0
    ? zone.bottom - pointer.y - 1
    : pointer.y - zone.top - 1;
  const page = Math.sign(speed) *
    Math.max(0, Math.min(Math.abs(speed), Math.floor(left)));
  return {
    strip: pointer.y >= zone.top && pointer.y <= zone.bottom
      ? edgeSpeed(pointer.x, zone.left, zone.right)
      : 0,
    // `|| 0` turns -0 into 0.
    page: page || 0,
  };
};

/* Auto-scroll speed, in pixels per frame, for a pointer at `pos` in a box
 * from `start` to `end` (one axis). Negative toward start, positive toward
 * end, 0 outside the edge zones. Ramps up toward each edge; whole pixels,
 * since browsers round scroll positions. */
export const edgeSpeed = (
  pos: number,
  start: number,
  end: number,
  zone: number = EDGE_ZONE,
  max: number = MAX_SCROLL,
): number => {
  const span = end - start;
  if (!(span > 0) || !(zone > 0) || Number.isNaN(pos)) return 0;

  // A box smaller than two zones would have overlapping zones.
  const reach = Math.min(zone, span / 2);
  const ramp = (into: number) =>
    Math.ceil(max * Math.min(1, Math.max(0, 1 - into / reach)));

  if (pos < start + reach) return -ramp(pos - start);
  if (pos > end - reach) return ramp(end - pos);
  return 0;
};
