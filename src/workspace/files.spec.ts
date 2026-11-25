// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";

import { readAsDataUrl } from "./files";

/* A FileReader stand-in that ends the read the way `outcome` says, so the
 * failure paths can be tested; a real read is hard to make fail. */
const fakeReader = (outcome: "error" | "abort" | "nonString") =>
  class {
    result: unknown = null;
    error: DOMException | null = null;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    onabort: (() => void) | null = null;

    readAsDataURL() {
      setTimeout(() => {
        if (outcome === "error") {
          this.error = new DOMException("disk gone", "NotReadableError");
          this.onerror?.();
        } else if (outcome === "abort") {
          this.onabort?.();
        } else {
          this.result = new ArrayBuffer(1);
          this.onload?.();
        }
      });
    }
  };

const png = (bytes: string[], name = "a.png") =>
  new File(bytes, name, { type: "image/png" });

describe("readAsDataUrl", () => {
  it("reads a file into a data: URL", async () => {
    await expect(readAsDataUrl(png(["hi"]))).resolves.toBe(
      "data:image/png;base64,aGk=",
    );
  });

  it("rejects an empty file instead of making a broken image", async () => {
    await expect(readAsDataUrl(png([], "empty.png"))).rejects.toThrow(
      "Couldn't read empty.png: the file is empty",
    );
  });

  it("rejects with the file name and reason when the read fails", async () => {
    vi.stubGlobal("FileReader", fakeReader("error"));

    await expect(readAsDataUrl(png(["x"], "b.png"))).rejects.toThrow(
      "Couldn't read b.png: disk gone",
    );
  });

  it("rejects when the read is aborted", async () => {
    vi.stubGlobal("FileReader", fakeReader("abort"));

    await expect(readAsDataUrl(png(["x"], "b.png"))).rejects.toThrow(
      "Reading b.png was cancelled",
    );
  });

  it("rejects when the result isn't a string", async () => {
    vi.stubGlobal("FileReader", fakeReader("nonString"));

    await expect(readAsDataUrl(png(["x"], "b.png"))).rejects.toThrow(
      "Couldn't read b.png: no data",
    );
  });

  it("rejects with a real Error, not a bare string or event", async () => {
    vi.stubGlobal("FileReader", fakeReader("error"));

    await expect(readAsDataUrl(png(["x"]))).rejects.toBeInstanceOf(Error);
  });
});
