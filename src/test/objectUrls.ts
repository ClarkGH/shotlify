import { vi } from "vitest";

/* jsdom has no URL.createObjectURL or URL.revokeObjectURL. This installs
 * stand-ins that hand out "blob:test/1", "blob:test/2", ... and record
 * revokes. Call restore() in afterEach. */
export const stubObjectUrls = () => {
  const original = {
    create: Object.getOwnPropertyDescriptor(URL, "createObjectURL"),
    revoke: Object.getOwnPropertyDescriptor(URL, "revokeObjectURL"),
  };
  let count = 0;
  const create = vi.fn<(object: Blob) => string>(() => {
    count += 1;
    return `blob:test/${count}`;
  });
  const revoke = vi.fn<(url: string) => void>();

  Object.defineProperty(URL, "createObjectURL", {
    value: create,
    configurable: true,
    writable: true,
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    value: revoke,
    configurable: true,
    writable: true,
  });

  const restore = () => {
    for (const [key, descriptor] of [
      ["createObjectURL", original.create],
      ["revokeObjectURL", original.revoke],
    ] as const) {
      if (descriptor) Object.defineProperty(URL, key, descriptor);
      else Reflect.deleteProperty(URL, key);
    }
  };

  return { create, revoke, restore };
};
