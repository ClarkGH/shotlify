// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { stubObjectUrls } from "../test/objectUrls";
import { useReleaseUrls } from "./useReleaseUrls";

const items = (...srcs: string[]) => srcs.map((src) => ({ src }));

describe("useReleaseUrls", () => {
  let urls: ReturnType<typeof stubObjectUrls>;

  beforeEach(() => {
    urls = stubObjectUrls();
  });

  afterEach(() => {
    urls.restore();
  });

  const renderWith = (initial: { src: string }[], strict = false) =>
    renderHook(({ list }) => useReleaseUrls(list), {
      initialProps: { list: initial },
      wrapper: strict ? StrictMode : undefined,
    });

  it("revokes nothing on the first render", () => {
    renderWith(items("blob:a", "blob:b"));

    expect(urls.revoke).not.toHaveBeenCalled();
  });

  it("revokes the URL of an item that was removed", () => {
    const view = renderWith(items("blob:a", "blob:b"));

    view.rerender({ list: items("blob:b") });

    expect(urls.revoke).toHaveBeenCalledTimes(1);
    expect(urls.revoke).toHaveBeenCalledWith("blob:a");
  });

  it("revokes each URL once across later changes", () => {
    const view = renderWith(items("blob:a", "blob:b"));

    view.rerender({ list: items("blob:b") });
    view.rerender({ list: items("blob:b", "blob:c") });
    view.rerender({ list: [] });

    expect(urls.revoke.mock.calls).toEqual([
      ["blob:a"],
      ["blob:b"],
      ["blob:c"],
    ]);
  });

  it("revokes nothing on unmount (the page may remount)", () => {
    const view = renderWith(items("blob:a"));

    view.unmount();

    expect(urls.revoke).not.toHaveBeenCalled();
  });

  it("revokes nothing when Strict Mode remounts", () => {
    renderWith(items("blob:a", "blob:b"), true);

    expect(urls.revoke).not.toHaveBeenCalled();
  });
});
