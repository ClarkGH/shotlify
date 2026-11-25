import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Specs are colocated *.spec.ts. Default environment is plain Node;
    // a spec that needs browser APIs opts in with
    // `// @vitest-environment jsdom` at the top.
    include: ["src/**/*.spec.ts", "src/**/*.spec.tsx"],
    setupFiles: ["src/test/setup.ts"],
    // Every test starts clean: spies, mocks and stubbed globals are undone.
    restoreMocks: true,
    unstubGlobals: true,
  },
});
