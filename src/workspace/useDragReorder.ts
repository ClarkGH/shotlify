import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";

import {
  aloneInRow,
  dropSlot,
  passedThreshold,
  type Point,
  type Rect,
  scrollSpeeds,
  slotToIndex,
} from "./drag";
import { type DragSource } from "./FrameTile";

/* Drag-to-reorder with a mouse, pen or finger.
 *
 * Press on a tile's photo (mouse or pen) or its handle (any pointer) and
 * move past DRAG_THRESHOLD: a ghost copy of
 * the tile follows the pointer, the original dims, and `drop` says which
 * gap it would land in (null when that gap means "no move"). Release
 * inside `zoneRef` to move; Escape, a cancelled pointer, or releasing
 * outside the zone moves nothing (WCAG 2.5.2). The click that ends a drag
 * is swallowed, so 4d's "View frame" button doesn't open on a drop.
 *
 * Positions go through the ghost's CSSOM style, not React state, so the
 * page only re-renders when the drop gap changes. Tiles are found by
 * `data-frame-id` inside `listRef` and measured once when the drag
 * starts; scrolling after that is added back in (`measured`). Near an
 * edge the strip or page auto-scrolls (scrollSpeeds). */
type Options = {
  frames: readonly { id: string }[];
  listRef: RefObject<HTMLElement>;
  /* The area a drop counts in: the strip's dark box. */
  zoneRef: RefObject<HTMLElement>;
  /* toIndex is moveItem's final index; only called for a real move. */
  onDrop: (id: string, toIndex: number) => void;
};

export type DragState = {
  id: string;
  /* The gap (0..n) the frame would land in, or null for no move. */
  drop: number | null;
  /* The tile showing the drop bar is alone in its row (a phone column):
   * the bar runs across its top or bottom instead of down its side. */
  across: boolean;
};

/* Everything about a drag that isn't render state. */
type Session = {
  id: string;
  pointerId: number;
  start: Point;
  /* Pointer position inside the tile, so the ghost doesn't jump. */
  grab: Point;
  from: number;
  rects: Rect[];
  ghost: HTMLElement | null;
  slot: number | null;
  /* The ghost's pending position update. */
  frame: number;
  /* The auto-scroll loop. */
  loop: number;
  /* The pointer's last position, for the loop to scroll from. */
  last: Point;
  /* Scroll offsets when `rects` were measured, and on the last check. */
  measuredAt: Offsets;
  seen: Offsets;
  cleanup: () => void;
};

/* The strip's sideways scroll and the page's scroll. */
type Offsets = { strip: number; x: number; y: number };

/* The strip's dark background so the copied buttons don't run into the
 * tiles below; 80% so the drop bar under it still shows through. */
const GHOST_CLASSES = [
  "pointer-events-none", "fixed", "top-0", "left-0", "z-50", "m-0",
  "list-none", "rounded-sm", "bg-[#1c1916]", "opacity-80",
  "shadow-[0_12px_28px_rgba(0,0,0,0.45)]",
];

/* A visual copy of the tile, hidden from assistive tech and inert, so
 * its buttons can't be reached while it's on screen. */
const makeGhost = (tile: HTMLElement, rect: Rect): HTMLElement => {
  const ghost = tile.cloneNode(true) as HTMLElement;
  ghost.removeAttribute("data-frame-id");
  ghost.removeAttribute("data-drop");
  ghost.removeAttribute("data-dragging");
  ghost.setAttribute("aria-hidden", "true");
  ghost.setAttribute("inert", "");
  // The tile's own `relative` would beat `fixed` (Tailwind emits it
  // later), leaving the ghost at the bottom of the page.
  ghost.classList.remove("relative");
  ghost.classList.add(...GHOST_CLASSES);
  ghost.style.width = `${rect.right - rect.left}px`;
  document.body.append(ghost);
  return ghost;
};

const inside = (element: HTMLElement | null, point: Point): boolean => {
  if (!element) return false;
  const box = element.getBoundingClientRect();
  return point.x >= box.left && point.x <= box.right &&
    point.y >= box.top && point.y <= box.bottom;
};

/* Swallows the click the browser sends right after a drag's pointerup,
 * then stops listening whether or not one came. */
const swallowNextClick = () => {
  const stop = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };
  window.addEventListener("click", stop, { capture: true, once: true });
  window.setTimeout(() => {
    window.removeEventListener("click", stop, { capture: true });
  }, 0);
};

