import { describe, expect, it } from "vitest";

import { formatTime } from "./time";

describe("formatTime", () => {
  it.each([
    [0, "00:00"],
    [5, "00:05"],
    [134, "02:14"],
    [134.99, "02:14"],
    [3599, "59:59"],
    [3600, "1:00:00"],
    [3734, "1:02:14"],
  ])("formats %s seconds as %s", (seconds, expected) => {
    expect(formatTime(seconds)).toBe(expected);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, -3])(
    "shows 00:00 for a position that isn't real (%s)",
    (seconds) => {
      expect(formatTime(seconds)).toBe("00:00");
    },
  );
});
