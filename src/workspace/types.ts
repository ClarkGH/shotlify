/* The workspace's data. Ids are stable for an item's whole life, so focus
 * and announcements survive removals. */

/* Where a frame came from, for its alt text. Names are copied in, not
 * looked up by id, so the text survives the video being removed. */
export type FrameSource =
  /* `time` in seconds, read when Capture was pressed */
  | { kind: "capture"; videoName: string; time: number }
  | { kind: "photo"; fileName: string };

export type CaptureSource = Extract<FrameSource, { kind: "capture" }>;

export type Frame = {
  id: string;
  /* The image itself, always a JPEG we encoded (no EXIF). Slice 5
   * uploads this. */
  blob: Blob;
  source: FrameSource;
  /* blob: URL for `blob`, for <img>; revoked when the frame is removed */
  src: string;
};

export type Video = {
  id: string;
  /* blob: URL from objectUrlFor; revoked when the video is removed */
  src: string;
  /* the file name, for labels like "Remove video beach.mp4" */
  name: string;
};
