# Inside the Manège — v2

Course platform: Webflow (pages, CMS, hosting) + Memberstack (auth, plans, Data Tables) + a small vanilla JS/CSS layer hosted in this repo and pulled into Webflow via jsdelivr. No build step, no framework, no bundler.

---

## DEV side (this repo)

### How code reaches the site

There's no deploy step. Webflow's site-wide custom code (Site Settings → Custom Code → Head/Footer) fetches this repo's files straight from jsdelivr's GitHub CDN at runtime:

```
https://cdn.jsdelivr.net/gh/dev-forwwward/inside-the-manege@dev/<path>?v=<timestamp>
```

- `js/script-loader.js` and `js/features/course-loader.js` are the two entry points loaded site-wide (footer). `script-loader.js` dynamically imports and calls the general site scripts (`main.js`, `menu.js`, `swiper.js`, `works.js`, `form.js`, `footer-date.js`). `course-loader.js` dynamically imports and calls the course/lesson/progress scripts — it's loaded on every page but every function inside it no-ops if its target elements aren't present, so it's safe site-wide.
- `css/styles.css` and `css/favorites.css` load the same way from the head.
- **Local dev**: append `?dev=true` to any page URL and the loader pulls from `http://127.0.0.1:5500/...` (VSCode Live Server) instead, falling back to the CDN if the local file 404s. Cache-busted with `?v=Date.now()` on every load either way.
- Push to `dev` → `.github/workflows/purge-jsdelivr.yml` purges jsdelivr's cache for changed `.js`/`.css`/`.html` files automatically. It only triggers on pushes to `main`, not `dev` — if you rename the working branch again, update that workflow's trigger too.

### ⚠️ Branch naming — do not use `v<digit>...` names

jsdelivr's GitHub CDN force-parses any ref starting with `v` + a digit (`v2.0.0`, `v2.0.0-base`, `v2-dev`, etc.) as an npm-style semver version and tries to resolve it against release **tags**, never as a literal branch — confirmed on this repo and independently on a random public repo (`twbs/bootstrap@v4-dev` 404s the same way). The working branch was renamed `v2.0.0-base` → `v2-dev` → **`dev`** for exactly this reason. Keep using `dev`, or if you rename again, pick something that doesn't match `^v\d`.

Also: jsdelivr's **branch-alias cache** can stay stale for a while even after an explicit `purge.jsdelivr.net` call — this is a known, pre-existing limitation (documented in `script-loader.js`'s own header comment before this cycle's work). If a change isn't showing up on the CDN, check `raw.githubusercontent.com/dev-forwwward/inside-the-manege/dev/<path>` directly to confirm GitHub has the right content, then just wait — it's not a code bug.

### File layout

```
js/
  script-loader.js          site-wide loader: main.js, menu.js, swiper.js, works.js, form.js, footer-date.js
  main.js, menu.js, swiper.js, works.js, form.js, footer-date.js, faqs.js
  features/
    course-loader.js        course/lesson-page loader: course.lessons.js, course-progress.js, favorites.js, video-progress.js
    course.lessons.js        parses a course's `videos` rich-text field into .video-item rows + wires lesson clicks
  ms-scripts/
    course-progress.js       legacy Memberstack JSON-based "lessons watched" checkmarks (per-course array of watched lesson URLs)
    favorites.js              course-level "My List" / save-a-course, generic [data-favorite-button] handler, Memberstack Data Table `favorites`
    video-progress.js         Vimeo Player.js progress tracking + Continue Watching shelf, Memberstack Data Table `video_progress`
    login-gate.js              disabled/unused, kept for reference
css/
  styles.css, favorites.css, faqs.css, menu.css
```

### Course/lesson content model

There's no separate "Videos" CMS collection. Each Course CMS item has one `videos` RichText field encoding lessons as plain paragraphs with a group-marker convention:

