// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import { type ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AnnounceProvider, REANNOUNCE_DELAY_MS } from "./announce";
import { type Video } from "./types";
import Viewer, { VIEWER_COPY_DRAFT } from "./Viewer";

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

/* jsdom has no canvas drawing: stand in a 2D context. */
const stubCanvas = (dataUrl = "data:image/png;base64,CAPTURED") => {
  const drawImage = vi.fn();
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
    function (this: HTMLCanvasElement) {
      return { canvas: this, drawImage } as unknown as RenderingContext;
    },
  );
  const toDataURL = vi
    .spyOn(HTMLCanvasElement.prototype, "toDataURL")
    .mockReturnValue(dataUrl);
  return { drawImage, toDataURL };
};

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

  it("captures the current frame at full size as a PNG", () => {
    const { drawImage, toDataURL } = stubCanvas();
    const onCapture = vi.fn();
    renderWithAnnouncer(<Viewer video={video("a")} onCapture={onCapture} />);
    loadFrame(1920, 1080);

    fireEvent.click(captureButton());

    expect(drawImage).toHaveBeenCalledWith(videoElement(), 0, 0, 1920, 1080);
    expect(toDataURL).toHaveBeenCalledWith("image/png");
    expect(onCapture).toHaveBeenCalledWith("data:image/png;base64,CAPTURED");
  });

  it("says so, instead of failing silently, when there's no canvas", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext")
      .mockReturnValue(null);
    const onCapture = vi.fn();
    renderWithAnnouncer(<Viewer video={video("a")} onCapture={onCapture} />);
    loadFrame();

    fireEvent.click(captureButton());

    expect(onCapture).not.toHaveBeenCalled();
    expect(spoken()).toBe(VIEWER_COPY_DRAFT.captureFailed);
  });

  it("explains and blocks capture when the video can't play", () => {
    renderWithAnnouncer(<Viewer video={video("a")} onCapture={vi.fn()} />);

    fireEvent.error(videoElement());

    expect(visibleMessage(VIEWER_COPY_DRAFT.cantPlay)).toBeTruthy();
    expect(captureButton().getAttribute("aria-disabled")).toBe("true");
    expect(spoken()).toBe(VIEWER_COPY_DRAFT.cantPlay);
  });

  it("treats a file with no picture (width 0) as unplayable", () => {
    renderWithAnnouncer(<Viewer video={video("a")} onCapture={vi.fn()} />);

    loadFrame(0, 0);

    expect(captureButton().getAttribute("aria-disabled")).toBe("true");
    expect(visibleMessage(VIEWER_COPY_DRAFT.cantPlay)).toBeTruthy();
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

    expect(visibleMessage(VIEWER_COPY_DRAFT.cantPlay)).toBeUndefined();
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
