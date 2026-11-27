// @vitest-environment jsdom
import { fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { AnnounceProvider } from "./announce";
import { GALLERY_COPY } from "./FrameGallery";
import FrameStrip from "./FrameStrip";
import { moveItem } from "./model";
import { type Frame } from "./types";

/* Through FrameStrip, so opening from a tile and focus on close are real.
 * jsdom's <dialog> is the minimal stand-in from src/test/setup.ts; the
 * browser's own trap, inert page and Esc are checked by `pnpm a11y`. */
const makeFrames = (...ids: string[]): Frame[] =>
  ids.map((id) => ({
    id,
    blob: new Blob([id]),
    source: { kind: "photo", fileName: `${id}.png` },
    src: `blob:test/${id}`,
  }));

const Harness = ({ initial }: { initial: Frame[] }) => {
  const [frames, setFrames] = useState(initial);
  return (
    <AnnounceProvider>
      <FrameStrip
        frames={frames}
        onMove={(id, to) => setFrames((f) => [...moveItem(f, id, to)])}
        onRemove={(id) => setFrames((f) => f.filter((x) => x.id !== id))}
        onAddPhotos={() => undefined}
      />
    </AnnounceProvider>
  );
};

const dialog = () => {
  const element = document.querySelector("dialog");
  if (!element) throw new Error("no <dialog>");
  return element;
};
const inDialog = () => within(dialog());
const view = (name: string) => screen.getByRole("button", { name });
const title = () => dialog().querySelector("h2")?.textContent;
const shownImage = () => dialog().querySelector("img")?.getAttribute("alt");
const open = (position: number, of: number, id: string) =>
  fireEvent.click(view(`View frame ${position}, photo ${id}.png`));

describe("FrameGallery", () => {
  it("names each photo as a button that opens it", () => {
    render(<Harness initial={makeFrames("a", "b")} />);

    expect(view("View frame 2, photo b.png").getAttribute("type"))
      .toBe("button");
  });

  it("starts closed", () => {
    render(<Harness initial={makeFrames("a", "b")} />);

    expect(dialog().open).toBe(false);
    expect(dialog().querySelector("img")).toBeNull();
  });

  it("opens on the frame that was pressed, at full size", () => {
    render(<Harness initial={makeFrames("a", "b", "c")} />);

    open(2, 3, "b");

    expect(dialog().open).toBe(true);
    expect(title()).toBe("Frame 2 of 3");
    expect(shownImage()).toBe("Frame 2, photo b.png");
    expect(dialog().querySelector("img")?.getAttribute("src"))
      .toBe("blob:test/b");
  });

  it("is labelled by its title, which speaks for itself", () => {
    render(<Harness initial={makeFrames("a", "b")} />);
    open(1, 2, "a");

    const heading = dialog().querySelector("h2");
    expect(dialog().getAttribute("aria-labelledby")).toBe(heading?.id);
    // The page's announcer is inert behind a modal dialog.
    expect(heading?.getAttribute("aria-live")).toBe("polite");
  });

  it("steps with Next and Previous", () => {
    render(<Harness initial={makeFrames("a", "b", "c")} />);
    open(1, 3, "a");

    fireEvent.click(inDialog().getByRole("button", { name: /Next frame/ }));
    expect(title()).toBe("Frame 2 of 3");
    fireEvent.click(inDialog().getByRole("button", { name: /Next frame/ }));
    expect(shownImage()).toBe("Frame 3, photo c.png");
    fireEvent.click(
      inDialog().getByRole("button", { name: /Previous frame/ }),
    );
    expect(title()).toBe("Frame 2 of 3");
  });

  it("blocks Previous on the first frame and Next on the last", () => {
    render(<Harness initial={makeFrames("a", "b")} />);
    open(1, 2, "a");
    const previous = inDialog().getByRole("button", { name: /Previous/ });

    fireEvent.click(previous);

    expect(title()).toBe("Frame 1 of 2");
    expect(previous.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(inDialog().getByRole("button", { name: /Next/ }));
    expect(
      inDialog().getByRole("button", { name: /Next/ })
        .getAttribute("aria-disabled"),
    ).toBe("true");
  });

  it("steps with the arrow keys, stopping at the ends", () => {
    render(<Harness initial={makeFrames("a", "b", "c")} />);
    open(2, 3, "b");

    fireEvent.keyDown(dialog(), { key: "ArrowRight" });
    expect(title()).toBe("Frame 3 of 3");
    fireEvent.keyDown(dialog(), { key: "ArrowRight" });
    expect(title()).toBe("Frame 3 of 3");
    fireEvent.keyDown(dialog(), { key: "ArrowLeft" });
    fireEvent.keyDown(dialog(), { key: "ArrowLeft" });
    fireEvent.keyDown(dialog(), { key: "ArrowLeft" });
    expect(title()).toBe("Frame 1 of 3");
  });

  it("closes with Close and puts focus on the frame it ended on", () => {
    render(<Harness initial={makeFrames("a", "b", "c")} />);
    open(1, 3, "a");
    fireEvent.click(inDialog().getByRole("button", { name: /Next/ }));

    fireEvent.click(
      inDialog().getByRole("button", { name: GALLERY_COPY.close }),
    );

    expect(dialog().open).toBe(false);
    expect(document.activeElement).toBe(view("View frame 2, photo b.png"));
  });

  it("returns focus the same way when the browser closes it (Esc)", () => {
    render(<Harness initial={makeFrames("a", "b")} />);
    open(2, 2, "b");

    // Esc makes the browser close the dialog and fire "close".
    dialog().close();

    expect(document.activeElement).toBe(view("View frame 2, photo b.png"));
  });

  it("closes on a backdrop click, not on a click inside", () => {
    render(<Harness initial={makeFrames("a", "b")} />);
    open(1, 2, "a");

    const image = dialog().querySelector("img");
    if (!image) throw new Error("no image");
    fireEvent.click(image);
    expect(dialog().open).toBe(true);

    fireEvent.click(dialog());
    expect(dialog().open).toBe(false);
  });

  it("can open again after closing", () => {
    render(<Harness initial={makeFrames("a", "b")} />);
    open(1, 2, "a");
    dialog().close();

    open(2, 2, "b");

    expect(dialog().open).toBe(true);
    expect(title()).toBe("Frame 2 of 2");
  });
});