```
{{group_start}}
group: Getting clients
Pilot | https://player.vimeo.com/video/153749651?h=50b23c33ff | 3:03
Cute Poison | https://player.vimeo.com/video/153748906?h=847b19281c | 3:06
{{group_end}}
```

`course.lessons.js` parses this client-side into `.video-item` rows on page load, and handles lesson switching (click → swap the `.video-lesson iframe` src, push a `?lesson=` query param, dispatch a `lesson:changed` custom event).

### Video progress tracking (`video-progress.js`)

- Vimeo-only. YouTube-embedded lessons are silently skipped (no Vimeo Player.js hook available) — this was an explicit decision when the site had mixed-provider lessons; all current course content has since moved to Vimeo-only.
- **Join key is `${courseSlug}::${videoUrl}`**, not the bare video URL — stock/demo lesson videos can be the exact same URL across two different courses, and a bare-URL key let progress on one course's lesson collide with another's (this actually happened — same "Pilot" video URL reused in two courses corrupted each other's progress until this was fixed). `data-video` on each `.video-item` stays the raw playable embed URL (iframe src, Vimeo detection, oEmbed thumbnail lookup); the new `data-lesson-key` attribute is what progress tracking and Memberstack records key off.
- Thumbnails on the Continue Watching shelf are a still of the **specific video** (via Vimeo's public, CORS-open oEmbed endpoint — no API key needed), not the course cover image, cached per video URL.
- Memberstack Data Table schema is documented in the comment at the top of `video-progress.js`. **Field keys in Memberstack are locked at creation and lowercased from whatever Name you typed** (`lessonKey` → key `lessonkey`) — the code writes/reads the lowercase keys, not the camelCase names shown in the dashboard. This is not fixable after the fact; if you add fields, check the actual key, not just the label.
- `video_progress` has no `member` reference field — ownership is enforced entirely by the table's `MEMBER_OWNER` read/update/delete access rule. Querying it with `where: { member: ... }` (like `favorites.js` does, since `favorites` *does* have a real `member` field) 400s with "Unknown field: member". See `fetchAllRecords()`'s `filterByMember` option.
- The Continue Watching shelf renders by **cloning a real Designer-built template**, not by building an HTML string. See "Continue Watching component" below.

### Removed: lesson-level save/bookmark

A per-lesson "My List" (separate from the existing course-level favorites) was built and then removed at the user's request. Course-level favorites (`favorites.js`, the `favorites` Data Table, the heart button on course cards) are untouched and still work as before.

### Security note

`course.lessons.js` interpolates CMS rich-text-derived values (lesson/group titles, durations) into an HTML string later assigned via `.html()`. All such values are passed through `escapeHtml()` in that file before interpolation — don't add a new interpolated value without escaping it, since this content is technically member-writable if someone with CMS edit access (or a compromised account) sets a crafted title.

### Testing

No test suite. Verify changes live:
1. `?dev=true` on a page URL to pull from local Live Server (fast iteration, no CDN wait).
2. Or push to `dev`, wait for jsdelivr to catch up (or confirm via `raw.githubusercontent.com` + a `purge.jsdelivr.net` call), then test the plain URL.
3. Webflow-side structural changes (new elements, styles, pages) need an explicit **Publish** (via Designer or the `data_sites_tool` API) before they're live — Data Table/CMS edits often need this too, not just custom-code edits.

---

## Webflow side

### Site

- Name: **Inside the Manège v2**, site ID `6a6343116c0d2134c16653c1`.
- Staging domain: `https://fwd-inside-the-manege-v2.webflow.io` — **the shortName has changed at least once already** (`fwd-inside-the-manege-v2-0-0` → `fwd-inside-the-manege-v2`). If a staging URL suddenly 404s everywhere, check whether the shortName changed (Site Settings) before assuming something broke.
- No custom/production domain attached yet (`customDomains: []`) — everything is on the `.webflow.io` staging host for now.
- Primary locale shows as `enabled: false` in the site config — flagged for awareness, not something this work touched or fully investigated.

### Pages relevant to this feature

- **Favorites** (`/favorites`, nav label "My progress") — hosts the "Continue watching" shelf and the existing course-level "Saved courses" grid (a native Webflow Collection List bound to the Courses collection, filtered client-side by `favorites.js`).
- **Courses Template** (`/courses`, bound to the Courses collection) — the course detail page: video player, lesson list, "Related courses."
- **Home** (renamed from "New Home") and **Library** — newer pages, part of the site's broader ongoing restructure, not built by this work.

### Courses CMS collection

One collection, no separate Videos/Lessons collection. Key fields: `name`, `slug`, `image` (course cover, used as thumbnail fallback), `videos` (RichText, the lesson list — see DEV side above), plus various course-detail fields (description, level, trailer, etc.) — see `get_collection_details` for the full field list if needed.

### Memberstack

- Data Tables used:
  - **`favorites`** — pre-existing, course-level saves. Fields: `member` (MEMBER_REFERENCE), `item` (TEXT — a Webflow CMS item ID, despite being on a table that predates a strict schema), `item_member` (TEXT — this is where `favorites.js` actually writes its "item name" data; a field named `item_name` doesn't exist on this table, and since Memberstack locks a field's key at creation, that mismatch can't be renamed — the JS was fixed to target `item_member` instead of assuming `item_name`).
  - **`video_progress`** — new this cycle. Schema and access rules documented in `js/ms-scripts/video-progress.js`'s header comment. **Not reachable from any Webflow/MCP tool** — created and edited entirely by hand in the Memberstack dashboard.
- Field keys are locked forever once created and are auto-lowercased from the typed Name (see DEV side note above) — double-check the actual key in the Fields panel, not the bold display Name, before writing code against a table.

### "Continue Watching" component

Built as a real Webflow **Component** (group: Features, name: "Continue Watching", one prop: `Title`), not raw injected HTML. Structure:

```
Continue Watching (component)
  .favorites_header > h2 (bound to Title prop)
  #continue-watching-shelf (.continue-watching_shelf)
    [hidden template card] — data-cw-template, class continue-watching-card + cw-template-hidden
      .continue-watching-thumb-wrap
        img (data-cw-img)
        duration badge (data-cw-duration)
        .video-progress-track.cw-progress-track > .video-progress-fill (data-progress-fill)
      title (data-cw-title)
      subtitle (data-cw-subtitle)
```

`renderContinueWatching()` in `video-progress.js` finds the template via `[data-cw-template]`, clones it once per in-progress lesson, fills in the image/duration/progress width/title/subtitle via plain DOM properties (`.src`, `.textContent`, `.style.width`, `.href` — not `innerHTML`, so no escaping/XSS concern here), tags each clone `data-cw-clone`, and appends it. If nothing's in progress or the member's logged out, the whole component instance removes itself from the page (`section.remove()`).

**Important gotcha**: the template card is hidden via a CSS class (`cw-template-hidden { display: none }`), *not* Webflow's native per-element visibility toggle — toggling native visibility off **strips the element from the published HTML entirely** (confirmed empirically), which would leave nothing for the JS to clone. If you ever need to hide a JS-cloneable template element in Designer, always use a display:none class, never the visibility toggle.

Styles referenced by this component (`continue-watching-card`, `continue-watching-thumb-wrap`, `continue-watching-thumb-img`, `video-duration-badge`, `video-progress-track` + combo `cw-progress-track`, `video-progress-fill`, `continue-watching-title`, `continue-watching-subtitle`, `cw-template-hidden`) are real registered Webflow styles, editable in the Designer style panel like any other class.

### Publishing

Changes made via the Webflow API (elements, styles, CMS, custom code) sit in the Designer draft until explicitly published. This project publishes to the Webflow subdomain only (`publishToWebflowSubdomain: true`) — there's no production/custom domain target configured yet.
