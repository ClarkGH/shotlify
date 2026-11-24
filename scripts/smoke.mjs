// @ts-check
/* Production smoke check: build, start, and load the home page in headless
 * Chromium. Catches what build and lint can't: the CSP blocking the app's
 * own scripts (e.g. if `--webpack` is dropped from the build script), or a
 * page that renders but never hydrates.
 *
 * Usage: pnpm smoke            (builds first)
 *        pnpm smoke --no-build (reuses .next from the last build)
 * Exit code 0 = pass, 1 = a check failed, 2 = couldn't run. */
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:net";
import { chromium } from "playwright-core";

const HOST = "127.0.0.1";
const START_TIMEOUT_MS = 30_000;

/** Ask the OS for a free port so the check never collides with `pnpm dev`.
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

/** Run the browser checks against a running server.
 * @param {string} url
 * @returns {Promise<string[]>} failures, empty when everything passes */
const runChecks = async (url) => {
  const failures = [];
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    /** @type {string[]} */
    const errors = [];
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));

    const response = await page.goto(url, { waitUntil: "networkidle" });
    if (!response || response.status() !== 200) {
      failures.push(`home returned ${response?.status() ?? "no response"}`);
    }
    if (!response?.headers()["content-security-policy"]) {
      failures.push("no Content-Security-Policy header on /");
    }

    // React marks the root container once it has hydrated.
    const hydrated = await page.evaluate(() => {
      const root = document.querySelector("#__next");
      return !!root && Object.keys(root).some((k) => k.startsWith("__react"));
    });
    if (!hydrated) failures.push("page rendered but React never hydrated");

    if (errors.length) {
      failures.push(`console errors on load:\n  ${errors.join("\n  ")}`);
    }

    // The CSP must actually be enforced, not just sent.
    const injectedRan = await page.evaluate(() => {
      const w = /** @type {any} */ (window);
      w.__smoke = 0;
      const s = document.createElement("script");
      s.textContent = "window.__smoke = 1";
      document.body.append(s);
      return w.__smoke === 1;
    });
    if (injectedRan) failures.push("an injected inline script ran (CSP off)");
  } finally {
    await browser.close();
  }
  return failures;
};

const main = async () => {
  if (!process.argv.includes("--no-build")) {
    const build = spawnSync("pnpm", ["build"], { stdio: "inherit" });
    if (build.status !== 0) {
      console.error("smoke: build failed");
      return 1;
    }
  }

  const port = await freePort();
  const url = `http://${HOST}:${port}/`;
  const server = spawn(
    "pnpm",
    ["exec", "next", "start", "-H", HOST, "-p", String(port)],
    { stdio: "ignore", detached: true },
  );

  try {
    await waitForServer(url);
    const failures = await runChecks(url);
    if (failures.length) {
      console.error(`smoke: FAIL\n- ${failures.join("\n- ")}`);
      return 1;
    }
    console.log("smoke: pass (CSP enforced, page hydrates, no errors)");
    return 0;
  } finally {
    // detached gives the server its own process group; kill all of it.
    if (server.pid) {
      try {
        process.kill(-server.pid, "SIGTERM");
      } catch {
        // already gone
      }
    }
  }
};

main().then(
  (code) => process.exit(code),
  (err) => {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`smoke: couldn't run: ${msg}`);
    if (/Executable doesn't exist/.test(msg)) {
      console.error(
        "Install the browser: " +
          "pnpm exec playwright-core install chromium-headless-shell",
      );
    }
    process.exit(2);
  },
);
