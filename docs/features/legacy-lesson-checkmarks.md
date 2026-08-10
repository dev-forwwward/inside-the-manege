# Legacy lesson checkmarks

**File:** `js/ms-scripts/course-progress.js` (exports: `courseProgress`, `addCurrentLessonToWatches`)

## What it does

An older, pre-`video-progress.js` "lessons watched" system. Stores a per-course array of watched lesson URLs directly in the member's Memberstack JSON metadata (`getMemberJSON`/`updateMemberJSON`), keyed by the course's title text (`#course-title`), not by course slug or a Data Table.

- `courseProgress()` — on page load, reads the current course's watched-lesson array, computes a completion percentage (`watched / total lesson count`), writes it into `#percentage-done`, `.lessons-done`, and the `.progress-bar-inside` width, and swaps in a checkmark icon (`.play-icon` src) on each `.video-item` whose `data-video` URL is in the watched list.
- `addCurrentLessonToWatches()` — called by `course.lessons.js` after a lesson click (see [course-lesson-list.md](course-lesson-list.md)); reads the member JSON, removes the current lesson's URL from that course's array if already present (dedupe), then unshifts it back to the front, and writes the whole JSON blob back.

Both are no-ops if `.videos-scroll .video-item` isn't present on the page.

## Relationship to video-progress.js

This coexists with the newer `video-progress.js` system ([video-progress-tracking.md](video-progress-tracking.md)) rather than replacing it — the two track different things (a bare watched/not-watched checkmark here vs. resumable seconds/percent/completion there) and key their data differently (bare video URL + course title text here, vs. `${courseSlug}::${videoUrl}` there). Because this file keys off the bare video URL, it inherits the same cross-course collision risk that motivated the lesson-key change in the newer system — a stock/demo video reused across two courses can mark both as "watched" from one view.
