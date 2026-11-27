// @vitest-environment jsdom
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { stubImagePipeline } from "../test/imagePipeline";
import { stubObjectUrls } from "../test/objectUrls";
import { AnnounceProvider, REANNOUNCE_DELAY_MS } from "./announce";
import Workspace, { TAGLINE } from "./Workspace";

/* The whole page, wired: real reducer, real FileReader (jsdom), real
 * components. Only the browser's file dialog is skipped. */
const renderPage = () =>
  render(
    <AnnounceProvider>
      <Workspace />
    </AnnounceProvider>,
  );

const pick = (label: string, files: File[]) => {
  const input = screen.getByLabelText<HTMLInputElement>(label);
  Object.defineProperty(input, "files", { value: files, configurable: true });
  fireEvent.change(input);
};

const photo = (name: string, body = "x") =>
  new File([body], name, { type: "image/png" });
const clip = (name: string, body = "x") =>
  new File([body], name, { type: "video/webm" });

/* Real timers here (FileReader is async), so wait out the announcer. */
const spoken = async () => {
  await act(
    () =>
      new Promise((resolve) => {
        setTimeout(resolve, REANNOUNCE_DELAY_MS + 10);
      }),
  );
  return screen.getByRole("status").textContent;
};

const createButton = () =>
  screen.getByRole("button", { name: "Create slideshow" });

