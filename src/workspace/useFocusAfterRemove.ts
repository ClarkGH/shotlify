import { useEffect, useRef, type RefObject } from "react";

import { neighborAfterRemove } from "./model";

/* Keeps keyboard focus in place when an item is removed from a list.
 * Without it, focus stays on a button that no longer exists and drops to
 * <body>, sending keyboard users back to the top of the page.
 *
 * Call the returned `prepare(id)` right before reporting a removal. After
 * the list re-renders without that item, focus moves to the first button
 * of the neighbor (next, else previous), or to `fallbackRef` (the list's
 * heading) when the list is empty. Rows are found by `attribute` inside
 * `listRef`, e.g. data-frame-id="…". */
type Options = {
  listRef: RefObject<HTMLElement>;
  fallbackRef: RefObject<HTMLElement>;
  attribute: `data-${string}`;
};

type Pending = {
  removedId: string;
  /* null: focus the fallback */
  targetId: string | null;
};

export const useFocusAfterRemove = (
  items: readonly { id: string }[],
  { listRef, fallbackRef, attribute }: Options,
): ((removedId: string) => boolean) => {
  const pending = useRef<Pending | null>(null);

  /* Returns false (and does nothing) for an id that isn't in the list. */
  const prepare = (removedId: string): boolean => {
    if (!items.some((item) => item.id === removedId)) return false;

    // Decide now: once the list changes, the removed item's position is
    // gone.
    pending.current = {
      removedId,
      targetId: neighborAfterRemove(items, removedId),
    };
    return true;
  };

  useEffect(() => {
    const next = pending.current;
    if (!next) return;
    pending.current = null;

    // The parent didn't remove it (this render is for something else, like
    // an add): don't move focus out from under the user.
    if (items.some((item) => item.id === next.removedId)) return;

    const row = next.targetId === null
      ? undefined
      : Array.from(
        listRef.current?.querySelectorAll<HTMLElement>(`[${attribute}]`)
          ?? [],
      ).find((element) => element.getAttribute(attribute) === next.targetId);

    const button = row?.querySelector("button");
    (button ?? fallbackRef.current)?.focus();
  }, [items, listRef, fallbackRef, attribute]);

  return prepare;
};
