import { useRef, useState } from "react";

import Button from "../common/components/Button";
import { useAnnounce } from "./announce";
import { encodeJpeg } from "./encode";
import { formatTime } from "./time";
import { type CaptureSource, type Video } from "./types";

/* Shows the selected video and the "Capture this frame" button. Holds its
 * own <video> ref; nothing queries the DOM for it. */
export type ViewerProps = {
  /* null shows the empty state: "Add a video, pause on a moment you like,
   * and capture it." */
  video: Video | null;
  /* The captured JPEG and where it came from. The page turns them into a
   * Frame. */
  onCapture: (blob: Blob, source: CaptureSource) => void;
};

/* Clark's copy (review 2026-11-26), kept in one place. */
export const VIEWER_COPY = {
  loading: "Video still loading",
  cantPlay: "This video won't play here. MP4 files work best.",
  captureFailed: "Couldn't capture this frame.",
} as const;

type Status = "loading" | "ready" | "error";

/* One video. Keyed by video id in Viewer, so switching videos starts
 * fresh: no loading or error state carries over. */
const Player = ({
  video,
  onCapture,
}: {
  video: Video;
  onCapture: ViewerProps["onCapture"];
}): JSX.Element => {
  const { announce } = useAnnounce();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [time, setTime] = useState(0);

  const syncTime = () => setTime(videoRef.current?.currentTime ?? 0);

  const handleLoadedData = () => {
    // loadeddata = the first frame can be drawn. A width of 0 means the
    // browser read the file but can't decode its picture.
    const width = videoRef.current?.videoWidth ?? 0;
    setStatus(width > 0 ? "ready" : "error");
    syncTime();
  };

  const handleError = () => {
    setStatus("error");
    announce(VIEWER_COPY.cantPlay);
  };

  /* Hands up the current frame as a downsized JPEG (encodeJpeg). Any
   * failure, from a missing picture to the browser refusing to encode,
   * gets the same message: the user can only try again. */
  const capture = () => {
    const element = videoRef.current;
    if (!element || element.videoWidth === 0) {
      announce(VIEWER_COPY.captureFailed);
      return;
    }

    // Read now, not after the encode: the video may have moved on or
    // been switched by then. encodeJpeg draws the picture right away too.
    const source: CaptureSource = {
      kind: "capture",
      videoName: video.name,
      time: element.currentTime,
    };

    encodeJpeg(element, element.videoWidth, element.videoHeight)
      .then((blob) => onCapture(blob, source))
      .catch(() => announce(VIEWER_COPY.captureFailed));
  };

  const disabledReason = status === "ready"
    ? undefined
    : status === "loading"
      ? VIEWER_COPY.loading
      : VIEWER_COPY.cantPlay;

  return (
    <>
      {/* The user's own footage: there are no captions to offer. */}
      <video
        ref={videoRef}
        src={video.src}
        controls
        playsInline
        preload="auto"
        aria-label={video.name}
        className="aspect-video max-h-[340px] w-full bg-black object-contain"
        onLoadedData={handleLoadedData}
        onError={handleError}
        onTimeUpdate={syncTime}
        onSeeked={syncTime}
      />
      {status === "error" && (
        <p className="m-0 text-[#f1f4f3]">{VIEWER_COPY.cantPlay}</p>
      )}
      <div
        className={
          `flex flex-wrap items-center justify-between gap-4
          px-1.5 pt-1 pb-1.5`
        }
      >
        <Button
          variant="onDark"
          disabledReason={disabledReason}
          onClick={capture}
        >
          Capture this frame
        </Button>
        <span
          className={
            `font-display text-2xl font-medium tabular-nums lining-nums`
          }
        >
          {formatTime(time)}
        </span>
      </div>
    </>
  );
};

const Viewer = ({ video, onCapture }: ViewerProps): JSX.Element => (
  <section
    aria-label="Viewer"
    className={
      `flex min-w-0 flex-col gap-4 rounded-sm bg-[#1c1916] p-4
      text-[#f1f4f3]`
    }
  >
    {video ? (
      <Player key={video.id} video={video} onCapture={onCapture} />
    ) : (
      <div
        className={
          `grid aspect-video max-h-[340px] w-full place-items-center
          bg-[#2a2d2c] p-6 text-center`
        }
      >
        <p className="m-0 text-[#c9d1ce]">
          Add a video, pause on a moment you like, and capture it.
        </p>
      </div>
    )}
  </section>
);

export default Viewer;
