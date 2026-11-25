// @ts-check
/* WCAG 2.2 AA audit of the production build, in headless Chromium.
 *
 * axe-core catches what rules can (contrast, names, roles, landmarks) in
 * every page state. The rest are checks axe can't make: reflow at 320 CSS
 * px (= 1280 at 400% zoom), a full keyboard walk (focus ring, not covered,
 * target size, label in name), text spacing, page structure, what the
 * live region announces, and blocked buttons' descriptions read from
 * Chromium's own accessibility tree. A real screen reader pass is still a
 * person's job; this is the floor, not the ceiling.
 *
 * Usage: pnpm a11y            (builds first)
 *        pnpm a11y --no-build (reuses .next from the last build)
 * Exit code 0 = pass, 1 = a check failed, 2 = couldn't run. */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { chromium } from "playwright-core";

import { build, runMain, startServer } from "./lib/server.mjs";

/** @typedef {import("playwright-core").Browser} Browser */
/** @typedef {import("playwright-core").Page} Page */

const AXE_SOURCE = readFileSync(
  createRequire(import.meta.url).resolve("axe-core/axe.min.js"),
  "utf8",
);
const AXE_TAGS = [
  "wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice",
];

const VIDEO = new URL("./fixtures/test.webm", import.meta.url).pathname;
/** Random bytes with a video name: a file no browser can play. */
const BROKEN = {
  name: "broken.mp4",
  mimeType: "video/mp4",
  buffer: Buffer.from(Array.from({ length: 2000 }, (_, i) => (i * 97) % 256)),
};
/** A 1×1 PNG. @param {number} n */
const photo = (n) => ({
  name: `photo-${n}.png`,
  mimeType: "image/png",
  buffer: Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAF" +
      "BQIAX8jx0gAAAABJRU5ErkJggg==",
    "base64",
  ),
});

/** One line per check; failures carry their details. */
const results = /** @type {{ name: string, failures: string[] }[]} */ ([]);
/** @param {string} name @param {string[]} failures */
const record = (name, failures) => {
  results.push({ name, failures });
};

/* ---------- page helpers ---------- */

/** A fresh page at `width`. bypassCSP: our CSP (rightly) blocks the axe
 * script we inject; it doesn't change what the page itself does.
 * @param {Browser} browser @param {string} url @param {number} width
 * @param {Record<string, unknown>} [options] */
const openPage = async (browser, url, width, options = {}) => {
  const context = await browser.newContext({
    viewport: { width, height: 900 },
    bypassCSP: true,
    ...options,
  });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "networkidle" });
  return page;
};

/** @param {Page} page */
const closePage = (page) => page.context().close();

/** @param {Page} page @param {string | typeof BROKEN} file */
const addVideo = async (page, file) => {
  await page.getByLabel("Add video").setInputFiles(file);
};

/** Waits until the shown video can draw a frame. @param {Page} page */
const videoReady = async (page) => {
  await page.waitForFunction(
    () => (document.querySelector("video")?.readyState ?? 0) >= 2,
  );
  await page.waitForTimeout(150);
};

/** Adds `count` photos and waits until the strip holds `total` frames
 * (pass it when frames are already there).
 * @param {Page} page @param {number} count @param {number} [total] */
const addPhotos = async (page, count, total = count) => {
  await page.getByLabel("Add photos").setInputFiles(
    Array.from({ length: count }, (_, i) => photo(i + 1)),
  );
  await page.waitForSelector(`li[data-frame-id] >> nth=${total - 1}`);
};

/* ---------- checks ---------- */

/** axe in one page state. @param {Page} page @param {string} state */
const checkAxe = async (page, state) => {
  await page.addScriptTag({ content: AXE_SOURCE });
  const violations = await page.evaluate(async (tags) => {
    const axe = /** @type {any} */ (window).axe;
    const run = await axe.run(document, {
      runOnly: { type: "tag", values: tags },
    });
    return run.violations.map(
      (/** @type {any} */ v) =>
        `${v.id} (${v.impact}): ` +
        v.nodes.slice(0, 3).map((/** @type {any} */ n) => n.target).join(" | "),
    );
  }, AXE_TAGS);
  record(`axe, ${state}`, violations);
};

