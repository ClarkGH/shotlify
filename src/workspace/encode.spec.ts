// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";

import { encodeJpeg, FILL, fitWithin, JPEG_QUALITY } from "./encode";

describe("fitWithin", () => {
  it.each([
    ["4K landscape", 3840, 2160, 1280, 720],
    ["4K portrait", 2160, 3840, 720, 1280],
    ["square", 2000, 2000, 1280, 1280],
    ["exactly the cap", 1280, 720, 1280, 720],
    ["smaller (never scaled up)", 320, 180, 320, 180],
    ["odd ratio, rounded", 1999, 1001, 1280, 641],
  ])("%s: %i×%i → %i×%i", (_, width, height, fitWidth, fitHeight) => {
    expect(fitWithin(width, height)).toEqual({
      width: fitWidth,
      height: fitHeight,
    });
  });

  it("keeps a sliver at least 1px wide", () => {
    expect(fitWithin(10_000, 2)).toEqual({ width: 1280, height: 1 });
  });

  it("uses the cap it's given", () => {
    expect(fitWithin(1000, 500, 100)).toEqual({ width: 100, height: 50 });
  });

  it.each([
    [0, 100],
    [100, -1],
    [Number.NaN, 100],
    [100, Number.POSITIVE_INFINITY],
  ])("refuses %s×%s", (width, height) => {
    expect(() => fitWithin(width, height)).toThrow(RangeError);
  });

  it("refuses a cap of 0", () => {
    expect(() => fitWithin(100, 100, 0)).toThrow(RangeError);
  });
});

/* jsdom has no canvas drawing. This stands in a 2D context that records
 * what was done, in order, and a toBlob that returns `result`. */
const stubCanvas = (
  result: Blob | null = new Blob(["jpeg"], { type: "image/jpeg" }),
  { context = true } = {},
) => {
  const calls: string[] = [];
  const canvases: HTMLCanvasElement[] = [];

  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
    function (this: HTMLCanvasElement) {
      canvases.push(this);
      if (!context) return null;
      return {
        set fillStyle(value: string) {
          calls.push(`fillStyle ${value}`);
        },
        fillRect: (...args: number[]) =>
          calls.push(`fillRect ${args.join(",")}`),
        drawImage: (_: unknown, ...args: number[]) =>
          calls.push(`drawImage ${args.join(",")}`),
      } as unknown as RenderingContext;
    },
  );
  const toBlob = vi
    .spyOn(HTMLCanvasElement.prototype, "toBlob")
    .mockImplementation((callback) => callback(result));

  return { calls, canvases, toBlob };
};

const source = document.createElement("video");

describe("encodeJpeg", () => {
  it("fills black, then draws at the fitted size", async () => {
    const { calls, canvases } = stubCanvas();

    await encodeJpeg(source, 3840, 2160);

    expect(canvases[0]?.width).toBe(1280);
    expect(canvases[0]?.height).toBe(720);
    expect(calls).toEqual([
      `fillStyle ${FILL}`,
      "fillRect 0,0,1280,720",
      "drawImage 0,0,1280,720",
    ]);
  });

  it("encodes a JPEG at the set quality and resolves with it", async () => {
    const jpeg = new Blob(["jpeg"], { type: "image/jpeg" });
    const { toBlob } = stubCanvas(jpeg);

    await expect(encodeJpeg(source, 320, 180)).resolves.toBe(jpeg);
    expect(toBlob).toHaveBeenCalledWith(
      expect.any(Function),
      "image/jpeg",
      JPEG_QUALITY,
    );
  });

  it("rejects when the browser can't encode", async () => {
    stubCanvas(null);

    await expect(encodeJpeg(source, 320, 180)).rejects.toThrow(
      /couldn't encode/,
    );
  });

  it("rejects when there's no 2D context", async () => {
    const { toBlob } = stubCanvas(undefined, { context: false });

    await expect(encodeJpeg(source, 320, 180)).rejects.toThrow(
      /no 2D canvas context/,
    );
    expect(toBlob).not.toHaveBeenCalled();
  });

  it("rejects a source with no size instead of drawing nothing", async () => {
    stubCanvas();

    await expect(encodeJpeg(source, 0, 0)).rejects.toThrow(RangeError);
  });
});
