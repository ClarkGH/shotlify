import { useId, useRef } from "react";

import FilePicker from "../common/components/FilePicker";
import { useAnnounce } from "./announce";
import FrameTile from "./FrameTile";
import { type Frame } from "./types";
import { useFocusAfterRemove } from "./useFocusAfterRemove";

/* "Slideshow order" / "Frames play left to right." An ordered list of
 * FrameTiles, the empty state ("View your slideshow's frames here") and
 * the "Add photos" FilePicker. Moves focus after a remove
 * (useFocusAfterRemove) and announces "Frame removed. N left." No
 * reordering until slice 4. */
export type FrameStripProps = {
  frames: readonly Frame[];
  onRemove: (id: string) => void;
  onAddPhotos: (files: File[]) => void;
};

/* What ffmpeg can render and every browser can show. "image/*" would let
 * in HEIC (most browsers can't display it) and SVG. */
export const PHOTO_TYPES = "image/png, image/jpeg, image/webp";

const FrameStrip = ({
  frames,
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
  });

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
                onRemove={handleRemove}
              />
            ))}
          </ol>
        )}

        <div
          className={
            `grid h-[94px] w-[168px] flex-none place-items-center
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
    </section>
  );
};

export default FrameStrip;
