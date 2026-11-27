import { type PointerEvent, type ReactNode } from "react";

import { frameAlt } from "./model";
import { type Frame } from "./types";

/* One frame in the strip: the photo (a "View frame" button that opens the
 * gallery), a drag handle showing its position
 * as a big number, and three icon buttons named for its position: "Move
 * frame 2 of 5 earlier", "... later", "Remove frame 2 of 5". Renders its
 * own <li> so FrameStrip maps tiles straight into its <ol>. data-frame-id
 * and data-action let FrameStrip find rows and buttons. Sits on the
 * strip's dark background (#1c1916). 176px wide: the handle and three
 * buttons are each 44px, the target size we hold to. */
export type FrameAction = "view" | "earlier" | "later" | "remove";

/* Where a pointer drag started. The photo takes a mouse or pen (a finger
 * there scrolls the strip); the handle takes any pointer. */
export type DragSource = "photo" | "handle";

export type FrameTileProps = {
  frame: Frame;
  /* 1-based, for labels */
  position: number;
  total: number;
  /* by = -1 (earlier) or 1 (later). Not called at the ends. */
  onMove: (id: string, by: -1 | 1) => void;
  onRemove: (id: string) => void;
  /* The photo was clicked or pressed: open the gallery on this frame. */
  onView?: (id: string) => void;
  /* Pointer drag (useDragReorder), from the photo or the handle. */
  onDragStart?: (
    id: string,
    event: PointerEvent<HTMLElement>,
    from: DragSource,
  ) => void;
  /* This tile is being dragged: it dims, its ghost follows the pointer. */
  dragging?: boolean;
  /* Where the dragged frame would land: the gap before or after this
   * tile, drawn as a light bar in that gap. */
  dropMark?: "before" | "after";
  /* The tile is alone in its row (a phone column): the bar runs across
   * its top (before) or bottom (after) instead of down its side. */
  dropAcross?: boolean;
};

/* "Frame 2, photo beach.png" → "View frame 2, photo beach.png". */
const viewLabel = (alt: string) =>
  `View ${alt.charAt(0).toLowerCase()}${alt.slice(1)}`;

/* data-drop: the bar beside the tile in a row, across it in a column. */
const dropAttribute = (
  mark: "before" | "after" | undefined,
  across: boolean,
) => {
  if (!mark) return undefined;
  if (!across) return mark;
  return mark === "before" ? "above" : "below";
};

/* A 44px icon button. `blocked` keeps it focusable (aria-disabled, not
 * disabled), so focus doesn't vanish when a move lands a frame at an end;
 * screen readers say "unavailable". */
const IconButton = ({
  label,
  action,
  blocked = false,
  onPress,
  children,
}: {
  label: string;
  action: FrameAction;
  blocked?: boolean;
  onPress: () => void;
  children: ReactNode;
}): JSX.Element => (
  <button
    type="button"
    aria-label={label}
    aria-disabled={blocked || undefined}
    data-action={action}
    onClick={() => {
      if (!blocked) onPress();
    }}
    className={
      `inline-grid min-h-11 min-w-11 cursor-pointer place-items-center
      rounded-lg text-[#9aa39f] hover:text-[#f1f4f3]
      focus-visible:outline-[3px] focus-visible:outline-solid
      focus-visible:outline-white
      aria-disabled:cursor-not-allowed aria-disabled:text-[#5d6461]
      aria-disabled:hover:text-[#5d6461]`
    }
  >
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  </button>
);

