# Login gate (disabled)

**File:** `js/ms-scripts/login-gate.js`

## What it does

Not currently active — the entire body is commented out and the file isn't imported by either loader. Kept for reference.

The intent, per the commented code: intercept clicks on any `a[href*="/courses/"]` link, check whether the visitor is a logged-in Memberstack member, and either show a signup popup (`.sign-up__popup`) or let the navigation proceed to redirect the member to their first premium lesson.

If reviving this, note it predates the current lesson-URL/course-slug key scheme used elsewhere ([course-lesson-list.md](course-lesson-list.md), [video-progress-tracking.md](video-progress-tracking.md)) and hasn't been touched since.
