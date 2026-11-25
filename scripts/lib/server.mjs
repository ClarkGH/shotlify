// @ts-check
/* Shared by the browser checks (smoke.mjs, a11y.mjs): build the app, start
 * `next start` on a free port, and stop it again. */
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:net";

export const HOST = "127.0.0.1";
const START_TIMEOUT_MS = 30_000;

/** Runs `pnpm build` with its output shown. @returns {boolean} success */
export const build = () =>
  spawnSync("pnpm", ["build"], { stdio: "inherit" }).status === 0;

/** Ask the OS for a free port so a check never collides with `pnpm dev`.
 * @returns {Promise<number>} */
const freePort = () =>
  new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, HOST, () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close(() => (port ? resolve(port) : reject(new Error("no port"))));
    });
  });

/** Poll until the server answers or the timeout runs out.
 * @param {string} url
 * @returns {Promise<void>} */
const waitForServer = async (url) => {
  const deadline = Date.now() + START_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      await fetch(url);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 300));
    }
  }
  throw new Error(`server didn't answer within ${START_TIMEOUT_MS}ms`);
};

/** Starts the last build. Call `stop()` when done, even after a failure.
 * @returns {Promise<{ url: string, stop: () => void }>} */
export const startServer = async () => {
  const port = await freePort();
  const url = `http://${HOST}:${port}/`;
  const server = spawn(
    "pnpm",
    ["exec", "next", "start", "-H", HOST, "-p", String(port)],
    { stdio: "ignore", detached: true },
  );

  const stop = () => {
    // detached gives the server its own process group; kill all of it.
    if (!server.pid) return;
    try {
      process.kill(-server.pid, "SIGTERM");
    } catch {
      // already gone
    }
  };

  try {
    await waitForServer(url);
  } catch (error) {
    stop();
    throw error;
  }
  return { url, stop };
};

/** Shared exit handling: 0 pass, 1 a check failed, 2 couldn't run.
 * @param {string} name
 * @param {() => Promise<number>} main */
export const runMain = (name, main) => {
  main().then(
    (code) => process.exit(code),
    (err) => {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`${name}: couldn't run: ${msg}`);
      if (/Executable doesn't exist/.test(msg)) {
        console.error(
          "Install the browser: " +
            "pnpm exec playwright-core install chromium-headless-shell",
        );
      }
      process.exit(2);
    },
  );
};