const FrameTile = ({
  frame,
  position,
  total,
  onMove,
  onRemove,
  onView,
  onDragStart,
  dragging = false,
  dropMark,
  dropAcross = false,
}: FrameTileProps): JSX.Element => (
  <li
    data-frame-id={frame.id}
    data-dragging={dragging || undefined}
    data-drop={dropAttribute(dropMark, dropAcross)}
    className={
      // The drop bar sits in the 14px gap: 4px thick, centered (-9px).
      `relative w-[176px] flex-none data-dragging:opacity-40
      before:absolute before:top-0 before:bottom-0 before:hidden
      before:w-1 before:rounded-full before:bg-[#f1f4f3]
      before:content-['']
      data-[drop=before]:before:-left-[9px] data-[drop=before]:before:block
      data-[drop=after]:before:-right-[9px] data-[drop=after]:before:block
      data-[drop=above]:before:inset-x-0 data-[drop=above]:before:-top-[9px]
      data-[drop=above]:before:bottom-auto data-[drop=above]:before:h-1
      data-[drop=above]:before:w-auto data-[drop=above]:before:block
      data-[drop=below]:before:inset-x-0
      data-[drop=below]:before:-bottom-[9px]
      data-[drop=below]:before:top-auto data-[drop=below]:before:h-1
      data-[drop=below]:before:w-auto data-[drop=below]:before:block`
    }
  >
    {/* The photo: a button that opens the gallery ("View frame 2, photo
     * beach.png"), and where a mouse or pen drag starts (a drag's final
     * click is swallowed, so a drop doesn't open it). contain, not cover:
     * frames can be portrait or landscape, and the whole frame plays. */}
    <button
      type="button"
      aria-label={viewLabel(frameAlt(frame.source, position))}
      data-action="view"
      onClick={() => onView?.(frame.id)}
      onPointerDown={(event) => onDragStart?.(frame.id, event, "photo")}
      className={
        `relative block h-[94px] w-full cursor-pointer overflow-hidden
        rounded-sm border-0 bg-black p-0 select-none
        focus-visible:outline-[3px] focus-visible:outline-solid
        focus-visible:outline-offset-2 focus-visible:outline-white`
      }
    >
      {/* Plain <img>, not next/image: `fill` writes an inline style
       * attribute, which the CSP (style-src 'self') blocks whenever the
       * tile is server-rendered, and a blob: URL has nothing to optimize. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={frame.src}
        alt={frameAlt(frame.source, position)}
        draggable={false}
        className="absolute inset-0 size-full object-contain"
      />
    </button>
    <div className="flex items-center justify-between">
      {/* The drag handle: grip dots and the position. Hidden from screen
       * readers (the position is in the image and button names, and
       * keyboard users move frames with the buttons). touch-action: none
       * here only, so a finger on the handle drags while a finger on the
       * photo still scrolls. 44px like the buttons. */}
      <div
        aria-hidden="true"
        data-drag-handle=""
        onPointerDown={(event) => onDragStart?.(frame.id, event, "handle")}
        className={
          `flex min-h-11 min-w-11 cursor-grab touch-none items-center gap-1
          select-none [-webkit-touch-callout:none]`
        }
      >
        <svg
          width="8"
          height="14"
          viewBox="0 0 8 14"
          fill="#9aa39f"
          className="flex-none"
        >
          {[2, 7, 12].map((y) => (
            <g key={y}>
              <circle cx="2" cy={y} r="1.3" />
              <circle cx="6" cy={y} r="1.3" />
            </g>
          ))}
        </svg>
        <span
          className={
            `font-display text-2xl font-semibold text-[#f1f4f3]
            tabular-nums lining-nums`
          }
        >
          {String(position).padStart(2, "0")}
        </span>
      </div>
      <div className="flex">
        <IconButton
          label={`Move frame ${position} of ${total} earlier`}
          action="earlier"
          blocked={position === 1}
          onPress={() => onMove(frame.id, -1)}
        >
          <path d="M19 12H5M11 6l-6 6 6 6" />
        </IconButton>
        <IconButton
          label={`Move frame ${position} of ${total} later`}
          action="later"
          blocked={position === total}
          onPress={() => onMove(frame.id, 1)}
        >
          <path d="M5 12h14M13 6l6 6-6 6" />
        </IconButton>
        <IconButton
          label={`Remove frame ${position} of ${total}`}
          action="remove"
          onPress={() => onRemove(frame.id)}
        >
          <path d="M6 6l12 12M18 6L6 18" />
        </IconButton>
      </div>
    </div>
  </li>
);

export default FrameTile;