export const useDragReorder = ({
  frames,
  listRef,
  zoneRef,
  onDrop,
}: Options) => {
  const [drag, setDrag] = useState<DragState | null>(null);
  const session = useRef<Session | null>(null);
  const latest = useRef({ frames, onDrop });
  useEffect(() => {
    latest.current = { frames, onDrop };
  }, [frames, onDrop]);

  const end = useCallback((commit: boolean) => {
    const current = session.current;
    if (!current) return;
    session.current = null;
    cancelAnimationFrame(current.frame);
    cancelAnimationFrame(current.loop);
    current.cleanup();

    if (current.ghost) {
      current.ghost.remove();
      swallowNextClick();
    }
    setDrag(null);

    if (commit && current.slot !== null) {
      latest.current.onDrop(
        current.id,
        slotToIndex(current.slot, current.from),
      );
    }
  }, []);

  /* The list changed under the drag (a photo finished loading, say): the
   * measurements are stale, so give up rather than drop in the wrong
   * place. */
  useEffect(() => {
    if (session.current?.ghost) end(false);
  }, [frames, end]);

  useEffect(() => () => end(false), [end]);

  const offsets = (): Offsets => ({
    strip: zoneRef.current?.scrollLeft ?? 0,
    x: window.scrollX,
    y: window.scrollY,
  });

  /* `point` in the coordinates `rects` were measured in: scrolling the
   * strip or the page since then moved the tiles, not the pointer. */
  const measured = (current: Session, point: Point): Point => {
    const now = offsets();
    const then = current.measuredAt;
    return {
      x: point.x + (now.strip - then.strip) + (now.x - then.x),
      y: point.y + (now.y - then.y),
    };
  };

  const start = (current: Session) => {
    const tiles = Array.from(
      listRef.current?.querySelectorAll<HTMLElement>("[data-frame-id]") ?? [],
    );
    const tile = tiles.find((t) => t.dataset.frameId === current.id);
    if (!tile) return false;

    current.rects = tiles.map((t) => t.getBoundingClientRect());
    current.measuredAt = offsets();
    current.seen = current.measuredAt;
    const rect = tile.getBoundingClientRect();
    current.grab = {
      x: current.start.x - rect.left,
      y: current.start.y - rect.top,
    };
    current.ghost = makeGhost(tile, rect);
    current.loop = requestAnimationFrame(tick);
    return true;
  };

  /* Once a frame while dragging: scroll near the edges, then re-check the
   * drop gap if anything scrolled (this also catches a mouse wheel), since
   * the tiles moved under a pointer that may be standing still. */
  const tick = () => {
    const current = session.current;
    const zone = zoneRef.current;
    if (!current?.ghost || !zone) return;

    const speeds = scrollSpeeds(
      current.last,
      zone.getBoundingClientRect(),
      window.innerHeight,
    );
    if (speeds.strip !== 0) zone.scrollLeft += speeds.strip;
    if (speeds.page !== 0) window.scrollBy(0, speeds.page);

    const now = offsets();
    const { seen } = current;
    if (now.strip !== seen.strip || now.x !== seen.x || now.y !== seen.y) {
      current.seen = now;
      move(current, current.last);
    }
    current.loop = requestAnimationFrame(tick);
  };

  const move = (current: Session, point: Point) => {
    current.last = point;
    const { ghost } = current;
    if (ghost) {
      cancelAnimationFrame(current.frame);
      current.frame = requestAnimationFrame(() => {
        ghost.style.translate =
          `${point.x - current.grab.x}px ${point.y - current.grab.y}px`;
      });
    }

    const slot = inside(zoneRef.current, point)
      ? dropSlot(current.rects, measured(current, point))
      : null;
    const drop = slot !== null && slotToIndex(slot, current.from) !==
        current.from
      ? slot
      : null;
    if (drop !== current.slot) {
      current.slot = drop;
      // The bar sits on the tile after the gap, or the last tile's end.
      const marked = drop === null
        ? -1
        : Math.min(drop, current.rects.length - 1);
      setDrag({
        id: current.id,
        drop,
        across: drop !== null && aloneInRow(current.rects, marked),
      });
    }
  };

  /* Wire to a tile's photo and handle onPointerDown. A touch only starts a
   * drag from the handle (touch-action: none there); on the photo the
   * browser is scrolling the strip, and would cancel the pointer anyway. */
  const startDrag = (
    id: string,
    event: ReactPointerEvent<HTMLElement>,
    source: DragSource,
  ) => {
    if (event.pointerType === "touch" && source !== "handle") return;
    if (event.button !== 0) return;
    // A drag still open here was never ended by the browser (a lost
    // pointerup or pointercancel), or a second finger joined in. Cancel
    // it, moving nothing, rather than refuse every drag from now on.
    if (session.current) end(false);
    const from = latest.current.frames.findIndex((f) => f.id === id);
    if (from === -1) return;

    // No text selection or native image drag from this press.
    event.preventDefault();
    const target = event.currentTarget;
    target.setPointerCapture?.(event.pointerId);

    const onMove = (e: PointerEvent) => {
      const current = session.current;
      if (!current || e.pointerId !== current.pointerId) return;
      const point = { x: e.clientX, y: e.clientY };
      if (!current.ghost) {
        if (!passedThreshold(current.start, point)) return;
        if (!start(current)) {
          end(false);
          return;
        }
        setDrag({ id, drop: null, across: false });
      }
      move(current, point);
    };
    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== session.current?.pointerId) return;
      // A press that never became a drag is a click: leave it alone.
      end(Boolean(session.current.ghost) &&
        inside(zoneRef.current, { x: e.clientX, y: e.clientY }));
    };
    const onCancel = (e: PointerEvent) => {
      if (e.pointerId === session.current?.pointerId) end(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || !session.current?.ghost) return;
      e.preventDefault();
      end(false);
    };

    target.addEventListener("pointermove", onMove);
    target.addEventListener("pointerup", onUp);
    target.addEventListener("pointercancel", onCancel);
    target.addEventListener("lostpointercapture", onCancel);
    window.addEventListener("keydown", onKey);

    session.current = {
      id,
      pointerId: event.pointerId,
      start: { x: event.clientX, y: event.clientY },
      grab: { x: 0, y: 0 },
      from,
      rects: [],
      ghost: null,
      slot: null,
      frame: 0,
      loop: 0,
      last: { x: event.clientX, y: event.clientY },
      measuredAt: { strip: 0, x: 0, y: 0 },
      seen: { strip: 0, x: 0, y: 0 },
      cleanup: () => {
        target.removeEventListener("pointermove", onMove);
        target.removeEventListener("pointerup", onUp);
        target.removeEventListener("pointercancel", onCancel);
        target.removeEventListener("lostpointercapture", onCancel);
        window.removeEventListener("keydown", onKey);
        if (target.hasPointerCapture?.(event.pointerId)) {
          target.releasePointerCapture(event.pointerId);
        }
      },
    };
  };

  return { drag, startDrag };
};
