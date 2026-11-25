// @ts-check
/* Production smoke check: build, start, and load the home page in headless
 * Chromium. Catches what build and lint can't: the CSP blocking the app's
 * own scripts (e.g. if `--webpack` is dropped from the build script), or a
 * page that renders but never hydrates.
 *
 * Usage: pnpm smoke            (builds first)
 *        pnpm smoke --no-build (reuses .next from the last build)
 * Exit code 0 = pass, 1 = a check failed, 2 = couldn't run. */
import { chromium } from "playwright-core";

import { build, runMain, startServer } from "./lib/server.mjs";

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
  if (!process.argv.includes("--no-build") && !build()) {
    console.error("smoke: build failed");
    return 1;
  }

  const server = await startServer();
  try {
    const failures = await runChecks(server.url);
    if (failures.length) {
      console.error(`smoke: FAIL\n- ${failures.join("\n- ")}`);
      return 1;
    }
    console.log("smoke: pass (CSP enforced, page hydrates, no errors)");
    return 0;
  } finally {
    server.stop();
  }
};

runMain("smoke", main);