/** Every page state, at desktop and 320px.
 * @param {Browser} browser @param {string} url */
const axeEveryState = async (browser, url) => {
  for (const width of [1280, 320]) {
    const page = await openPage(browser, url, width);
    await checkAxe(page, `${width}px empty`);

    await addVideo(page, VIDEO);
    await videoReady(page);
    await checkAxe(page, `${width}px video loaded`);

    await page
      .getByRole("button", { name: "Capture this frame", exact: true })
      .click();
    await addPhotos(page, 2, 3);
    await checkAxe(page, `${width}px with frames`);

    await addVideo(page, BROKEN);
    await page
      .getByRole("button", { name: BROKEN.name, exact: true })
      .click();
    await page.waitForTimeout(1200);
    await checkAxe(page, `${width}px unplayable video shown`);

    await closePage(page);
  }
};

/** 1.4.10: nothing needs sideways scrolling at 320 CSS px.
 * @param {Browser} browser @param {string} url */
const checkReflow = async (browser, url) => {
  const page = await openPage(browser, url, 320);
  await addVideo(page, VIDEO);
  await videoReady(page);
  await addPhotos(page, 3);

  const failures = await page.evaluate(() => {
    const found = [];
    if (document.documentElement.scrollWidth > innerWidth) {
      found.push("the page scrolls sideways");
    }
    for (const element of document.querySelectorAll("*")) {
      const style = getComputedStyle(element);
      if (
        /auto|scroll/.test(style.overflowX) &&
        element.scrollWidth > element.clientWidth + 1
      ) {
        found.push(`scrolls sideways inside: ${element.tagName}`);
      }
    }
    for (const control of document.querySelectorAll("button, label")) {
      const box = control.getBoundingClientRect();
      if (box.width && (box.right > innerWidth + 1 || box.left < -1)) {
        // Icon buttons have no text; their aria-label names them.
        const name = control.getAttribute("aria-label") ||
          control.textContent?.trim();
        found.push(`off screen: ${name}`);
      }
    }
    return found;
  });
  record("reflow at 320px / 400% zoom (1.4.10)", failures);
  await closePage(page);
};

/** Tabs through the whole page. Each stop: a ≥2px focus ring (2.4.7), not
 * covered (2.4.11), ≥44px (we hold 44; 2.5.8 needs 24), visible text
 * inside the accessible name (2.5.3).
 * @param {Browser} browser @param {string} url */
