import { useEffect, useReducer, useRef } from "react";

import { useAnnounce } from "./announce";
import { objectUrlFor } from "./files";
import { createFrame, createVideo } from "./model";
import { preparePhoto } from "./photos";
import { emptyWorkspace, workspaceReducer } from "./state";
import { type CaptureSource, type Video } from "./types";
import { useReleaseUrls } from "./useReleaseUrls";

const toError = (thrown: unknown): Error =>
  thrown instanceof Error ? thrown : new Error(String(thrown));

type PrepareResult = {
  /* In the order picked, each with the name its alt text needs. */
  prepared: { blob: Blob; fileName: string }[];
  /* The first failure, if any; the rest still go through. */
  error: Error | null;
};

/* Prepares every photo, keeping the ones that work: one bad photo
 * shouldn't throw away the other nine. */
const prepareAll = async (files: File[]): Promise<PrepareResult> => {
  const results = await Promise.allSettled(
    files.map(async (file) => ({
      blob: await preparePhoto(file),
      fileName: file.name,
    })),
  );
  const prepared: PrepareResult["prepared"] = [];
  let error: Error | null = null;

  for (const result of results) {
    if (result.status === "fulfilled") prepared.push(result.value);
    else error ??= toError(result.reason);
  }

  return { prepared, error };
};

/* The workspace page's state plus the actions the components call. State
 * rules live in state.ts (pure, specced); this adds files, ids, blob: URLs
 * and announcements. Must be used inside AnnounceProvider. */
export const useWorkspace = () => {
  const [state, dispatch] = useReducer(workspaceReducer, emptyWorkspace);
  const { announce } = useAnnounce();

  // Async work (photos, captures) finishes after renders; it needs the
  // latest frame count, not the one from when it started.
  const latest = useRef(state);
  useEffect(() => {
    latest.current = state;
  }, [state]);

  useReleaseUrls(state.videos);
  useReleaseUrls(state.frames);

  /* "Frame N added." for the last new frame. When a photo failed, the
   * error is announced instead (last call wins), since the new tiles are
   * already visible and the failure isn't. */
  const reportAdded = (added: number, error: Error | null) => {
    if (added > 0) {
      announce(`Frame ${latest.current.frames.length + added} added.`);
    }
    if (error) announce(error.message);
  };

  /* Videos get blob: URLs, not reads: nothing to wait for. Like photos,
   * one bad file doesn't stop the rest, and the first failure is
   * announced. */
  const addVideos = (files: File[]) => {
    const videos: Video[] = [];
    let error: Error | null = null;

    for (const file of files) {
      try {
        videos.push(createVideo(objectUrlFor(file), file.name));
      } catch (thrown) {
        error ??= toError(thrown);
      }
    }

    dispatch({ type: "videosAdded", videos });
    if (error) announce(error.message);
  };

  const addPhotos = async (files: File[]) => {
    const { prepared, error } = await prepareAll(files);
    const frames = prepared.map(({ blob, fileName }) =>
      createFrame(blob, { kind: "photo", fileName }),
    );
    reportAdded(frames.length, error);
    dispatch({ type: "framesAdded", frames });
  };

  /* The Viewer calls this once its JPEG is ready, which can be after
   * other frames arrived, so the count comes from `latest`. */
  const capture = (blob: Blob, source: CaptureSource) => {
    reportAdded(1, null);
    dispatch({ type: "framesAdded", frames: [createFrame(blob, source)] });
  };

  /* Components expect plain callbacks. Anything unexpected in the async
   * work is announced rather than lost as an unhandled rejection. */
  const run = (work: Promise<void>) => {
    work.catch((thrown: unknown) => {
      announce(toError(thrown).message);
    });
  };

  const selectedVideo: Video | null =
    state.videos.find((video) => video.id === state.selectedVideoId) ?? null;

  return {
    ...state,
    selectedVideo,
    addVideos,
    addPhotos: (files: File[]) => run(addPhotos(files)),
    capture,
    selectVideo: (id: string) => dispatch({ type: "videoSelected", id }),
    removeVideo: (id: string) => dispatch({ type: "videoRemoved", id }),
    moveFrame: (id: string, toIndex: number) =>
      dispatch({ type: "frameMoved", id, toIndex }),
    removeFrame: (id: string) => dispatch({ type: "frameRemoved", id }),
  };
};
