import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { stubObjectUrls } from "../test/objectUrls";
import {
  createFrame,
  createVideo,
  frameAlt,
  moveItem,
  neighborAfterRemove,
  releasedUrls,
  videoRemovedMessage,
} from "./model";

describe("createFrame", () => {
  let urls: ReturnType<typeof stubObjectUrls>;
  const jpeg = () => new Blob(["x"], { type: "image/jpeg" });
  const photo = { kind: "photo", fileName: "a.png" } as const;

  beforeEach(() => {
    urls = stubObjectUrls();
  });

  afterEach(() => {
    urls.restore();
  });

  it("keeps the blob and source, adds a blob: URL and a fresh id", () => {
    const blob = jpeg();
    const frame = createFrame(blob, photo);

    expect(frame.blob).toBe(blob);
    expect(frame.source).toEqual(photo);
    expect(frame.src).toBe("blob:test/1");
    expect(urls.create).toHaveBeenCalledWith(blob);
    expect(frame.id).toMatch(/^[0-9a-f-]{32,36}$/);
  });

  it("never repeats an id", () => {
    const blob = jpeg();
    const ids = new Set(
      Array.from({ length: 10_000 }, () => createFrame(blob, photo).id),
    );

    expect(ids.size).toBe(10_000);
  });

  it("refuses an empty blob without making a URL", () => {
    expect(() => createFrame(new Blob([]), photo)).toThrow(/non-empty blob/);
    expect(urls.create).not.toHaveBeenCalled();
  });

  it("still makes ids without crypto.randomUUID (insecure context)", () => {
    vi.stubGlobal("crypto", {
      getRandomValues: crypto.getRandomValues.bind(crypto),
    });

    expect(createFrame(jpeg(), photo).id).toMatch(/^[0-9a-f]{32}$/);
  });
});

describe("frameAlt", () => {
  it("names the video and time for a capture", () => {
    expect(
      frameAlt({ kind: "capture", videoName: "dance.mov", time: 12.7 }, 3),
    ).toBe("Frame 3, from dance.mov at 00:12");
  });

  it("uses the viewer's clock format past an hour", () => {
    expect(
      frameAlt({ kind: "capture", videoName: "toasts.mp4", time: 3725 }, 1),
    ).toBe("Frame 1, from toasts.mp4 at 1:02:05");
  });

  it("names the file for a photo", () => {
    expect(frameAlt({ kind: "photo", fileName: "beach.jpg" }, 3))
      .toBe("Frame 3, photo beach.jpg");
  });

  it("follows the frame's position, not where it started", () => {
    const source = { kind: "photo", fileName: "a.png" } as const;

    expect(frameAlt(source, 1)).toBe("Frame 1, photo a.png");
    expect(frameAlt(source, 4)).toBe("Frame 4, photo a.png");
  });
});

describe("createVideo", () => {
  it("keeps the file name for labels", () => {
    const video = createVideo("data:video/mp4;base64,AA==", "beach.mp4");

    expect(video).toMatchObject({
      src: "data:video/mp4;base64,AA==",
      name: "beach.mp4",
    });
    expect(video.id).toBeTruthy();
  });

  it("refuses a blank src", () => {
    expect(() => createVideo("", "beach.mp4")).toThrow(/non-empty src/);
  });
});

describe("moveItem", () => {
  const items = ["a", "b", "c", "d"].map((id) => ({ id }));
  const ids = (list: readonly { id: string }[]) => list.map((i) => i.id);

  it.each([
    ["first to last", "a", 3, ["b", "c", "d", "a"]],
    ["last to first", "d", 0, ["d", "a", "b", "c"]],
    ["one later", "b", 2, ["a", "c", "b", "d"]],
    ["one earlier", "c", 1, ["a", "c", "b", "d"]],
  ])("%s", (_, id, to, expected) => {
    expect(ids(moveItem(items, id, to))).toEqual(expected);
  });

  it("clamps an index past either end to that end", () => {
    expect(ids(moveItem(items, "b", 99))).toEqual(["a", "c", "d", "b"]);
    expect(ids(moveItem(items, "c", -3))).toEqual(["c", "a", "b", "d"]);
  });

  it("drops a fractional index to a whole one (a drag can land between)",
    () => {
      expect(ids(moveItem(items, "a", 2.9))).toEqual(["b", "c", "a", "d"]);
    });

  it("returns the same array when nothing moves", () => {
    expect(moveItem(items, "b", 1)).toBe(items);
    expect(moveItem(items, "zzz", 0)).toBe(items);
    expect(moveItem(items, "a", Number.NaN)).toBe(items);
    expect(moveItem([], "a", 0)).toEqual([]);
  });

  it("keeps the same objects and doesn't change the list it was given",
    () => {
      const moved = moveItem(items, "a", 3);

      expect(moved).not.toBe(items);
      expect(moved[3]).toBe(items[0]);
      expect(ids(items)).toEqual(["a", "b", "c", "d"]);
    });
});

