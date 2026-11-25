# Claude's Rules and Regulations for Shotlify

Portfolio project. Clark is the quality bottleneck on purpose: every line must be understood by him, so optimize for reviewability, not speed. When in doubt, ask.

Shotlify is the frontend (Next.js pages router, Tailwind, on Vercel). It talks to the render API directly from the browser; there's no backend of its own. The leftover tRPC scaffold is unused and slated for removal. Rendering happens in a separate repo, `node_images_to_slideshow`, which has its own CLAUDE.md.

## Where things live

- [README.md](README.md) - Clark's words. Never "fix" its wording; propose edits and ask.
- `.claude/spikes/` (local, gitignored) - the current spike: plan, ADRs, system design, WCAG review, security plan. Context only; when a spike finishes, its decisions become regular docs and the spike is archived.
- `.claude/prototypes/` (local) - standalone HTML prototypes, opened locally.
- [scripts/smoke.mjs](scripts/smoke.mjs) - production smoke check (see below).

## Hard rules

Breaking one knowingly is Clark's call, never yours. Flag it instead.

- **pnpm only.** One-off tools run with `pnpm dlx`, never `npx`.
- **Builds use webpack** (`--webpack` in the `build` and `dev` scripts). Turbopack puts an inline script on every page, which the CSP blocks. Removing the flag means moving the CSP to nonces first.
- **The CSP lives in [next.config.mjs](next.config.mjs).** No inline scripts, no third-party scripts, no new origins without changing the policy on purpose. Never add `'unsafe-inline'` or `'unsafe-eval'`.
- **WCAG 2.2 AA** for every UI change: contrast, visible focus, names on controls, nothing that relies on motion or drag alone.
- **Public files say what's protected, never limits, numbers, or known gaps.** Those stay in the local spike or in chat.
- American spelling.

## Commands

- `pnpm exec tsc --noEmit` - typecheck
- `pnpm lint` - ESLint 9 flat config ([eslint.config.mjs](eslint.config.mjs)). No errors; keep it that way
- `pnpm build` / `pnpm start` - production build and server
- `pnpm smoke` - builds, starts, and loads the page in headless Chromium: CSP header present and enforced, page hydrates, no console errors. `--no-build` reuses the last build
- `pnpm dev` - dev server (no CSP in dev)

## What "done" means

Typecheck clean, lint with no errors, and `pnpm smoke` passing when the build or CSP inputs changed. Hooks enforce all three (`.claude/settings.json`). No test runner yet: when a slice brings in vitest, `pnpm test` joins the list. If a check is red and you can't fix it in-scope, stop and say why. Don't weaken, skip, or delete a check to get green.

Bugs here tend to pass build and lint and still break the live page: a blocked script, a page that never hydrates, a control with no name. Check in a real browser, not just the compiler.

## How we work

1. **Ask**: default. Explain, brainstorm, surface trade-offs. No edits.
2. **Plan**: when the approach isn't clear yet. Propose and wait for approval.
3. **Agent**: only once the context is all there and Clark has said go.

- Clark writes the seam (interfaces, types, props), Claude fills in the body.
- One moving part per slice. Checks green before the next slice starts.
- Small diffs. No drive-by refactors, no speculative abstraction (YAGNI).
- After a slice, ask Clark questions about the why instead of supplying it. Don't write his reasoning for him.
- Docs edits: propose them, don't make them silently.
- Clark commits. Don't commit, and don't ask to.
- No parallel agents or worktrees writing code.
