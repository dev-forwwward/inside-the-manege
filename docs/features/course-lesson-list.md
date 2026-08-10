# Course lesson list

**File:** `js/features/course.lessons.js` (export: `courseLessons`)

## What it does

There's no separate "Videos" CMS collection — each Course CMS item has one `videos` RichText field encoding lessons as plain paragraphs with a group-marker convention:

```
{{group_start}}
group: Getting clients
Pilot | https://player.vimeo.com/video/153749651?h=50b23c33ff | 3:03
Cute Poison | https://player.vimeo.com/video/153748906?h=847b19281c | 3:06
{{group_end}}
```

On page load, `courseLessons()` walks the rendered rich-text children (`.rich-groups-videos > *`), detects `{{group_start}}`/`{{group_end}}`/`group:` marker lines, splits the remaining lines on `|` into `[name, videoUrl, duration]`, and builds `.video-item` rows grouped under `.video-group` headers. The generated HTML is written into `.videos-scroll` via jQuery `.html()`.

Each row gets:
- `data-lesson` — URL-encoded lesson name, used as the `?lesson=` query param value
- `data-video` — the raw playable embed URL (iframe src)
- `data-lesson-key` — `${courseSlug}::${videoUrl}`, the key used by progress tracking (see below)

## Lesson switching

Clicking a `.video-item`: swaps `.video-lesson iframe`'s `src` to the clicked row's video URL, sets the `active` class, pushes a `?lesson=` query param via `history.pushState`, and dispatches a `lesson:changed` CustomEvent (`{ videoUrl, lessonKey }`) that `video-progress.js` listens for to (re)attach its Vimeo Player instance. It also calls the legacy `addCurrentLessonToWatches()` (see [legacy-lesson-checkmarks.md](legacy-lesson-checkmarks.md)) after a short delay.

On page load, if a `?lesson=` query param is present, the matching row is auto-clicked. A `.start-first-lesson` button triggers the first row and scrolls to the player.

Total lesson count and total duration are computed and written into `.course-lessons-count` / `.course-time-count` on window `load`.

## Why the lesson key is prefixed with the course path

Stock/demo lesson videos can be the exact same URL across two different courses. A bare video URL would let progress-tracking writes on one course's lesson collide with another's — this actually happened (the same "Pilot" video URL reused in two courses corrupted each other's progress) until the `${courseSlug}::${videoUrl}` key was introduced. `data-video` stays the raw playable URL for the iframe/Vimeo lookups; `data-lesson-key` is what progress tracking and Memberstack records key off.

## Security note

CMS rich-text-derived values (lesson/group titles, durations) are interpolated into an HTML string later assigned via `.html()`. Every interpolated value is passed through a local `escapeHtml()` before insertion — this content is technically member-writable if someone with CMS edit access (or a compromised account) sets a crafted title, so any new interpolated value must go through `escapeHtml()` too.
