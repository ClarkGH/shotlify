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
  await page
    .getByRole("button", { name: `Remove video ${BROKEN.name}`, exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await page.waitForTimeout(150);

  const said = /** @type {string[]} */ (
    await page.evaluate(() => /** @type {any} */ (window).__said)
  );
  await closePage(page);

  console.log(`  Announced: ${said.map((s) => `"${s}"`).join(", ")}`);
  const expected = [
    "Frame 1 added.",
    "Frame 2 added.",
    "Frame removed. 1 left.",
    "Video removed. Now showing test.webm.",
  ];
  const missing = expected.filter((text) => !said.includes(text));
  if (!said.some((text) => text.includes("won't play here"))) {
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
  if (!description("Capture this frame").includes("won't play here")) {
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

/** Reorder by keyboard (2.5.7's single-pointer alternative to drag, 2.4.3
 * focus order, 4.1.3 status): Enter on a move button moves the frame,
 * focus stays on that button of the same frame (React keeps focus on a
 * keyed node it moves; this fails if that ever stops), and the end button
 * blocks without losing focus. Runs at 320px too, where the strip wraps.
 * @param {Browser} browser @param {string} url */
const checkReorder = async (browser, url) => {
  const failures = [];
  for (const width of [1280, 320]) {
    const page = await openPage(browser, url, width);
    await addPhotos(page, 3);
    await page.waitForTimeout(150); // let "Frame 3 added." land first
    await page.evaluate(() => {
      /** @type {any} */ (window).__said = [];
      const region = document.querySelector("[role=status]");
      if (!region) return;
      new MutationObserver(() => {
        if (region.textContent) {
          /** @type {any} */ (window).__said.push(region.textContent);
        }
      }).observe(region, { childList: true, subtree: true });
    });
    const state = () =>
      page.evaluate(() => ({
        order: Array.from(
          document.querySelectorAll("li[data-frame-id] img"),
          (img) => /** @type {HTMLImageElement} */ (img).alt.split("photo ")[1],
        ),
        focused: document.activeElement?.getAttribute("aria-label") ?? null,
        blocked: document.activeElement?.getAttribute("aria-disabled"),
      }));

    await page
      .getByRole("button", { name: "Move frame 1 of 3 later", exact: true })
      .focus();
    /* [focus first (or null), key, order after, focus after]. Both
     * directions: on an earlier move React moves the focused node itself,
     * on a later move it moves the neighbor. */
    /** @type {[string | null, string, string, string][]} */
    const steps = [
      [null, "Enter", "photo-2.png,photo-1.png,photo-3.png",
        "Move frame 2 of 3 later"],
      [null, " ", "photo-2.png,photo-3.png,photo-1.png",
        "Move frame 3 of 3 later"],
      // Blocked at the end: nothing moves, focus stays.
      [null, "Enter", "photo-2.png,photo-3.png,photo-1.png",
        "Move frame 3 of 3 later"],
      ["Move frame 3 of 3 earlier", "Enter",
        "photo-2.png,photo-1.png,photo-3.png", "Move frame 2 of 3 earlier"],
      [null, "Enter", "photo-1.png,photo-2.png,photo-3.png",
        "Move frame 1 of 3 earlier"],
    ];
    for (const [first, key, order, focused] of steps) {
      if (first) {
        await page.getByRole("button", { name: first, exact: true }).focus();
      }
      await page.keyboard.press(key);
      await page.waitForTimeout(120);
      const now = await state();
      if (now.order.join(",") !== order || now.focused !== focused) {
        failures.push(
          `${width}px after ${key === " " ? "Space" : key}: ` +
            `[${now.order.join(", ")}], focus "${now.focused}"`,
        );
      }
    }
    if ((await state()).blocked !== "true") {
      failures.push(`${width}px: end button isn't aria-disabled`);
    }
    await page.waitForTimeout(150);
    const said = /** @type {string[]} */ (
      await page.evaluate(() => /** @type {any} */ (window).__said)
    );
    const wanted = [
      "Moved to position 2 of 3.",
      "Moved to position 3 of 3.",
      "Moved to position 2 of 3.",
      "Moved to position 1 of 3.",
    ];
    if (said.join("|") !== wanted.join("|")) {
      failures.push(`${width}px announced: ${JSON.stringify(said)}`);
    }
    await closePage(page);
  }
  record("reorder by keyboard: moves, keeps focus, announces", failures);
};

/* ---------- pointer drag (4c) ---------- */

const PHONE = { viewport: { width: 390, height: 700 }, hasTouch: true,
  isMobile: true };
const DESKTOP = { viewport: { width: 1280, height: 900 } };

/** A page for drag checks, with the CSP enforced (unlike openPage): the
 * ghost is positioned from JS, so a CSP slip would show up here. Records
 * violations and announcements, and adds `count` photos.
 * @param {Browser} browser @param {string} url
 * @param {Record<string, unknown>} device @param {number} count */
const openDragPage = async (browser, url, device, count) => {
  const context = await browser.newContext(device);
  await context.addInitScript(() => {
    const w = /** @type {any} */ (window);
    w.__csp = [];
    document.addEventListener("securitypolicyviolation", (e) => {
      w.__csp.push(e.violatedDirective);
    });
  });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "networkidle" });
  await addPhotos(page, count);
  await page.waitForTimeout(150); // let "Frame N added." land first
  await page.evaluate(() => {
    const w = /** @type {any} */ (window);
    w.__said = [];
    const region = document.querySelector("[role=status]");
    if (!region) return;
    new MutationObserver(() => {
      if (region.textContent) w.__said.push(region.textContent);
    }).observe(region, { childList: true, subtree: true });
  });
  return page;
};

/** Frame order as photo numbers, e.g. "312". @param {Page} page */
const frameOrder = (page) =>
  page.evaluate(() =>
    Array.from(
      document.querySelectorAll("li[data-frame-id] img"),
      (img) => /** @type {HTMLImageElement} */ (img).alt
        .match(/photo-(\d+)\.png/)?.[1] ?? "?",
    ).join(","));

/** What was announced and any CSP violations, since the page opened.
 * @param {Page} page */
const dragLog = async (page) => {
  await page.waitForTimeout(150);
  return /** @type {{ said: string[], csp: string[] }} */ (
    await page.evaluate(() => {
      const w = /** @type {any} */ (window);
      return { said: w.__said, csp: w.__csp };
    })
  );
};

/** Center of the nth element matching `selector`.
 * @param {Page} page @param {string} selector @param {number} n */
const centerOf = async (page, selector, n) => {
  const box = await page.locator(selector).nth(n).boundingBox();
  if (!box) throw new Error(`${selector} #${n} isn't on screen`);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
};

/** Mouse: press at `from`, glide to `to`, hold `holdMs`, optionally act
 * mid-drag, then release (at `releaseAt` if given).
 * @param {Page} page @param {{x:number,y:number}} from
 * @param {{x:number,y:number}} to
 * @param {{ holdMs?: number, during?: () => Promise<void>,
 *   releaseAt?: {x:number,y:number} }} [options] */
const mouseDrag = async (page, from, to, options = {}) => {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let step = 1; step <= 10; step += 1) {
    await page.mouse.move(
      from.x + ((to.x - from.x) * step) / 10,
      from.y + ((to.y - from.y) * step) / 10,
    );
  }
  await page.waitForTimeout(options.holdMs ?? 60);
  await options.during?.();
  if (options.releaseAt) {
    await page.mouse.move(options.releaseAt.x, options.releaseAt.y);
  }
  await page.mouse.up();
};

/** Touch through CDP (real touch events, so the browser's own panning
 * applies): press at `from`, slide to `to`, hold `holdMs`, lift.
 * @param {Page} page @param {{x:number,y:number}} from
 * @param {{x:number,y:number}} to @param {number} [holdMs] */
const touchDrag = async (page, from, to, holdMs = 60) => {
  const cdp = await page.context().newCDPSession(page);
  /** @param {"touchStart" | "touchMove" | "touchEnd"} type
   * @param {{x:number,y:number}[]} points */
  const send = (type, points) =>
    cdp.send("Input.dispatchTouchEvent", { type, touchPoints: points });
  await send("touchStart", [from]);
  for (let step = 1; step <= 12; step += 1) {
    await send("touchMove", [{
      x: from.x + ((to.x - from.x) * step) / 12,
      y: from.y + ((to.y - from.y) * step) / 12,
    }]);
    await page.waitForTimeout(16);
  }
  // A still finger: a 1px nudge now and then, as real ones do.
  for (let waited = 0; waited < holdMs; waited += 100) {
    await page.waitForTimeout(100);
    await send("touchMove", [{ x: to.x + ((waited / 100) % 2), y: to.y }]);
  }
  await send("touchEnd", []);
  await page.waitForTimeout(200);
};

/** Mouse drag on desktop: the frame lands in the marked gap, the ghost
 * follows the pointer (fixed, on screen) and goes away after, the move is
 * announced, and the CSP holds. @param {Browser} browser
 * @param {string} url */
const checkMouseDrag = async (browser, url) => {
  const failures = [];
  const page = await openDragPage(browser, url, DESKTOP, 3);
  const from = await centerOf(page, "li[data-frame-id] img", 0);
  const last = await page.locator("li[data-frame-id]").nth(2).boundingBox();
  if (!last) throw new Error("third tile isn't on screen");

  await mouseDrag(page, from, { x: last.x + last.width - 20, y: from.y }, {
    during: async () => {
      const mid = await page.evaluate(() => {
        const ghost = document.querySelector("body > li[aria-hidden]");
        const box = ghost?.getBoundingClientRect();
        return {
          ghost: Boolean(ghost),
          fixed: ghost ? getComputedStyle(ghost).position === "fixed" : false,
          onScreen: Boolean(box && box.top >= 0 && box.bottom <= innerHeight),
          marks: Array.from(document.querySelectorAll("[data-drop]"), (e) =>
            e.getAttribute("data-drop")),
        };
      });
      if (!mid.ghost || !mid.fixed || !mid.onScreen) {
        failures.push(`ghost mid-drag: ${JSON.stringify(mid)}`);
      }
      if (mid.marks.join() !== "after") {
        failures.push(`drop bar mid-drag: ${JSON.stringify(mid.marks)}`);
      }
    },
  });

  const order = await frameOrder(page);
  if (order !== "2,3,1") failures.push(`order after drop: ${order}`);
  if (await page.locator("body > li[aria-hidden]").count()) {
    failures.push("ghost left behind after drop");
  }
  const { said, csp } = await dragLog(page);
  if (said.join("|") !== "Moved to position 3 of 3.") {
    failures.push(`announced: ${JSON.stringify(said)}`);
  }
  if (csp.length) failures.push(`CSP violations: ${csp.join(", ")}`);
  await closePage(page);
  record("drag with a mouse: moves, ghost, announced, CSP holds", failures);
};

/** Mouse in a narrow window (a mobile breakpoint on desktop): tiles stack
 * one per row, so a drag goes straight down. It lands mid-column, and the
 * drop bar runs across the tile (wider than tall), not down its side.
 * @param {Browser} browser @param {string} url */
const checkColumnDrag = async (browser, url) => {
  const failures = [];
  const page = await openDragPage(
    browser, url, { viewport: { width: 390, height: 800 } }, 3,
  );
  await page.locator("li[data-frame-id]").first().scrollIntoViewIfNeeded();
  const from = await centerOf(page, "li[data-frame-id] img", 0);
  const second = await page.locator("li[data-frame-id]").nth(1).boundingBox();
  if (!second) throw new Error("second tile isn't on screen");
  const lefts = await page.evaluate(() =>
    new Set(Array.from(document.querySelectorAll("li[data-frame-id]"),
      (li) => Math.round(li.getBoundingClientRect().left))).size);
  if (lefts !== 1) failures.push("tiles aren't one per row at 390px");

  await mouseDrag(page, from, {
    x: from.x,
    y: second.y + second.height * 0.75,
  }, {
    during: async () => {
      const bar = await page.evaluate(() => {
        const marked = document.querySelector("[data-drop]");
        if (!marked) return null;
        const style = getComputedStyle(marked, "::before");
        return {
          drop: marked.getAttribute("data-drop"),
          wide: parseFloat(style.width) > parseFloat(style.height),
        };
      });
      if (bar?.drop !== "above" || !bar.wide) {
        failures.push(`drop bar mid-drag: ${JSON.stringify(bar)}`);
      }
    },
  });

  const order = await frameOrder(page);
  if (order !== "2,1,3") failures.push(`order after drop: ${order}`);
  const { said, csp } = await dragLog(page);
  if (said.join("|") !== "Moved to position 2 of 3.") {
    failures.push(`announced: ${JSON.stringify(said)}`);
  }
  if (csp.length) failures.push(`CSP violations: ${csp.join(", ")}`);
  await closePage(page);
  record("drag in a one-column strip: mid-column, bar across", failures);
};

/** Nothing moves on Escape, on release outside the strip, or on a plain
 * click (WCAG 2.5.2), and nothing is announced. @param {Browser} browser
 * @param {string} url */
const checkDragCancels = async (browser, url) => {
  const failures = [];
  const page = await openDragPage(browser, url, DESKTOP, 3);
  const from = await centerOf(page, "li[data-frame-id] img", 0);
  const to = await centerOf(page, "li[data-frame-id] img", 2);

  await mouseDrag(page, from, to, {
    during: () => page.keyboard.press("Escape"),
  });
  if ((await frameOrder(page)) !== "1,2,3") failures.push("Escape moved it");

  await mouseDrag(page, from, to, { releaseAt: { x: to.x, y: 20 } });
  if ((await frameOrder(page)) !== "1,2,3") {
    failures.push("release outside the strip moved it");
  }

  await page.mouse.click(from.x, from.y);
  if ((await frameOrder(page)) !== "1,2,3") failures.push("a click moved it");

  if (await page.locator("body > li[aria-hidden]").count()) {
    failures.push("ghost left behind");
  }
  const { said, csp } = await dragLog(page);
  if (said.length) failures.push(`announced: ${JSON.stringify(said)}`);
  if (csp.length) failures.push(`CSP violations: ${csp.join(", ")}`);
  await closePage(page);
  record("drag cancels: Escape, release outside, click (2.5.2)", failures);
};

/** Touch on a phone: a finger on a photo scrolls the page and moves
 * nothing; a finger on the handle drags straight down into the middle of
 * the column. (Dropping at the end isn't enough: a column misread as one
 * row once passed that by luck.) @param {Browser} browser
 * @param {string} url */
const checkTouchDrag = async (browser, url) => {
  const failures = [];
  const page = await openDragPage(browser, url, PHONE, 3);
  await page.locator("li[data-frame-id]").first().scrollIntoViewIfNeeded();

  const photoAt = await centerOf(page, "li[data-frame-id] img", 0);
  const before = await page.evaluate(() => scrollY);
  await touchDrag(page, photoAt, { x: photoAt.x, y: photoAt.y - 150 });
  if ((await frameOrder(page)) !== "1,2,3") {
    failures.push("a finger on a photo moved the frame");
  }
  if ((await page.evaluate(() => scrollY)) === before) {
    failures.push("a finger on a photo didn't scroll the page");
  }

  await page.locator("li[data-frame-id]").first().scrollIntoViewIfNeeded();
  const grip = await centerOf(page, "[data-drag-handle]", 0);
  const second = await page.locator("li[data-frame-id]").nth(1).boundingBox();
  if (!second) throw new Error("second tile isn't on screen");
  // Straight down onto the second tile's lower half: between 2 and 3.
  await touchDrag(page, grip, {
    x: grip.x,
    y: second.y + second.height * 0.75,
  });
  const order = await frameOrder(page);
  if (order !== "2,1,3") failures.push(`handle drag order: ${order}`);

  const { said, csp } = await dragLog(page);
  if (said.join("|") !== "Moved to position 2 of 3.") {
    failures.push(`announced: ${JSON.stringify(said)}`);
  }
  if (csp.length) failures.push(`CSP violations: ${csp.join(", ")}`);
  await closePage(page);
  record("drag by touch: handle drags, photo scrolls", failures);
};

/** Auto-scroll: holding at the strip's edge on desktop scrolls the strip;
 * holding at the bottom of a phone scrolls the page, stopping with the
 * strip still under the finger. Both drop the frame last.
 * @param {Browser} browser @param {string} url */
const checkAutoScroll = async (browser, url) => {
  const failures = [];
  const count = 10;
  const lastFirst = "2,3,4,5,6,7,8,9,10,1";

  const desk = await openDragPage(browser, url, DESKTOP, count);
  const edge = await desk.locator("ol").evaluate((ol) => {
    const zone = /** @type {HTMLElement} */ (ol.parentElement);
    const box = zone.getBoundingClientRect();
    return { right: box.right, overflow: zone.scrollWidth - zone.clientWidth };
  });
  if (edge.overflow <= 0) failures.push("desktop strip doesn't overflow");
  const from = await centerOf(desk, "li[data-frame-id] img", 0);
  await mouseDrag(desk, from, { x: edge.right - 8, y: from.y },
    { holdMs: 1500 });
  const scrolled = await desk.locator("ol").evaluate((ol) =>
    /** @type {HTMLElement} */ (ol.parentElement).scrollLeft);
  if (scrolled !== edge.overflow) {
    failures.push(`desktop strip scrolled ${scrolled} of ${edge.overflow}`);
  }
  const deskOrder = await frameOrder(desk);
  if (deskOrder !== lastFirst) failures.push(`desktop order: ${deskOrder}`);
  const deskLog = await dragLog(desk);
  if (deskLog.csp.length) failures.push(`CSP: ${deskLog.csp.join(", ")}`);
  await closePage(desk);

  const phone = await openDragPage(browser, url, PHONE, count);
  await phone.locator("li[data-frame-id]").first().scrollIntoViewIfNeeded();
  const grip = await centerOf(phone, "[data-drag-handle]", 0);
  const top = await phone.evaluate(() => scrollY);
  await touchDrag(phone, grip, { x: 120, y: 695 }, 2500);
  if ((await phone.evaluate(() => scrollY)) <= top) {
    failures.push("phone page didn't scroll");
  }
  const phoneOrder = await frameOrder(phone);
  if (phoneOrder !== lastFirst) failures.push(`phone order: ${phoneOrder}`);
  const phoneLog = await dragLog(phone);
  if (phoneLog.said.join("|") !== "Moved to position 10 of 10.") {
    failures.push(`phone announced: ${JSON.stringify(phoneLog.said)}`);
  }
  await closePage(phone);
  record("drag auto-scroll: strip on desktop, page on a phone", failures);
};

/* ---------- gallery (4d) ---------- */

/** The native <dialog> gallery, for real: axe while it's open; opened
 * from the keyboard with focus on Close; Tab never leaves it; the page
 * behind is inert; arrow keys step and the title follows; every dialog
 * button has a ring and 44px; Esc closes with focus back on the View
 * button of the frame it ended on; a backdrop click closes it.
 * @param {Browser} browser @param {string} url */
const checkGallery = async (browser, url) => {
  const failures = [];
  const page = await openPage(browser, url, 1280);
  await addPhotos(page, 3);

  await page
    .getByRole("button", { name: "View frame 1, photo photo-1.png",
      exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await page.waitForTimeout(150);

  const state = () =>
    page.evaluate(() => {
      const dialog = document.querySelector("dialog");
      const active = document.activeElement;
      return {
        modal: Boolean(dialog?.matches(":modal")),
        title: dialog?.querySelector("h2")?.textContent ?? null,
        inside: Boolean(dialog && active && dialog.contains(active)),
        active: active?.getAttribute("aria-label") ??
          active?.textContent?.trim() ?? null,
      };
    });

  const opened = await state();
  if (!opened.modal) failures.push("Enter on View didn't open a modal");
  if (opened.title !== "Frame 1 of 3") {
    failures.push(`title on open: ${opened.title}`);
  }
  if (opened.active !== "Close") {
    failures.push(`focus on open: "${opened.active}"`);
  }

  await checkAxe(page, "1280px gallery open");

  // Tab around: focus stays in the dialog (or the browser's own UI).
  for (let i = 0; i < 6; i += 1) {
    await page.keyboard.press("Tab");
    await page.waitForTimeout(120);
    const stop = await page.evaluate(() => {
      const dialog = document.querySelector("dialog");
      const active = /** @type {HTMLElement | null} */ (
        document.activeElement
      );
      if (!dialog || !active || active === document.body) return null;
      const style = getComputedStyle(active);
      const box = active.getBoundingClientRect();
      return {
        name: active.textContent?.trim() ?? active.tagName,
        inside: dialog.contains(active),
        ring: style.outlineStyle !== "none" &&
          parseFloat(style.outlineWidth) >= 2,
        size: [Math.round(box.width), Math.round(box.height)],
      };
    });
    if (!stop) continue;
    if (!stop.inside) failures.push(`Tab left the dialog: ${stop.name}`);
    if (!stop.ring) failures.push(`no focus ring: ${stop.name}`);
    if ((stop.size[0] ?? 0) < 44 || (stop.size[1] ?? 0) < 44) {
      failures.push(`small target: ${stop.name} ${stop.size.join("×")}`);
    }
  }

  // The page behind is inert: it can't take focus.
  await page
    .getByRole("button", { name: "Create slideshow", exact: true })
    .focus()
    .catch(() => undefined);
  if (!(await state()).inside) failures.push("page behind took focus");

  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(100);
  const stepped = await state();
  if (stepped.title !== "Frame 2 of 3") {
    failures.push(`after ArrowRight: ${stepped.title}`);
  }

  await page.keyboard.press("Escape");
  await page.waitForTimeout(150);
  const closed = await state();
  if (closed.modal) failures.push("Esc didn't close it");
  if (closed.active !== "View frame 2, photo photo-2.png") {
    failures.push(`focus after Esc: "${closed.active}"`);
  }

  // Backdrop: open again, click a corner outside the dialog box. (If it
  // never closed, the dialog covers the tile: record that, don't hang.)
  const reopened = await page
    .getByRole("button", { name: "View frame 3, photo photo-3.png",
      exact: true })
    .click({ timeout: 3000 })
    .then(() => true, () => false);
  if (!reopened) {
    failures.push("couldn't reopen it from a tile");
  } else {
    await page.waitForTimeout(150);
    await page.mouse.click(5, 5);
    await page.waitForTimeout(150);
    if ((await state()).modal) {
      failures.push("backdrop click didn't close it");
    }
  }

  await closePage(page);
  record("gallery: modal, focus trapped and returned, keys, backdrop",
    failures);
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
    await checkReorder(browser, url);
    await checkMouseDrag(browser, url);
    await checkColumnDrag(browser, url);
    await checkDragCancels(browser, url);
    await checkTouchDrag(browser, url);
    await checkAutoScroll(browser, url);
    await checkGallery(browser, url);
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
