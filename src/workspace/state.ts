import { moveItem, neighborAfterRemove } from "./model";
import { type Frame, type Video } from "./types";

/* Everything the workspace page holds, and every way it changes. Pure:
 * no React, no files, no announcements, so each rule has a spec. A no-op
 * action returns the same state object, so React skips the re-render. */
export type WorkspaceState = {
  videos: Video[];
  frames: Frame[];
  selectedVideoId: string | null;
};

export type WorkspaceAction =
  | { type: "videosAdded"; videos: Video[] }
  | { type: "videoSelected"; id: string }
  | { type: "videoRemoved"; id: string }
  | { type: "framesAdded"; frames: Frame[] }
  | { type: "frameRemoved"; id: string }
  /* toIndex = where it ends up (0-based); clamped, see moveItem */
  | { type: "frameMoved"; id: string; toIndex: number };

export const emptyWorkspace: WorkspaceState = {
  videos: [],
  frames: [],
  selectedVideoId: null,
};

const has = (items: readonly { id: string }[], id: string) =>
  items.some((item) => item.id === id);

export const workspaceReducer = (
  state: WorkspaceState,
  action: WorkspaceAction,
): WorkspaceState => {
  switch (action.type) {
    case "videosAdded": {
      const [first] = action.videos;
      if (!first) return state;
      return {
        ...state,
        videos: [...state.videos, ...action.videos],
        // Show the first new video only if nothing is showing yet; don't
        // yank the viewer away from what the user is working on.
        selectedVideoId: state.selectedVideoId ?? first.id,
      };
    }

    case "videoSelected":
      if (!has(state.videos, action.id)) return state;
      if (state.selectedVideoId === action.id) return state;
      return { ...state, selectedVideoId: action.id };

    case "videoRemoved": {
      if (!has(state.videos, action.id)) return state;
      return {
        ...state,
        videos: state.videos.filter((video) => video.id !== action.id),
        // Removing what's on screen shows its neighbor (the same rule
        // focus follows); removing anything else leaves the viewer alone.
        selectedVideoId: state.selectedVideoId === action.id
          ? neighborAfterRemove(state.videos, action.id)
          : state.selectedVideoId,
      };
    }

    case "framesAdded":
      if (action.frames.length === 0) return state;
      return { ...state, frames: [...state.frames, ...action.frames] };

    case "frameRemoved":
      if (!has(state.frames, action.id)) return state;
      return {
        ...state,
        frames: state.frames.filter((frame) => frame.id !== action.id),
      };

    case "frameMoved": {
      const frames = moveItem(state.frames, action.id, action.toIndex);
      if (frames === state.frames) return state;
      return { ...state, frames: [...frames] };
    }

    default: {
      // A new action type that isn't handled fails to compile here.
      const unhandled: never = action;
      return unhandled;
    }
  }
};
