# Work case links

**File:** `js/works.js` (export: `works`)

## What it does

On the homepage and Works page, every `.work_case_link` element has a CMS-bound `slug` attribute appended onto its existing `href` (`link.href += link.getAttribute('slug')`) — used to point a generic card link at a specific case-study/work item's dynamic URL. No-ops if there are no `.work_case_link` elements on the page.
