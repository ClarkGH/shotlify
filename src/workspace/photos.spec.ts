// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";

import { encodeJpeg } from "./encode";
import { photoCantOpen, preparePhoto } from "./photos";

/* Encoding has its own spec; here it only has to return a blob or fail. */
vi.mock("./encode", () => ({ encodeJpeg: vi.fn() }));

const png = (bytes: string[], name = "a.png") =>
  new File(bytes, name, { type: "image/png" });

/* A decoded bitmap whose size is after rotation, like the browser's. */
const stubDecode = (width = 3024, height = 4032) => {
  const close = vi.fn();
  const bitmap = { width, height, close } as unknown as ImageBitmap;
  const decode = vi.fn().mockResolvedValue(bitmap);
  vi.stubGlobal("createImageBitmap", decode);
  return { bitmap, close, decode };
};

describe("preparePhoto", () => {
  it("decodes with the EXIF rotation applied, then re-encodes", async () => {
    const jpeg = new Blob(["jpeg"], { type: "image/jpeg" });
    vi.mocked(encodeJpeg).mockResolvedValueOnce(jpeg);
    const { bitmap, decode } = stubDecode(3024, 4032);
    const file = png(["hi"]);

    await expect(preparePhoto(file)).resolves.toBe(jpeg);
    expect(decode).toHaveBeenCalledWith(file, {
      imageOrientation: "from-image",
    });
    expect(encodeJpeg).toHaveBeenCalledWith(bitmap, 3024, 4032);
  });

  it("never hands back the original file (its EXIF would go too)",
    async () => {
      vi.mocked(encodeJpeg).mockResolvedValueOnce(new Blob(["jpeg"]));
      stubDecode();
      const file = png(["hi"]);

      await expect(preparePhoto(file)).resolves.not.toBe(file);
    });

  it("frees the decoded bitmap after encoding", async () => {
    vi.mocked(encodeJpeg).mockResolvedValueOnce(new Blob(["jpeg"]));
    const { close } = stubDecode();

    await preparePhoto(png(["hi"]));

    expect(close).toHaveBeenCalledTimes(1);
  });

  it("rejects an empty file without decoding it", async () => {
    const { decode } = stubDecode();

    await expect(preparePhoto(png([], "empty.png"))).rejects.toThrow(
      "Couldn't read empty.png: the file is empty",
    );
    expect(decode).not.toHaveBeenCalled();
  });

  it("names the file when it can't be decoded", async () => {
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn().mockRejectedValue(new DOMException("bad", "InvalidStateError")),
    );

    await expect(preparePhoto(png(["x"], "photo.heic"))).rejects.toThrow(
      "Couldn't open photo.heic. Try a JPEG or PNG.",
    );
  });

  it("gives the same message, and frees the bitmap, if encoding fails",
    async () => {
      vi.mocked(encodeJpeg).mockRejectedValueOnce(new Error("no context"));
      const { close } = stubDecode();

      await expect(preparePhoto(png(["x"], "b.png"))).rejects.toThrow(
        photoCantOpen("b.png"),
      );
      expect(close).toHaveBeenCalledTimes(1);
    });
});