const checkKeyboard = async (browser, url) => {
  const page = await openPage(browser, url, 1280);
  await addVideo(page, VIDEO);
  await videoReady(page);
  await addPhotos(page, 2);
  await page.mouse.click(5, 5);

  const stops = [];
  for (let i = 0; i < 40; i += 1) {
    await page.keyboard.press("Tab");
    await page.waitForTimeout(220); // let the 180ms lift transition land
    const stop = await page.evaluate(() => {
      const focused = /** @type {HTMLElement | null} */ (
        document.activeElement
      );
      if (!focused || focused === document.body) return null;
      const isFile = focused instanceof HTMLInputElement &&
        focused.type === "file";
      // A file input is hidden; its <label> is what shows focus.
      const shown = /** @type {HTMLElement} */ (
        (isFile && focused.closest("label")) || focused
      );
      const style = getComputedStyle(shown);
      const box = shown.getBoundingClientRect();
      const hit = document.elementFromPoint(
        box.left + box.width / 2,
        box.top + box.height / 2,
      );
      return {
        name: focused.getAttribute("aria-label") ||
          shown.textContent?.trim() || focused.tagName,
        tag: focused.tagName,
        text: shown.textContent?.trim() ?? "",
        ring: style.outlineStyle !== "none" &&
          parseFloat(style.outlineWidth) >= 2,
        covered: !hit || !(shown.contains(hit) || hit.contains(shown)),
        size: [Math.round(box.width), Math.round(box.height)],
      };
    });
    if (!stop) break;
    const last = stops[stops.length - 1];
    // The native video controls each report the <video> as focused.
    if (last && stop.tag === "VIDEO" && last.name === stop.name) continue;
    if (stops.length > 2 && stop.name === stops[0]?.name) break;
    stops.push(stop);
  }
  await closePage(page);

  console.log(`  Tab order: ${stops.map((s) => s.name).join(" → ")}`);
  const controls = stops.filter((s) => s.tag !== "VIDEO");
  record(
    "focus ring on every stop (2.4.7)",
    controls.filter((s) => !s.ring).map((s) => s.name),
  );
  record(
    "focused control never covered (2.4.11)",
    stops.filter((s) => s.covered).map((s) => s.name),
  );
  record(
    "targets at least 44px (2.5.8)",
    controls
      .filter((s) => (s.size[0] ?? 0) < 44 || (s.size[1] ?? 0) < 44)
      .map((s) => `${s.name} ${s.size.join("×")}`),
  );
  record(
    "visible label inside the accessible name (2.5.3)",
    controls
      .filter((s) => s.tag === "BUTTON" && s.text &&
        !s.name.toLowerCase().includes(s.text.toLowerCase()))
      .map((s) => `"${s.text}" vs "${s.name}"`),
  );
};

/** Language, title, one h1 then h2s. @param {Browser} browser
 * @param {string} url */
const checkStructure = async (browser, url) => {
  const page = await openPage(browser, url, 1280);
  const found = await page.evaluate(() => ({
    lang: document.documentElement.lang,
    title: document.title,
    headings: [...document.querySelectorAll("h1, h2, h3, h4")].map(
      (h) => `${h.tagName}:${h.textContent?.trim()}`,
    ),
  }));
  await closePage(page);

  const failures = [];
  if (!found.lang.startsWith("en")) failures.push(`lang="${found.lang}"`);
  if (!found.title) failures.push("no page title");
  const [first, ...rest] = found.headings;
  if (!first?.startsWith("H1:") || !rest.every((h) => h.startsWith("H2:"))) {
    failures.push(`headings: ${found.headings.join(", ")}`);
  }
  record("language, title, heading outline (3.1.1, 2.4.2, 1.3.1)", failures);
};

/** 1.4.12: WCAG's text-spacing overrides don't clip anything.
 * @param {Browser} browser @param {string} url */
const checkTextSpacing = async (browser, url) => {
  const page = await openPage(browser, url, 1280);
  await addPhotos(page, 1);
  await page.addStyleTag({
    content:
      "* { line-height: 1.5 !important; letter-spacing: 0.12em !important;" +
      " word-spacing: 0.16em !important; }" +
      " p { margin-bottom: 2em !important; }",
  });
  await page.waitForTimeout(200);
  const clipped = await page.evaluate(() =>
    [...document.querySelectorAll("button, label, p, h1, h2, span")]
      .filter((element) => {
        const style = getComputedStyle(element);
        const hides = style.overflow === "hidden" ||
          style.overflowX === "hidden";
        const spills = element.scrollWidth > element.clientWidth + 2 ||
          element.scrollHeight > element.clientHeight + 2;
        const isControl = element.matches("button, label");
        return (hides || isControl) && spills &&
          !element.classList.contains("sr-only");
      })
      .map((element) => element.textContent?.trim().slice(0, 30) ?? ""),
  );
  await closePage(page);
  record("no clipping with text spacing overrides (1.4.12)", clipped);
};

/** What a screen reader hears through the main flow, from the live
 * region. @param {Browser} browser @param {string} url */