describe("Workspace page", () => {
  let urls: ReturnType<typeof stubObjectUrls>;

  beforeEach(() => {
    urls = stubObjectUrls();
    stubImagePipeline();
  });

  afterEach(() => {
    urls.restore();
  });

  it("starts empty: tagline, viewer hint, strip hint, create blocked", () => {
    renderPage();

    expect(screen.getByRole("heading", { level: 1, name: "Shotlify" }))
      .toBeTruthy();
    expect(screen.getByText(TAGLINE)).toBeTruthy();
    expect(
      screen.getByText(
        "Add a video, pause on a moment you like, and capture it.",
      ),
    ).toBeTruthy();
    expect(screen.getByText("View your slideshow's frames here"))
      .toBeTruthy();
    expect(createButton().getAttribute("aria-disabled")).toBe("true");
  });

  it("adds photos as frames, announces, and unblocks create", async () => {
    renderPage();

    pick("Add photos", [photo("a.png"), photo("b.png")]);

    await waitFor(() => {
      expect(screen.getAllByRole("listitem")).toHaveLength(2);
    });
    expect(await spoken()).toBe("Frame 2 added.");
    expect(createButton().getAttribute("aria-disabled")).toBeNull();
  });

  it("keeps good photos and announces the one that failed", async () => {
    renderPage();

    pick("Add photos", [photo("good.png"), photo("empty.png", "")]);

    await waitFor(() => {
      expect(screen.getAllByRole("listitem")).toHaveLength(1);
    });
    expect(await spoken()).toBe(
      "Couldn't read empty.png: the file is empty",
    );
  });

  it("shows the first added video and keeps it when more arrive", async () => {
    renderPage();

    pick("Add video", [clip("ceremony.webm"), clip("toasts.webm")]);

    await waitFor(() => {
      expect(document.querySelector("video")?.getAttribute("aria-label"))
        .toBe("ceremony.webm");
    });
    expect(
      screen.getByRole("button", { name: "ceremony.webm" })
        .getAttribute("aria-current"),
    ).toBe("true");
  });

  it("plays videos from blob: URLs, not file reads", async () => {
    renderPage();

    pick("Add video", [clip("ceremony.webm")]);

    await waitFor(() => {
      expect(document.querySelector("video")?.getAttribute("src"))
        .toBe("blob:test/1");
    });
  });

  it("keeps good videos and announces the one that failed", async () => {
    renderPage();

    pick("Add video", [clip("good.webm"), clip("empty.webm", "")]);

    await screen.findByRole("button", { name: "good.webm" });
    expect(screen.queryByRole("button", { name: "empty.webm" })).toBeNull();
    expect(await spoken()).toBe(
      "Couldn't read empty.webm: the file is empty",
    );
  });

  it("releases a removed video's URL and keeps the others", async () => {
    renderPage();
    pick("Add video", [clip("ceremony.webm"), clip("toasts.webm")]);
    await screen.findByRole("button", { name: "toasts.webm" });

    fireEvent.click(
      screen.getByRole("button", { name: "Remove video ceremony.webm" }),
    );

    await waitFor(() => {
      expect(urls.revoke).toHaveBeenCalledWith("blob:test/1");
    });
    expect(urls.revoke).toHaveBeenCalledTimes(1);
    expect(document.querySelector("video")?.getAttribute("src"))
      .toBe("blob:test/2");
  });

  it("switches the viewer when another video is picked", async () => {
    renderPage();
    pick("Add video", [clip("ceremony.webm"), clip("toasts.webm")]);
    await screen.findByRole("button", { name: "toasts.webm" });

    fireEvent.click(screen.getByRole("button", { name: "toasts.webm" }));

    expect(document.querySelector("video")?.getAttribute("aria-label"))
      .toBe("toasts.webm");
  });

  it("shows the next video when the one on screen is removed", async () => {
    renderPage();
    pick("Add video", [clip("ceremony.webm"), clip("toasts.webm")]);
    await screen.findByRole("button", { name: "toasts.webm" });

    fireEvent.click(
      screen.getByRole("button", { name: "Remove video ceremony.webm" }),
    );

    expect(document.querySelector("video")?.getAttribute("aria-label"))
      .toBe("toasts.webm");
  });

  it("removes a frame and blocks create again when none are left", async () => {
    renderPage();
    pick("Add photos", [photo("a.png")]);
    await screen.findByRole("button", { name: "Remove frame 1 of 1" });

    fireEvent.click(
      screen.getByRole("button", { name: "Remove frame 1 of 1" }),
    );

    expect(screen.getByText("View your slideshow's frames here"))
      .toBeTruthy();
    expect(createButton().getAttribute("aria-disabled")).toBe("true");
    expect(await spoken()).toBe("Frame removed. 0 left.");
  });

  it("captures a frame from the video into the strip", async () => {
    renderPage();
    pick("Add video", [clip("ceremony.webm")]);
    const video = await waitFor(() => {
      const element = document.querySelector("video");
      if (!element) throw new Error("no video yet");
      return element;
    });
    Object.defineProperty(video, "videoWidth", { value: 640 });
    Object.defineProperty(video, "videoHeight", { value: 360 });
    fireEvent.loadedData(video);

    fireEvent.click(screen.getByRole("button", { name: "Capture this frame" }));

    // The video took blob:test/1; the JPEG is the next one.
    const tile = await screen.findByRole("img", {
      name: "Frame 1, from ceremony.webm at 00:00",
    });
    expect(tile.getAttribute("src")).toBe("blob:test/2");
    expect(urls.create).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: "image/jpeg" }),
    );
    expect(await spoken()).toBe("Frame 1 added.");
  });

  it("shows the re-encoded JPEG, never the uploaded file", async () => {
    renderPage();
    const original = photo("a.png");

    pick("Add photos", [original]);

    await screen.findByRole("img", { name: "Frame 1, photo a.png" });
    expect(urls.create).toHaveBeenCalledTimes(1);
    expect(urls.create).not.toHaveBeenCalledWith(original);
    expect(urls.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: "image/jpeg" }),
    );
  });

  it("keeps good photos and names the one that won't open", async () => {
    renderPage();

    pick("Add photos", [photo("good.png"), photo("photo.heic", "corrupt")]);

    await waitFor(() => {
      expect(screen.getAllByRole("listitem")).toHaveLength(1);
    });
    expect(await spoken()).toBe(
      "Couldn't open photo.heic. Try a JPEG or PNG.",
    );
  });

  it("shows photos from blob: URLs and releases a removed one", async () => {
    renderPage();
    pick("Add photos", [photo("a.png"), photo("b.png")]);
    const first = await screen.findByRole("img", {
      name: "Frame 1, photo a.png",
    });
    expect(first.getAttribute("src")).toBe("blob:test/1");

    fireEvent.click(
      screen.getByRole("button", { name: "Remove frame 1 of 2" }),
    );

    await waitFor(() => {
      expect(urls.revoke).toHaveBeenCalledWith("blob:test/1");
    });
    expect(urls.revoke).toHaveBeenCalledTimes(1);
    // b.png moved up to position 1, and its alt text followed.
    expect(
      screen.getByRole("img", { name: "Frame 1, photo b.png" })
        .getAttribute("src"),
    ).toBe("blob:test/2");
  });
});
