// @vitest-environment jsdom
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

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
const clip = (name: string) =>
  new File(["x"], name, { type: "video/webm" });

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
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
      function (this: HTMLCanvasElement) {
        return { canvas: this, drawImage: vi.fn() } as unknown as
          RenderingContext;
      },
    );
    vi.spyOn(HTMLCanvasElement.prototype, "toDataURL")
      .mockReturnValue("data:image/png;base64,Q0FQ");
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

    expect(screen.getByRole("img", { name: "Frame 1" }).getAttribute("src"))
      .toBe("data:image/png;base64,Q0FQ");
    expect(await spoken()).toBe("Frame 1 added.");
  });
});
