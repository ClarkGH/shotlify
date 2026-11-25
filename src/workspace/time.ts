/* A video position as "02:14", or "1:02:14" past an hour. Anything that
 * isn't a real position (NaN before metadata loads, Infinity for a live
 * stream, a negative) shows as "00:00" instead of "NaN:NaN". */
export const formatTime = (seconds: number): string => {
  const total = Number.isFinite(seconds) && seconds > 0
    ? Math.floor(seconds)
    : 0;

  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const two = (n: number) => String(n).padStart(2, "0");

  return hours > 0
    ? `${hours}:${two(minutes)}:${two(secs)}`
    : `${two(minutes)}:${two(secs)}`;
};
