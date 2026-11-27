import { formatTime } from "./time";
import { type Frame, type FrameSource, type Video } from "./types";

/* A random id. crypto.randomUUID only exists in secure contexts (https or
 * localhost), so opening the dev server from a phone over http://<LAN IP>
 * would crash without the fallback. getRandomValues works everywhere. Ids
 * only need to be unique within one page session. */
const makeId = (): string => {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();

  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
};

/* An empty src would render as a broken image with no error, so refuse it
 * here, where the bug is, instead of in the UI. */
const requireSrc = (src: string, what: string): void => {
  if (src.trim() === "") throw new Error(`${what} needs a non-empty src`);
};

/* The one place ids are created, never from an array index. Callers hand
 * over the image or video source; these return the finished item. A
 * frame's blob: URL is made here too, so a Frame never exists without
 * one; useReleaseUrls revokes it. */
export const createFrame = (blob: Blob, source: FrameSource): Frame => {
  if (blob.size === 0) throw new Error("createFrame needs a non-empty blob");
  return { id: makeId(), blob, source, src: URL.createObjectURL(blob) };
};

/* A frame's alt text (Clark's copy, 2026-11-26): its position, then where
 * it came from. The time matches the viewer's clock (formatTime). */
export const frameAlt = (source: FrameSource, position: number): string =>
  source.kind === "capture"
    ? `Frame ${position}, from ${source.videoName} ` +
      `at ${formatTime(source.time)}`
    : `Frame ${position}, photo ${source.fileName}`;

export const createVideo = (src: string, name: string): Video => {
  requireSrc(src, "createVideo");
  return { id: makeId(), src, name };
};

/* Where focus goes after an item is removed: the item that slides into
 * its place, else the one before it, else null (the list is now empty, so
 * the caller focuses the list's heading). Returns an id from `items`, the
 * list as it was before the removal. An id that isn't in the list also
 * returns null: nothing was removed, so there's no neighbor to pick. */
export const neighborAfterRemove = (
  items: readonly { id: string }[],
  removedId: string,
): string | null => {
  const index = items.findIndex((item) => item.id === removedId);
  if (index === -1) return null;

  const next = items[index + 1];
  if (next) return next.id;

  const previous = items[index - 1];
  return previous ? previous.id : null;
};

/* `items` with `id` moved to `toIndex` (its index after the move), the
 * others keeping their order. An index past either end clamps to that
 * end, so a drag (4c) can pass wherever the pointer landed. Returns the
 * same array when nothing moves (unknown id, NaN, already there), so the
 * reducer can return the same state. */
export const moveItem = <T extends { id: string }>(
  items: readonly T[],
  id: string,
  toIndex: number,
): readonly T[] => {
  const from = items.findIndex((item) => item.id === id);
  if (from === -1 || Number.isNaN(toIndex)) return items;

  const to = Math.min(Math.max(Math.trunc(toIndex), 0), items.length - 1);
  if (to === from) return items;

  const moved = items[from];
  if (!moved) return items;
  const rest = items.filter((_, index) => index !== from);
  return [...rest.slice(0, to), moved, ...rest.slice(to)];
};

/* The blob: URLs that were in `before` and aren't in `after`, each once:
 * the ones safe to revoke now. Other URLs (data:, https:) hold nothing
 * to release, so they're skipped. */
export const releasedUrls = (
  before: readonly { src: string }[],
  after: readonly { src: string }[],
): string[] => {
  const kept = new Set(after.map((item) => item.src));
  const released = before
    .map((item) => item.src)
    .filter((src) => src.startsWith("blob:") && !kept.has(src));
  return [...new Set(released)];
};

/* What to announce when a video is removed (Clark's copy, 2026-11-26).
 * Focus already reads the next video's name, so this only adds what focus
 * can't: how many are left, or that the viewer switched videos. Uses the
 * same neighbor rule as the reducer, so "Now showing" names the video the
 * viewer really shows. `videos` is the list before the removal; an
 * unknown id returns null (nothing was removed). */
export const videoRemovedMessage = (
  videos: readonly { id: string; name: string }[],
  removedId: string,
  selectedId: string | null,
): string | null => {
  if (!videos.some((video) => video.id === removedId)) return null;

  const left = videos.length - 1;
  if (left === 0) return "Video removed. No videos left.";
  if (removedId !== selectedId) return `Video removed. ${left} left.`;

  const nextId = neighborAfterRemove(videos, removedId);
  const next = videos.find((video) => video.id === nextId);
  return next
    ? `Video removed. Now showing ${next.name}.`
    : `Video removed. ${left} left.`;
};
