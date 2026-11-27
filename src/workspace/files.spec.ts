// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { stubObjectUrls } from "../test/objectUrls";
import { objectUrlFor } from "./files";

describe("objectUrlFor", () => {
  let urls: ReturnType<typeof stubObjectUrls>;

  beforeEach(() => {
    urls = stubObjectUrls();
  });

  afterEach(() => {
    urls.restore();
  });

  it("hands back a blob: URL for the file itself", () => {
    const file = new File(["x"], "a.webm", { type: "video/webm" });

    expect(objectUrlFor(file)).toBe("blob:test/1");
    expect(urls.create).toHaveBeenCalledWith(file);
  });

  it("refuses an empty file without making a URL", () => {
    const empty = new File([], "empty.webm", { type: "video/webm" });

    expect(() => objectUrlFor(empty)).toThrow(
      "Couldn't read empty.webm: the file is empty",
    );
    expect(urls.create).not.toHaveBeenCalled();
  });
});