describe("neighborAfterRemove", () => {
  const items = [{ id: "a" }, { id: "b" }, { id: "c" }];

  it.each([
    ["first", "a", "b"],
    ["middle", "b", "c"],
    ["last", "c", "b"],
  ])("removing the %s item focuses %s's neighbor", (_, removed, expected) => {
    expect(neighborAfterRemove(items, removed)).toBe(expected);
  });

  it("returns null when the only item goes (focus the heading)", () => {
    expect(neighborAfterRemove([{ id: "a" }], "a")).toBeNull();
  });

  it("returns null for an empty list", () => {
    expect(neighborAfterRemove([], "a")).toBeNull();
  });

  it("returns null for an id that isn't there", () => {
    expect(neighborAfterRemove(items, "zzz")).toBeNull();
  });

  it("doesn't change the list it was given", () => {
    neighborAfterRemove(items, "b");

    expect(items).toEqual([{ id: "a" }, { id: "b" }, { id: "c" }]);
  });
});

describe("releasedUrls", () => {
  const items = (...srcs: string[]) => srcs.map((src) => ({ src }));

  it("returns the blob: URLs that left the list", () => {
    expect(
      releasedUrls(items("blob:a", "blob:b", "blob:c"), items("blob:b")),
    ).toEqual(["blob:a", "blob:c"]);
  });

  it("returns nothing when nothing left", () => {
    expect(releasedUrls(items("blob:a"), items("blob:a"))).toEqual([]);
    expect(releasedUrls([], [])).toEqual([]);
  });

  it("returns nothing for items that were only added", () => {
    expect(releasedUrls(items("blob:a"), items("blob:a", "blob:b")))
      .toEqual([]);
  });

  it("skips URLs that hold nothing to release", () => {
    expect(
      releasedUrls(items("data:image/png;base64,aGk=", "https://x/y"), []),
    ).toEqual([]);
  });

  it("keeps a URL another item still uses", () => {
    expect(releasedUrls(items("blob:a", "blob:a"), items("blob:a")))
      .toEqual([]);
  });

  it("lists a URL once even if several items used it", () => {
    expect(releasedUrls(items("blob:a", "blob:a"), [])).toEqual(["blob:a"]);
  });
});

describe("videoRemovedMessage", () => {
  const videos = [
    { id: "a", name: "a.mp4" },
    { id: "b", name: "b.mp4" },
    { id: "c", name: "c.mp4" },
  ];

  it("counts what's left when the removed video wasn't playing", () => {
    expect(videoRemovedMessage(videos, "b", "a"))
      .toBe("Video removed. 2 left.");
  });

  it("counts what's left when nothing was playing", () => {
    expect(videoRemovedMessage(videos, "b", null))
      .toBe("Video removed. 2 left.");
  });

  it.each([
    ["first", "a", "b.mp4"],
    ["middle", "b", "c.mp4"],
    ["last", "c", "b.mp4"],
  ])(
    "names the next video when the playing (%s) one goes",
    (_, removed, shown) => {
      expect(videoRemovedMessage(videos, removed, removed))
        .toBe(`Video removed. Now showing ${shown}.`);
    },
  );

  it("says none are left when the last video goes", () => {
    const only = [{ id: "a", name: "a.mp4" }];

    expect(videoRemovedMessage(only, "a", "a"))
      .toBe("Video removed. No videos left.");
    expect(videoRemovedMessage(only, "a", null))
      .toBe("Video removed. No videos left.");
  });

  it("returns null for an id that isn't there", () => {
    expect(videoRemovedMessage(videos, "zzz", "a")).toBeNull();
    expect(videoRemovedMessage([], "a", null)).toBeNull();
  });
});
