# Video progress tracking + Continue Watching

**File:** `js/ms-scripts/video-progress.js` (exports: `videoProgressTracker`, `renderContinueWatching`)

## What it does

Tracks per-lesson watch position/percent for the logged-in member using the Vimeo Player.js SDK, resumes playback where the member left off, paints progress bars on the lesson list, and renders a "Continue Watching" shelf of in-progress lessons on the Favorites page.

- **Vimeo-only.** YouTube-embedded lessons are silently skipped (no Vimeo Player.js hook available) — an explicit decision from when the site had mixed-provider lessons; all current course content has since moved to Vimeo-only.
- **Join key is `${courseSlug}::${videoUrl}`** (the `data-lesson-key` produced by `course.lessons.js`), not the bare video URL — see [course-lesson-list.md](course-lesson-list.md) for why.
- On `lesson:changed`, attaches a `Vimeo.Player` to the swapped iframe. If there's existing, non-completed progress with more than 5 seconds watched, seeks to that position.
- Writes are throttled: at most once per `WRITE_INTERVAL_MS` (15s) and only when percent has moved by more than 2%, plus a final write on `pause`. This keeps writes well under the Data Table rate limit.
- A lesson is marked `completed: true` once watched fraction crosses `COMPLETE_THRESHOLD` (0.97).
- Thumbnails on the Continue Watching shelf are a still of the **specific video**, fetched via Vimeo's public, CORS-open oEmbed endpoint (no API key needed) and cached per video URL — not the course cover image.

## Memberstack Data Table: `video_progress`

Created by hand in the Memberstack dashboard (Data Tables aren't reachable from the client API used here).

| Field | Type |
|---|---|
| `lessonKey` (required) | TEXT |
| `courseSlug`, `courseName`, `lessonName`, `thumbnail` | TEXT |
| `seconds`, `duration`, `percent` | NUMBER |
| `completed` | BOOLEAN |
| `lastWatchedAt` | DATE |

Access: create `MEMBERS_ONLY`, read/update/delete `MEMBER_OWNER`.

**Gotcha:** Memberstack lowercases a field's Key regardless of the Name typed at creation (`lessonKey` → key `lessonkey`). The code reads/writes the lowercase keys, not the camelCase dashboard labels. Not fixable after the fact — check the actual key before adding fields.

**Gotcha:** `video_progress` has **no** `member` reference field — ownership is enforced entirely by the table's `MEMBER_OWNER` access rule. Querying it with `where: { member: ... }` (like `favorites.js` does, since `favorites` *does* have a real `member` field) 400s with `Unknown field: member`. `fetchAllRecords()` here takes a `filterByMember` option for this reason.

## Continue Watching component

Rendered on the Favorites page by `renderContinueWatching()`. Built as a real Webflow **Component** (group: Features, name "Continue Watching", one prop `Title`) — not raw injected HTML:

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

`renderContinueWatching()` finds the template via `[data-cw-template]`, clones it once per in-progress (not completed) lesson — up to the 10 most recently watched — fills in image/duration/progress-width/title/subtitle via plain DOM properties (`.src`, `.textContent`, `.style.width`, `.href`, not `innerHTML`, so no escaping concern), tags each clone `data-cw-clone`, and appends it. If nothing's in progress or the member's logged out, the whole component instance removes itself from the page (`section.remove()`).

**Important gotcha:** the template card is hidden via a CSS class (`cw-template-hidden { display: none }`), *not* Webflow's native per-element visibility toggle — toggling native visibility off strips the element from the published HTML entirely (confirmed empirically), leaving nothing for the JS to clone. Any future JS-cloneable template element in Designer must use a display:none class, never the visibility toggle.

## Removed: lesson-level save/bookmark

A per-lesson "My List" (separate from course-level favorites) was built and then removed at the user's request. Course-level favorites (see [course-favorites.md](course-favorites.md)) are untouched.
