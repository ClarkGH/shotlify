import { useId, useRef, useState } from "react";

import FilePicker from "../common/components/FilePicker";
import { useAnnounce } from "./announce";
import FrameGallery from "./FrameGallery";
import FrameTile from "./FrameTile";
import { useDragReorder } from "./useDragReorder";
import { type Frame } from "./types";
import { useFocusAfterRemove } from "./useFocusAfterRemove";

/* "Slideshow order" / "Frames play left to right." An ordered list of
 * FrameTiles, the empty state ("View your slideshow's frames here") and
 * the "Add photos" FilePicker. After a move, focus stays on the pressed
 * button and "Moved to position N of M." is announced; after a remove,
 * focus goes to the neighbor's remove button and "Frame removed. N
 * left." is announced. */
export type FrameStripProps = {
  frames: readonly Frame[];
  /* toIndex is 0-based: where the frame ends up */
  onMove: (id: string, toIndex: number) => void;
  onRemove: (id: string) => void;
  onAddPhotos: (files: File[]) => void;
};

/* What ffmpeg can render and every browser can show. "image/*" would let
 * in HEIC (most browsers can't display it) and SVG. */
export const PHOTO_TYPES = "image/png, image/jpeg, image/webp";

const FrameStrip = ({
  frames,
  onMove,
  onRemove,
  onAddPhotos,
}: FrameStripProps): JSX.Element => {
  const { announce } = useAnnounce();
  const headingId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const prepareFocus = useFocusAfterRemove(frames, {
    listRef,
    fallbackRef: headingRef,
    attribute: "data-frame-id",
    selector: '[data-action="remove"]',
  });
  /* One path for buttons and drag, so both announce the same way. */
  const moveTo = (id: string, to: number) => {
    announce(`Moved to position ${to + 1} of ${frames.length}.`);
    onMove(id, to);
  };

  /* Focus needs no help here: the tile is keyed, so React moves the same
   * button node and puts focus back on it after the reorder (checked in
   * jsdom and Chromium; the specs and `pnpm a11y` fail if that stops). */
  const handleMove = (id: string, by: -1 | 1) => {
    const from = frames.findIndex((frame) => frame.id === id);
    const to = from + by;
    if (from === -1 || to < 0 || to >= frames.length) return;
    moveTo(id, to);
  };

  /* A pointer drop leaves focus where it was (decided 2026-11-26). */
  const zoneRef = useRef<HTMLDivElement>(null);
  const { drag, startDrag } = useDragReorder({
    frames,
    listRef,
    zoneRef,
    onDrop: moveTo,
  });

  /* The gallery (4d): which frame it shows, by id. On close, focus goes
   * back to the View button of the frame on show then, which may not be
   * the one it opened on. */
  const [viewingId, setViewingId] = useState<string | null>(null);
  const handleGalleryClose = (id: string) => {
    setViewingId(null);
    listRef.current
      ?.querySelector<HTMLElement>(
        `[data-frame-id="${CSS.escape(id)}"] [data-action="view"]`,
      )
      ?.focus();
  };

  const dropMarkFor = (index: number): "before" | "after" | undefined => {
    if (drag?.drop === null || drag?.drop === undefined) return undefined;
    if (drag.drop === index) return "before";
    if (drag.drop === frames.length && index === frames.length - 1) {
      return "after";
    }
    return undefined;
  };

  const handleRemove = (id: string) => {
    if (!prepareFocus(id)) return;

    announce(`Frame removed. ${frames.length - 1} left.`);
    onRemove(id);
  };

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        {/* tabIndex -1: focusable from code (when the last frame goes),
         * never a Tab stop. */}
        <h2
          id={headingId}
          ref={headingRef}
          tabIndex={-1}
          className={
            `m-0 text-xl font-bold text-[#1e2422]
            focus-visible:outline-[3px] focus-visible:outline-solid
            focus-visible:outline-offset-4 focus-visible:outline-[#1e2422]`
          }
        >
          Slideshow order
        </h2>
        <p className="m-0 text-[#56615e]">Frames play left to right.</p>
      </div>

      {/* A sideways filmstrip on wide screens. Below sm (which includes
       * a desktop at 400% zoom) it wraps into rows that still read left to
       * right: WCAG 1.4.10 says content mustn't need scrolling in two
       * directions at 320 CSS px. */}
      <div
        ref={zoneRef}
        className={
          `flex items-start gap-[14px] overflow-x-auto rounded-sm
          bg-[#1c1916] p-[14px] max-sm:flex-wrap`
        }
      >
        {frames.length === 0 ? (
          <p className="m-0 self-center text-[#c9d1ce]">
            View your slideshow&apos;s frames here
          </p>
        ) : (
          // role="list": Safari drops list semantics when list-style is
          // none.
          <ol
            ref={listRef}
            role="list"
            aria-label="Frames in slideshow order"
            className="m-0 flex list-none gap-[14px] p-0 max-sm:flex-wrap"
          >
            {frames.map((frame, index) => (
              <FrameTile
                key={frame.id}
                frame={frame}
                position={index + 1}
                total={frames.length}
                onMove={handleMove}
                onRemove={handleRemove}
                onDragStart={startDrag}
                onView={setViewingId}
                dragging={drag?.id === frame.id}
                dropMark={dropMarkFor(index)}
                dropAcross={drag?.across ?? false}
              />
            ))}
          </ol>
        )}

        <div
          className={
            `grid h-[94px] w-[176px] flex-none place-items-center
            border-2 border-dashed border-[#9aa39f]`
          }
        >
          <FilePicker
            label="Add photos"
            accept={PHOTO_TYPES}
            multiple
            variant="onDark"
            size="small"
            onFilesChosen={onAddPhotos}
          />
        </div>
      </div>
      <FrameGallery
        frames={frames}
        viewingId={viewingId}
        onShow={setViewingId}
        onClose={handleGalleryClose}
      />
    </section>
  );
};

export default FrameStrip;
