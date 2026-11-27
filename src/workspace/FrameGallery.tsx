import { useEffect, useId, useRef, type KeyboardEvent, type MouseEvent }
  from "react";

import Button from "../common/components/Button";
import { frameAlt } from "./model";
import { type Frame } from "./types";

/* The gallery (4d): one frame at full size in a native modal <dialog>.
 * showModal gives us the focus trap, the inert page behind, Esc to close
 * and the backdrop, with no library. Opened from a tile's "View frame"
 * button; the strip stays a strip.
 *
 * "Frame N of M" is its own polite live region. The page's announcer
 * can't speak while the dialog is open: a modal dialog makes everything
 * outside it inert, the announcer included. */
export type FrameGalleryProps = {
  frames: readonly Frame[];
  /* The frame on show, by id so a reorder can't swap it. null = closed. */
  viewingId: string | null;
  onShow: (id: string) => void;
  /* `id` is the frame on show when it closed, so the strip can put focus
   * back on that frame's View button. */
  onClose: (id: string) => void;
};

/* Clark's copy (approved 2026-11-27). */
export const GALLERY_COPY = {
  previous: "Previous frame",
  next: "Next frame",
  close: "Close",
} as const;

/* An empty disabledReason blocks a Button (aria-disabled, still
 * focusable) without announcing a reason: at the first or last frame,
 * "unavailable" says enough. */
const blockedIf = (blocked: boolean) => (blocked ? "" : undefined);

const FrameGallery = ({
  frames,
  viewingId,
  onShow,
  onClose,
}: FrameGalleryProps): JSX.Element => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const index = frames.findIndex((frame) => frame.id === viewingId);
  const frame = frames[index];
  const open = frame !== undefined;
  // The last frame shown, so the close handler knows where focus goes.
  const shownId = useRef<string | null>(null);
  useEffect(() => {
    if (frame) shownId.current = frame.id;
  }, [frame]);

  /* Match the <dialog> to `open` after every render, not only when `open`
   * changes: a close (Esc) and a reopen can land in one render, leaving
   * `open` true → true while the dialog itself was closed. */
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  });

  const show = (to: number) => {
    const next = frames[to];
    if (next) onShow(next.id);
  };
  const atStart = index <= 0;
  const atEnd = index >= frames.length - 1;

  const handleKeyDown = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (event.key === "ArrowLeft" && !atStart) show(index - 1);
    else if (event.key === "ArrowRight" && !atEnd) show(index + 1);
    else return;
    event.preventDefault();
  };

  /* A click on the dialog element itself (not its content) is a click
   * on the backdrop: close, like most lightboxes. */
  const handleClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget) dialogRef.current?.close();
  };

  // Keys and backdrop clicks are extras; every action has a button.
  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={() => {
        if (shownId.current) onClose(shownId.current);
      }}
      onKeyDown={handleKeyDown}
      onClick={handleClick}
      className={
        `m-auto max-h-[95vh] w-[min(1100px,95vw)] rounded-sm bg-[#1c1916]
        p-0 text-[#f1f4f3] backdrop:bg-black/80`
      }
    >
      {frame && (
        <div className="flex flex-col gap-3 p-4">
          <div className="flex items-center justify-between gap-4">
            <h2
              id={titleId}
              aria-live="polite"
              aria-atomic="true"
              className="m-0 font-display text-2xl font-medium"
            >
              {`Frame ${index + 1} of ${frames.length}`}
            </h2>
            <Button
              variant="onDark"
              size="small"
              onClick={() => dialogRef.current?.close()}
            >
              {GALLERY_COPY.close}
            </Button>
          </div>
          {/* Plain <img>: a blob: URL, nothing for next/image to do, and
           * no inline styles for the CSP to block. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={frame.src}
            alt={frameAlt(frame.source, index + 1)}
            className="max-h-[70vh] w-full bg-black object-contain"
          />
          {/* pb-2: room for the lifted Buttons' rim. */}
          <div className="flex justify-between gap-4 pb-2">
            <Button
              variant="onDark"
              disabledReason={blockedIf(atStart)}
              onClick={() => show(index - 1)}
            >
              <span aria-hidden="true">← </span>
              {GALLERY_COPY.previous}
            </Button>
            <Button
              variant="onDark"
              disabledReason={blockedIf(atEnd)}
              onClick={() => show(index + 1)}
            >
              {GALLERY_COPY.next}
              <span aria-hidden="true"> →</span>
            </Button>
          </div>
        </div>
      )}
    </dialog>
  );
};

export default FrameGallery;
