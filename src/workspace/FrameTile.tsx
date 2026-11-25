import { type Frame } from "./types";

/* One frame in the strip: thumbnail, its position as a big number, and a
 * remove button named for its position ("Remove frame 2 of 5"). Renders
 * its own <li> so FrameStrip maps tiles straight into its <ol>.
 * data-frame-id lets FrameStrip move focus to a neighbor inside its own
 * list after a removal. Sits on the strip's dark background (#1c1916).
 * The remove control is the canvas's 44px icon button, not Button: slice
 * 4 adds move-earlier/later icons beside it, and three text buttons won't
 * fit a 168px tile. It becomes shared then. */
export type FrameTileProps = {
  frame: Frame;
  /* 1-based, for labels */
  position: number;
  total: number;
  onRemove: (id: string) => void;
};

const FrameTile = ({
  frame,
  position,
  total,
  onRemove,
}: FrameTileProps): JSX.Element => (
  <li className="w-[168px] flex-none" data-frame-id={frame.id}>
    {/* contain, not cover: frames can be portrait or landscape, and the
     * whole frame is what plays. */}
    <div className="relative h-[94px] overflow-hidden rounded-sm bg-black">
      {/* Plain <img>, not next/image: `fill` writes an inline style
       * attribute, which the CSP (style-src 'self') blocks whenever the
       * tile is server-rendered, and a data: URL has nothing to optimize. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={frame.src}
        alt={`Frame ${position}`}
        className="absolute inset-0 size-full object-contain"
      />
    </div>
    <div className="flex items-center justify-between">
      {/* Decorative: the position is already in the image and button
       * names. */}
      <span
        aria-hidden="true"
        className={
          `font-display text-2xl font-semibold text-[#f1f4f3]
          tabular-nums lining-nums`
        }
      >
        {String(position).padStart(2, "0")}
      </span>
      <button
        type="button"
        aria-label={`Remove frame ${position} of ${total}`}
        onClick={() => onRemove(frame.id)}
        className={
          `inline-grid min-h-11 min-w-11 cursor-pointer place-items-center
          rounded-lg text-[#9aa39f] hover:text-[#f1f4f3]
          focus-visible:outline-[3px] focus-visible:outline-solid
          focus-visible:outline-white`
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
          aria-hidden="true"
        >
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>
  </li>
);

export default FrameTile;