const checkAnnouncements = async (browser, url) => {
  const page = await openPage(browser, url, 1280);
  await page.evaluate(() => {
    const said = /** @type {string[]} */ ([]);
    /** @type {any} */ (window).__said = said;
    const region = document.querySelector("[role=status]");
    if (!region) return;
    new MutationObserver(() => {
      if (region.textContent) said.push(region.textContent);
    }).observe(region, { childList: true, subtree: true, characterData: true });
  });

  await addVideo(page, VIDEO);
  await videoReady(page);
  const capture = page.getByRole("button", {
    name: "Capture this frame",
    exact: true,
  });
  await capture.focus();
  await page.keyboard.press("Enter");
  await page.waitForTimeout(150);
  await addPhotos(page, 1, 2);
  await page.waitForTimeout(150);
  await page
    .getByRole("button", { name: "Remove frame 1 of 2", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await page.waitForTimeout(150);
  await addVideo(page, BROKEN);
  await page.getByRole("button", { name: BROKEN.name, exact: true }).click();
  await page.waitForTimeout(1200);

  const said = /** @type {string[]} */ (
    await page.evaluate(() => /** @type {any} */ (window).__said)
  );
  await closePage(page);

  console.log(`  Announced: ${said.map((s) => `"${s}"`).join(", ")}`);
  const expected = [
    "Frame 1 added.",
    "Frame 2 added.",
    "Frame removed. 1 left.",
  ];
  const missing = expected.filter((text) => !said.includes(text));
  if (!said.some((text) => text.includes("can't play"))) {
    missing.push("the can't-play message");
  }
  record("announcements: capture, add, remove, can't play", missing);
};

/** Blocked buttons describe why, read from Chromium's accessibility tree
 * (not the DOM), and the reason isn't stray text in the reading order.
 * @param {Browser} browser @param {string} url */
const checkBlockedReasons = async (browser, url) => {
  const page = await openPage(browser, url, 1280);
  await addVideo(page, BROKEN);
  await page.waitForTimeout(1200);

  const cdp = await page.context().newCDPSession(page);
  const { nodes } = await cdp.send("Accessibility.getFullAXTree");
  /** @param {string} name */
  const description = (name) =>
    String(
      nodes.find(
        (n) => n.role?.value === "button" && n.name?.value === name,
      )?.description?.value ?? "",
    );
  const tree = await page.locator("body").ariaSnapshot();
  await closePage(page);

  const failures = [];
  if (description("Create slideshow") !== "No frames collected") {
    failures.push(`Create slideshow: "${description("Create slideshow")}"`);
  }
  if (!description("Capture this frame").includes("can't play")) {
    failures.push(
      `Capture this frame: "${description("Capture this frame")}"`,
    );
  }
  const stray = tree
    .split("\n")
    .filter((line) => /^\s*- text: .*(No frames collected)/.test(line));
  failures.push(...stray.map((line) => `stray text: ${line.trim()}`));
  record("blocked buttons say why, once (4.1.2)", failures);
};

/* ---------- run ---------- */

/** @param {string} url */
const runAudit = async (url) => {
  const browser = await chromium.launch();
  try {
    await axeEveryState(browser, url);
    await checkReflow(browser, url);
    await checkKeyboard(browser, url);
    await checkStructure(browser, url);
    await checkTextSpacing(browser, url);
    await checkAnnouncements(browser, url);
    await checkBlockedReasons(browser, url);
  } finally {
    await browser.close();
  }
};

const main = async () => {
  if (!process.argv.includes("--no-build") && !build()) {
    console.error("a11y: build failed");
    return 1;
  }

  const server = await startServer();
  try {
    await runAudit(server.url);
  } finally {
    server.stop();
  }

  for (const { name, failures } of results) {
    console.log(`${failures.length ? "FAIL" : "pass"}  ${name}`);
    for (const failure of failures) console.log(`        ${failure}`);
  }
  const failed = results.filter((r) => r.failures.length).length;
  console.log(
    failed
      ? `a11y: FAIL (${failed} of ${results.length} checks)`
      : `a11y: pass (${results.length} checks)`,
  );
  return failed ? 1 : 0;
};

runMain("a11y", main);
