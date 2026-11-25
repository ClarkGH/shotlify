// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

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
  );
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
});
