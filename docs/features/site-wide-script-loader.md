# Site-wide script loader

**Files:** `js/script-loader.js`, `js/features/course-loader.js`

## What it does

Webflow's site-wide custom code (Head/Footer) pulls this repo's JS/CSS straight from jsdelivr's GitHub CDN at runtime — there's no build step or deploy pipeline:

```
https://cdn.jsdelivr.net/gh/dev-forwwward/inside-the-manege@dev/<path>?v=<timestamp>
```

`script-loader.js` is loaded on every page (footer) and dynamically imports + calls the general site scripts: `main.js`, `menu.js`, `swiper.js`, `works.js`, `form.js`, `footer-date.js`, `faqs.js`.

`course-loader.js` is a **separate**, page-specific loader pasted into the custom code of course/lesson pages only (its own `<script type="module">` tag, not bundled into `script-loader.js`). It imports and calls: `course.lessons.js`, `course-progress.js`, `favorites.js`, `video-progress.js` (`videoProgressTracker` + `renderContinueWatching`), `plan-select.js`, `guest-pass.js` (`guestPass` + `guestPassRedeem`). It's safe to load on every page anyway since each imported function no-ops if its target elements aren't present.

Both loaders generate a fresh `?v=Date.now()` query param on every page load and use `Promise.all` to import all modules in parallel before calling their exported init functions.

## Local dev override

Append `?dev=true` to any page URL and the loader pulls from `http://127.0.0.1:5500/...` (VSCode Live Server) instead of the CDN, falling back to the CDN if the local file 404s.

## Cache invalidation

Push to `dev` → `.github/workflows/purge-jsdelivr.yml` purges jsdelivr's cache for changed `.js`/`.css`/`.html` files. It only triggers on pushes to `main`, not `dev` — if the working branch is renamed again, that workflow's trigger needs updating too.

jsdelivr's branch-alias cache can stay stale for a while even after an explicit purge call — a known, pre-existing limitation. If a change isn't showing up, check `raw.githubusercontent.com/dev-forwwward/inside-the-manege/dev/<path>` to confirm GitHub has the right content, then wait.

## Gotcha: branch naming

jsdelivr's CDN force-parses any ref starting with `v` + a digit (`v2.0.0`, `v2-dev`, etc.) as an npm-style semver version and tries to resolve it against release tags, never as a literal branch. The working branch was renamed `v2.0.0-base` → `v2-dev` → `dev` for exactly this reason. Never use a branch name matching `^v\d`.
