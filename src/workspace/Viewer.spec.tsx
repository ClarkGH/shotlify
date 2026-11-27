// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import { type ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AnnounceProvider, REANNOUNCE_DELAY_MS } from "./announce";
import { encodeJpeg } from "./encode";
import { type Video } from "./types";
import Viewer, { VIEWER_COPY } from "./Viewer";

/* Encoding has its own spec (encode.spec.ts); here it only has to hand
 * back a blob or fail. */
vi.mock("./encode", () => ({ encodeJpeg: vi.fn() }));

const video = (id: string): Video => ({
  id,
  src: `data:video/webm;base64,${id}`,
  name: `${id}.webm`,
});

const renderWithAnnouncer = (ui: ReactElement) =>
  render(<AnnounceProvider>{ui}</AnnounceProvider>);

const captureButton = () =>
  screen.getByRole("button", { name: "Capture this frame" });

const videoElement = () => {
  const element = document.querySelector("video");
  if (!element) throw new Error("no <video> rendered");
  return element;
};

/* jsdom doesn't decode video: give the element a size, then say the
 * first frame is ready. */
const loadFrame = (width = 640, height = 360) => {
  const element = videoElement();
  Object.defineProperty(element, "videoWidth", { value: width });
  Object.defineProperty(element, "videoHeight", { value: height });
  fireEvent.loadedData(element);
};

/* Lets the capture's promise finish (microtasks, not timers). */
const settle = () => act(() => Promise.resolve());

/* The message also lives in the button's screen-reader description and in
 * the live region (both on purpose); this finds the one on screen. */
const visibleMessage = (text: string) =>
  screen.queryAllByText(text).find((element) => element.tagName === "P");

const spoken = () => {
  act(() => {
    vi.advanceTimersByTime(REANNOUNCE_DELAY_MS);
  });
  return screen.getByRole("status").textContent;
};

describe("Viewer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows the empty state and no capture button without a video", () => {
    renderWithAnnouncer(<Viewer video={null} onCapture={vi.fn()} />);

    expect(
      screen.getByText(
        "Add a video, pause on a moment you like, and capture it.",
      ),
    ).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByRole("region", { name: "Viewer" })).toBeTruthy();
  });

  it("shows the video with native controls, named by its file", () => {
    renderWithAnnouncer(<Viewer video={video("a")} onCapture={vi.fn()} />);

    const element = videoElement();
    expect(element.getAttribute("src")).toBe("data:video/webm;base64,a");
    expect(element.controls).toBe(true);
    expect(element.getAttribute("aria-label")).toBe("a.webm");
  });

  it("blocks capture, with a reason, until the first frame loads", () => {
    const onCapture = vi.fn();
    renderWithAnnouncer(<Viewer video={video("a")} onCapture={onCapture} />);

    expect(captureButton().getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(captureButton());
    expect(onCapture).not.toHaveBeenCalled();

    loadFrame();
    expect(captureButton().getAttribute("aria-disabled")).toBeNull();
  });

  it("encodes the current frame at its full size and hands it up",
    async () => {
      const jpeg = new Blob(["jpeg"], { type: "image/jpeg" });
      vi.mocked(encodeJpeg).mockResolvedValueOnce(jpeg);
      const onCapture = vi.fn();
      renderWithAnnouncer(
        <Viewer video={video("a")} onCapture={onCapture} />,
      );
      loadFrame(1920, 1080);

      fireEvent.click(captureButton());
      await settle();

      expect(encodeJpeg).toHaveBeenCalledWith(videoElement(), 1920, 1080);
      expect(onCapture).toHaveBeenCalledWith(jpeg, {
        kind: "capture",
        videoName: "a.webm",
        time: 0,
      });
    });

  it("labels the capture with the moment Capture was pressed", async () => {
    let finish: (blob: Blob) => void = () => undefined;
    vi.mocked(encodeJpeg).mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const onCapture = vi.fn();
    renderWithAnnouncer(<Viewer video={video("a")} onCapture={onCapture} />);
    loadFrame();
    let now = 12;
    Object.defineProperty(videoElement(), "currentTime", {
      get: () => now,
      configurable: true,
    });

    fireEvent.click(captureButton());
    now = 30; // the video plays on while the JPEG encodes
    finish(new Blob(["jpeg"]));
    await settle();

    expect(onCapture).toHaveBeenCalledWith(
      expect.any(Blob),
      expect.objectContaining({ time: 12 }),
    );
  });

  it("says so, instead of failing silently, when encoding fails",
    async () => {
      vi.mocked(encodeJpeg).mockRejectedValueOnce(new Error("no context"));
      const onCapture = vi.fn();
      renderWithAnnouncer(
        <Viewer video={video("a")} onCapture={onCapture} />,
      );
      loadFrame();

      fireEvent.click(captureButton());
      await settle();

      expect(onCapture).not.toHaveBeenCalled();
      expect(spoken()).toBe(VIEWER_COPY.captureFailed);
    });

  it("explains and blocks capture when the video can't play", () => {
    renderWithAnnouncer(<Viewer video={video("a")} onCapture={vi.fn()} />);

    fireEvent.error(videoElement());

    expect(visibleMessage(VIEWER_COPY.cantPlay)).toBeTruthy();
    expect(captureButton().getAttribute("aria-disabled")).toBe("true");
    expect(spoken()).toBe(VIEWER_COPY.cantPlay);
  });

  it("treats a file with no picture (width 0) as unplayable", () => {
    renderWithAnnouncer(<Viewer video={video("a")} onCapture={vi.fn()} />);

    loadFrame(0, 0);

    expect(captureButton().getAttribute("aria-disabled")).toBe("true");
    expect(visibleMessage(VIEWER_COPY.cantPlay)).toBeTruthy();
  });

  it("starts fresh when the video changes", () => {
    const view = renderWithAnnouncer(
      <Viewer video={video("a")} onCapture={vi.fn()} />,
    );
    fireEvent.error(videoElement());

    view.rerender(
      <AnnounceProvider>
        <Viewer video={video("b")} onCapture={vi.fn()} />
      </AnnounceProvider>,
    );

    expect(visibleMessage(VIEWER_COPY.cantPlay)).toBeUndefined();
    expect(videoElement().getAttribute("src"))
      .toBe("data:video/webm;base64,b");
  });

  it("shows the playback position", () => {
    renderWithAnnouncer(<Viewer video={video("a")} onCapture={vi.fn()} />);
    const element = videoElement();

    Object.defineProperty(element, "currentTime", {
      value: 134.5,
      configurable: true,
    });
    fireEvent.timeUpdate(element);

    expect(screen.getByText("02:14")).toBeTruthy();
  });
});
