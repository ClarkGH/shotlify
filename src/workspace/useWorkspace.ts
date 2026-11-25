import { useEffect, useReducer, useRef } from "react";

import { useAnnounce } from "./announce";
import { readAsDataUrl } from "./files";
import { createFrame, createVideo } from "./model";
import { emptyWorkspace, workspaceReducer } from "./state";
import { type Video } from "./types";

type ReadResult = {
  read: { file: File; src: string }[];
  /* The first failure, if any; the rest still go through. */
  error: Error | null;
};

/* Reads every file, keeping the ones that work: one bad photo shouldn't
 * throw away the other nine. */
const readAll = async (files: File[]): Promise<ReadResult> => {
  const results = await Promise.allSettled(files.map(readAsDataUrl));
  const read: ReadResult["read"] = [];
  let error: Error | null = null;

  results.forEach((result, index) => {
    const file = files[index];
    if (!file) return;

    if (result.status === "fulfilled") {
      read.push({ file, src: result.value });
    } else if (!error) {
      error = result.reason instanceof Error
        ? result.reason
        : new Error(String(result.reason));
    }
  });

  return { read, error };
};

/* The workspace page's state plus the actions the components call. State
 * rules live in state.ts (pure, specced); this adds file reading, ids and
 * announcements. Must be used inside AnnounceProvider. */
export const useWorkspace = () => {
  const [state, dispatch] = useReducer(workspaceReducer, emptyWorkspace);
  const { announce } = useAnnounce();

  // Async reads finish after renders; they need the latest frame count,
  // not the one from when the files were picked.
  const latest = useRef(state);
  useEffect(() => {
    latest.current = state;
  }, [state]);

  /* "Frame N added." for the last new frame. When a read failed, the
   * error is announced instead (last call wins), since the new tiles are
   * already visible and the failure isn't. */
  const reportAdded = (added: number, error: Error | null) => {
    if (added > 0) {
      announce(`Frame ${latest.current.frames.length + added} added.`);
    }
    if (error) announce(error.message);
  };

  const addVideos = async (files: File[]) => {
    const { read, error } = await readAll(files);
    dispatch({
      type: "videosAdded",
      videos: read.map(({ file, src }) => createVideo(src, file.name)),
    });
    if (error) announce(error.message);
  };

  const addPhotos = async (files: File[]) => {
    const { read, error } = await readAll(files);
    const frames = read.map(({ src }) => createFrame(src));
    reportAdded(frames.length, error);
    dispatch({ type: "framesAdded", frames });
  };

  const capture = (src: string) => {
    dispatch({ type: "framesAdded", frames: [createFrame(src)] });
    announce(`Frame ${state.frames.length + 1} added.`);
  };

  /* Components expect plain callbacks. Anything unexpected in the async
   * work is announced rather than lost as an unhandled rejection. */
  const run = (work: Promise<void>) => {
    work.catch((thrown: unknown) => {
      announce(thrown instanceof Error ? thrown.message : String(thrown));
    });
  };

  const selectedVideo: Video | null =
    state.videos.find((video) => video.id === state.selectedVideoId) ?? null;

  return {
    ...state,
    selectedVideo,
    addVideos: (files: File[]) => run(addVideos(files)),
    addPhotos: (files: File[]) => run(addPhotos(files)),
    capture,
    selectVideo: (id: string) => dispatch({ type: "videoSelected", id }),
    removeVideo: (id: string) => dispatch({ type: "videoRemoved", id }),
    removeFrame: (id: string) => dispatch({ type: "frameRemoved", id }),
  };
};
