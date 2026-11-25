import { describe, expect, it } from "vitest";

import {
  emptyWorkspace,
  workspaceReducer,
  type WorkspaceState,
} from "./state";
import { type Frame, type Video } from "./types";

const video = (id: string): Video => ({ id, src: `data:${id}`, name: id });
const frame = (id: string): Frame => ({ id, src: `data:${id}` });

const withVideos = (
  ids: string[],
  selectedVideoId: string | null,
): WorkspaceState => ({
  ...emptyWorkspace,
  videos: ids.map(video),
  selectedVideoId,
});

describe("videosAdded", () => {
  it("appends and selects the first new video when none is selected", () => {
    const next = workspaceReducer(emptyWorkspace, {
      type: "videosAdded",
      videos: [video("a"), video("b")],
    });

    expect(next.videos.map((v) => v.id)).toEqual(["a", "b"]);
    expect(next.selectedVideoId).toBe("a");
  });

  it("keeps the current selection when more videos arrive", () => {
    const next = workspaceReducer(withVideos(["a"], "a"), {
      type: "videosAdded",
      videos: [video("b")],
    });

    expect(next.selectedVideoId).toBe("a");
  });

  it("ignores an empty add", () => {
    expect(
      workspaceReducer(emptyWorkspace, { type: "videosAdded", videos: [] }),
    ).toBe(emptyWorkspace);
  });
});

describe("videoSelected", () => {
  it("selects a video that exists", () => {
    const next = workspaceReducer(withVideos(["a", "b"], "a"), {
      type: "videoSelected",
      id: "b",
    });

    expect(next.selectedVideoId).toBe("b");
  });

  it("ignores an unknown id or the current one", () => {
    const state = withVideos(["a"], "a");

    expect(workspaceReducer(state, { type: "videoSelected", id: "zzz" }))
      .toBe(state);
    expect(workspaceReducer(state, { type: "videoSelected", id: "a" }))
      .toBe(state);
  });
});

describe("videoRemoved", () => {
  it("shows the next video when the selected one goes", () => {
    const next = workspaceReducer(withVideos(["a", "b", "c"], "b"), {
      type: "videoRemoved",
      id: "b",
    });

    expect(next.videos.map((v) => v.id)).toEqual(["a", "c"]);
    expect(next.selectedVideoId).toBe("c");
  });

  it("shows the previous video when the selected last one goes", () => {
    const next = workspaceReducer(withVideos(["a", "b"], "b"), {
      type: "videoRemoved",
      id: "b",
    });

    expect(next.selectedVideoId).toBe("a");
  });

  it("clears the selection when the only video goes", () => {
    const next = workspaceReducer(withVideos(["a"], "a"), {
      type: "videoRemoved",
      id: "a",
    });

    expect(next.videos).toEqual([]);
    expect(next.selectedVideoId).toBeNull();
  });

  it("leaves the viewer alone when another video goes", () => {
    const next = workspaceReducer(withVideos(["a", "b"], "a"), {
      type: "videoRemoved",
      id: "b",
    });

    expect(next.selectedVideoId).toBe("a");
  });

  it("ignores an unknown id", () => {
    const state = withVideos(["a"], "a");

    expect(workspaceReducer(state, { type: "videoRemoved", id: "zzz" }))
      .toBe(state);
  });
});

describe("frames", () => {
  it("appends added frames in order", () => {
    const once = workspaceReducer(emptyWorkspace, {
      type: "framesAdded",
      frames: [frame("a")],
    });
    const twice = workspaceReducer(once, {
      type: "framesAdded",
      frames: [frame("b"), frame("c")],
    });

    expect(twice.frames.map((f) => f.id)).toEqual(["a", "b", "c"]);
  });

  it("removes a frame by id and ignores unknown ids", () => {
    const state = { ...emptyWorkspace, frames: [frame("a"), frame("b")] };

    expect(
      workspaceReducer(state, { type: "frameRemoved", id: "a" })
        .frames.map((f) => f.id),
    ).toEqual(["b"]);
    expect(workspaceReducer(state, { type: "frameRemoved", id: "zzz" }))
      .toBe(state);
  });

  it("ignores an empty add", () => {
    expect(
      workspaceReducer(emptyWorkspace, { type: "framesAdded", frames: [] }),
    ).toBe(emptyWorkspace);
  });

  it("never changes the state it was given", () => {
    const state = withVideos(["a", "b"], "a");
    const snapshot = JSON.stringify(state);

    workspaceReducer(state, { type: "videoRemoved", id: "a" });
    workspaceReducer(state, { type: "framesAdded", frames: [frame("x")] });

    expect(JSON.stringify(state)).toBe(snapshot);
  });
});
