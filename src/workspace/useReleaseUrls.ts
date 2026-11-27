import { useEffect, useRef } from "react";

import { releasedUrls } from "./model";

/* Revokes the blob: URL of every item that leaves `items`, after React
 * has removed it from the page, so nothing on screen still points at a
 * dead URL.
 *
 * Nothing is revoked on unmount, on purpose: React's Strict Mode
 * unmounts and remounts in development, which would revoke URLs the
 * remounted page still shows. Closing the page frees them anyway. */
export const useReleaseUrls = (items: readonly { src: string }[]): void => {
  const previous = useRef(items);

  useEffect(() => {
    releasedUrls(previous.current, items).forEach((url) => {
      URL.revokeObjectURL(url);
    });
    previous.current = items;
  }, [items]);
};
