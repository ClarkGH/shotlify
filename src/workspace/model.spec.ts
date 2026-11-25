import { describe, expect, it, vi } from "vitest";

import { createFrame, createVideo, neighborAfterRemove } from "./model";

describe("createFrame", () => {
  it("returns the src with a fresh id", () => {
    const frame = createFrame("data:image/png;base64,aGk=");

    expect(frame.src).toBe("data:image/png;base64,aGk=");
    expect(frame.id).toMatch(/^[0-9a-f-]{32,36}$/);
  });

  it("never repeats an id", () => {
    const ids = new Set(
      Array.from({ length: 10_000 }, () => createFrame("x").id),
    );

    expect(ids.size).toBe(10_000);
  });

  it.each(["", "   "])("refuses a blank src (%j)", (src) => {
    expect(() => createFrame(src)).toThrow(/non-empty src/);
  });

  it("still makes ids without crypto.randomUUID (insecure context)", () => {
    vi.stubGlobal("crypto", {
      getRandomValues: crypto.getRandomValues.bind(crypto),
    });

    expect(createFrame("x").id).toMatch(/^[0-9a-f]{32}$/);
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
