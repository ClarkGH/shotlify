// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AnnounceProvider, REANNOUNCE_DELAY_MS } from "./announce";
import { type Video } from "./types";
import VideoList, { VIDEO_TYPES } from "./VideoList";

const makeVideos = (...names: string[]): Video[] =>
  names.map((name) => ({
    id: name,
    src: `data:video/mp4;base64,${name}`,
    name,
  }));

/* Owns videos and selection like the page will, so removals re-render. */
const Harness = ({
  initial,
  selected = null,
  onAdd = () => undefined,
  onSelect,
}: {
  initial: Video[];
  selected?: string | null;
  onAdd?: (files: File[]) => void;
  onSelect?: (id: string) => void;
}) => {
  const [videos, setVideos] = useState(initial);
  const [selectedId, setSelectedId] = useState(selected);
  return (
    <AnnounceProvider>
      <VideoList
        videos={videos}
        selectedId={selectedId}
        onSelect={(id) => {
          setSelectedId(id);
          onSelect?.(id);
        }}
        onAdd={onAdd}
        onRemove={(id) => setVideos((v) => v.filter((x) => x.id !== id))}
      />
    </AnnounceProvider>
  );
};

const spoken = () => {
  act(() => {
    vi.advanceTimersByTime(REANNOUNCE_DELAY_MS);
  });
  return screen.getByRole("status").textContent;
};

const nameButton = (name: string) => screen.getByRole("button", { name });
const removeButton = (name: string) =>
  screen.getByRole("button", { name: `Remove video ${name}` });

describe("VideoList", () => {
  it("is a landmark labelled by its heading", () => {
    render(<Harness initial={makeVideos("a.mp4")} />);

    expect(
      screen.getByRole("complementary", { name: "Your videos" }),
    ).toBeTruthy();
  });

  it("lists each video with a select and a remove button", () => {
    render(<Harness initial={makeVideos("ceremony.mp4", "dance.mov")} />);

    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(nameButton("ceremony.mp4")).toBeTruthy();
    expect(removeButton("dance.mov").textContent).toBe("Remove");
  });

  it("marks only the selected video as current", () => {
    render(
      <Harness
        initial={makeVideos("a.mp4", "b.mp4")}
        selected="b.mp4"
      />,
    );

    expect(nameButton("a.mp4").getAttribute("aria-current")).toBeNull();
    expect(nameButton("b.mp4").getAttribute("aria-current")).toBe("true");
  });

  it("reports a selection and moves the current mark", () => {
    const onSelect = vi.fn();
    render(
      <Harness
        initial={makeVideos("a.mp4", "b.mp4")}
        selected="a.mp4"
        onSelect={onSelect}
      />,
    );

    fireEvent.click(nameButton("b.mp4"));

    expect(onSelect).toHaveBeenCalledWith("b.mp4");
    expect(nameButton("b.mp4").getAttribute("aria-current")).toBe("true");
    expect(nameButton("a.mp4").getAttribute("aria-current")).toBeNull();
  });

  it("shows no list when there are no videos, but still offers Add", () => {
    render(<Harness initial={[]} />);

    expect(screen.queryByRole("list")).toBeNull();
    expect(screen.getByLabelText("Add video")).toBeTruthy();
  });

  it("passes chosen videos up", () => {
    const onAdd = vi.fn();
    render(<Harness initial={[]} onAdd={onAdd} />);

    const input = screen.getByLabelText<HTMLInputElement>("Add video");
    expect(input.accept).toBe(VIDEO_TYPES);
    expect(input.multiple).toBe(true);

    const video = new File(["x"], "a.mp4", { type: "video/mp4" });
    Object.defineProperty(input, "files", {
      value: [video],
      configurable: true,
    });
    fireEvent.change(input);

    expect(onAdd).toHaveBeenCalledWith([video]);
  });

  it("moves focus to the next video's name after a remove", () => {
    render(<Harness initial={makeVideos("a.mp4", "b.mp4", "c.mp4")} />);

    fireEvent.click(removeButton("b.mp4"));

    expect(document.activeElement).toBe(nameButton("c.mp4"));
  });

  it("moves focus back one when the last video goes", () => {
    render(<Harness initial={makeVideos("a.mp4", "b.mp4")} />);

    fireEvent.click(removeButton("b.mp4"));

    expect(document.activeElement).toBe(nameButton("a.mp4"));
  });

  it("moves focus to the heading when the only video goes", () => {
    render(<Harness initial={makeVideos("a.mp4")} />);

    fireEvent.click(removeButton("a.mp4"));

    const heading = screen.getByRole("heading", { name: "Your videos" });
    expect(document.activeElement).toBe(heading);
    expect(heading.getAttribute("tabindex")).toBe("-1");
  });

  /* The case logic has its own specs (model.spec.ts); these check the
   * list passes it the right list and selection. */
  describe("announcing a remove", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("counts what's left when the video wasn't playing", () => {
      render(
        <Harness
          initial={makeVideos("a.mp4", "b.mp4", "c.mp4")}
          selected="a.mp4"
        />,
      );

      fireEvent.click(removeButton("b.mp4"));

      expect(spoken()).toBe("Video removed. 2 left.");
    });

    it("names the next video when the playing one goes", () => {
      render(
        <Harness initial={makeVideos("a.mp4", "b.mp4")} selected="a.mp4" />,
      );

      fireEvent.click(removeButton("a.mp4"));

      expect(spoken()).toBe("Video removed. Now showing b.mp4.");
    });

    it("says none are left when the last video goes", () => {
      render(<Harness initial={makeVideos("a.mp4")} selected="a.mp4" />);

      fireEvent.click(removeButton("a.mp4"));

      expect(spoken()).toBe("Video removed. No videos left.");
    });
  });
});
