import { type Frame, type Video } from "./types";

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
 * over the image or video source; these return the finished item. */
export const createFrame = (src: string): Frame => {
  requireSrc(src, "createFrame");
  return { id: makeId(), src };
};

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
