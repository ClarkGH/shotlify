import { useId, useRef } from "react";

import FilePicker from "../common/components/FilePicker";
import { useAnnounce } from "./announce";
import { videoRemovedMessage } from "./model";
import { type Video } from "./types";
import { useFocusAfterRemove } from "./useFocusAfterRemove";

/* "Your videos": pick which one the viewer shows, add more, remove one.
 * Owns the "Add video" FilePicker. Each row: the file name as a button
 * (aria-current="true" on the selected one) and a "Remove" text button.
 * After a remove, focus moves to the neighbor's name, or to the heading
 * when the list empties, and the removal is announced
 * (videoRemovedMessage). Choosing the next selection is the page's job. */
export type VideoListProps = {
  videos: readonly Video[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: (files: File[]) => void;
  onRemove: (id: string) => void;
};

/* Any video type the browser offers; the Viewer handles ones it can't
 * play. */
export const VIDEO_TYPES = "video/*";

const VideoList = ({
  videos,
  selectedId,
  onSelect,
  onAdd,
  onRemove,
}: VideoListProps): JSX.Element => {
  const { announce } = useAnnounce();
  const headingId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  // The first button in a row is the video's name, so that's where focus
  // lands.
  const prepareFocus = useFocusAfterRemove(videos, {
    listRef,
    fallbackRef: headingRef,
    attribute: "data-video-id",
  });

  const handleRemove = (id: string) => {
    if (!prepareFocus(id)) return;
    const message = videoRemovedMessage(videos, id, selectedId);
    if (message) announce(message);
    onRemove(id);
  };

  return (
    <aside aria-labelledby={headingId} className="flex flex-col gap-3">
      {/* tabIndex -1: focusable from code (when the last video goes),
       * never a Tab stop. */}
      <h2
        id={headingId}
        ref={headingRef}
        tabIndex={-1}
        className={
          `m-0 text-xl font-bold text-[#1e2422]
          focus-visible:outline-[3px] focus-visible:outline-solid
          focus-visible:outline-offset-4 focus-visible:outline-[#1e2422]`
        }
      >
        Your videos
      </h2>

      {videos.length > 0 && (
        // role="list": Safari drops list semantics when list-style is
        // none.
        <ul
          ref={listRef}
          role="list"
          className="m-0 list-none border-t border-[#c9d1ce] p-0"
        >
          {videos.map((video) => (
            <li
              key={video.id}
              data-video-id={video.id}
              className="flex items-center gap-2 border-b border-[#c9d1ce]"
            >
              <button
                type="button"
                aria-current={video.id === selectedId ? "true" : undefined}
                onClick={() => onSelect(video.id)}
                className={
                  `min-h-11 min-w-0 flex-1 cursor-pointer px-1 text-left
                  text-[17px] leading-snug text-[#1e2422]
                  [overflow-wrap:anywhere]
                  aria-[current=true]:font-bold
                  aria-[current=true]:underline
                  aria-[current=true]:underline-offset-[0.2em]
                  focus-visible:outline-[3px] focus-visible:outline-solid
                  focus-visible:outline-offset-2
                  focus-visible:outline-[#1e2422]`
                }
              >
                {video.name}
              </button>
              <button
                type="button"
                aria-label={`Remove video ${video.name}`}
                onClick={() => handleRemove(video.id)}
                className={
                  `min-h-11 flex-none cursor-pointer px-1 text-[15px]
                  text-[#56615e] underline underline-offset-[0.2em]
                  hover:text-[#1e2422]
                  focus-visible:outline-[3px] focus-visible:outline-solid
                  focus-visible:outline-offset-2
                  focus-visible:outline-[#1e2422]`
                }
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="pt-2">
        <FilePicker
          label="Add video"
          accept={VIDEO_TYPES}
          multiple
          variant="secondary"
          onFilesChosen={onAdd}
        />
      </div>
    </aside>
  );
};

export default VideoList;
