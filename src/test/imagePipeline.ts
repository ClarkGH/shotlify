import { vi } from "vitest";

/* jsdom can't decode or encode images. This stands in for the browser:
 * createImageBitmap "decodes" any file to a 640×480 bitmap, except one
 * whose contents are "corrupt", which it refuses like a real decoder;
 * the canvas draws nothing and encodes a small JPEG blob. Undone by
 * vitest's restoreMocks and unstubGlobals. */
export const stubImagePipeline = () => {
  const close = vi.fn();
  const createImageBitmap = vi.fn(async (blob: Blob) => {
    if ((await blob.text()) === "corrupt") {
      throw new DOMException("The source image cannot be decoded.",
        "InvalidStateError");
    }
    return { width: 640, height: 480, close };
  });
  vi.stubGlobal("createImageBitmap", createImageBitmap);

  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    fillRect: vi.fn(),
    drawImage: vi.fn(),
  } as unknown as RenderingContext);
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(
    (callback) => callback(new Blob(["jpeg"], { type: "image/jpeg" })),
  );

  return { createImageBitmap, close };
};
