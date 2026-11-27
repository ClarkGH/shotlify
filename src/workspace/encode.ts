/* Turns a picture (a video frame now, an uploaded photo in 4a.3) into the
 * JPEG the slideshow uses: no bigger than MAX_EDGE on its long side, any
 * transparency filled black, and nothing carried over from the source
 * file (a canvas writes no EXIF). */

export const MAX_EDGE = 1280;
export const JPEG_QUALITY = 0.9;
/* JPEG has no transparency. Black matches the strip and the letterbox the
 * slideshow video uses. */
export const FILL = "#000000";

export type Size = { width: number; height: number };

/* The size to draw at: scaled down to fit maxEdge, never scaled up, with
 * the aspect ratio kept and each side at least 1px. */
export const fitWithin = (
  width: number,
  height: number,
  maxEdge: number = MAX_EDGE,
): Size => {
  for (const value of [width, height, maxEdge]) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new RangeError(
        `fitWithin needs positive sizes, got ${width}×${height} ` +
          `in ${maxEdge}`,
      );
    }
  }

  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
};

/* Draws `source` (natural size `width`×`height`) into a fresh canvas at
 * the fitted size and encodes it. Rejects if the browser can't give a 2D
 * context or can't encode; callers turn that into the user's message. */
export const encodeJpeg = (
  source: CanvasImageSource,
  width: number,
  height: number,
): Promise<Blob> =>
  new Promise((resolve, reject) => {
    const size = fitWithin(width, height);
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;

    const context = canvas.getContext("2d");
    if (!context) {
      reject(new Error("encodeJpeg: no 2D canvas context"));
      return;
    }

    context.fillStyle = FILL;
    context.fillRect(0, 0, size.width, size.height);
    context.drawImage(source, 0, 0, size.width, size.height);

    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("encodeJpeg: the browser couldn't encode"));
      },
      "image/jpeg",
      JPEG_QUALITY,
    );
  });
