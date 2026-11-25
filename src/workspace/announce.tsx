import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

/* One polite live region for the whole page. Tiles and buttons call
 * announce("Frame 3 added.") instead of threading a callback through
 * props. Copy for the messages is in the spike (slice 3, copy item 9). */
export type AnnounceContextValue = {
  announce: (message: string) => void;
};

export const AnnounceContext =
  createContext<AnnounceContextValue | null>(null);

type AnnounceProviderProps = {
  children: ReactNode;
};

/* Screen readers only speak a live region when its text changes, so the
 * same message twice in a row ("Frame removed. 2 left." after removing,
 * adding, removing) would be silent. Emptying the region first and
 * writing the message a beat later makes every call a change. */
export const REANNOUNCE_DELAY_MS = 50;

/* Renders children plus the visually hidden live region. The region is
 * always in the DOM: one added at the same moment as its text often isn't
 * read at all. */
export const AnnounceProvider = ({
  children,
}: AnnounceProviderProps): JSX.Element => {
  const [message, setMessage] = useState("");
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);

  const announce = useCallback((next: string) => {
    if (next.trim() === "") return;

    // Several calls in quick succession: only the last one is spoken.
    if (pending.current) clearTimeout(pending.current);

    setMessage("");
    pending.current = setTimeout(() => {
      pending.current = null;
      setMessage(next);
    }, REANNOUNCE_DELAY_MS);
  }, []);

  // Don't set state after the provider is gone.
  useEffect(
    () => () => {
      if (pending.current) clearTimeout(pending.current);
    },
    [],
  );

  // Stable value, so announcing doesn't re-render every consumer.
  const value = useMemo(() => ({ announce }), [announce]);

  return (
    <AnnounceContext.Provider value={value}>
      {children}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {message}
      </div>
    </AnnounceContext.Provider>
  );
};

/* Throws if used outside AnnounceProvider, so a missing provider fails
 * loudly instead of announcements silently going nowhere. */
export const useAnnounce = (): AnnounceContextValue => {
  const value = useContext(AnnounceContext);

  if (!value) {
    throw new Error("useAnnounce must be used inside <AnnounceProvider>");
  }
  return value;
};
