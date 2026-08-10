# Course favorites ("My List")

**File:** `js/ms-scripts/favorites.js` (export: `favorites`, internally labeled "MEMBERSCRIPT #215")

## What it does

Course-level save/heart button, backed by a Memberstack Data Table. Any element with `[data-favorite-button]` (card heart icon, etc.) toggles a saved state for the course identified by its `data-item-id` / `data-item-name` attributes.

- `[data-favorites-list]` — a saved-only list (a native Webflow Collection List bound to the Courses collection); rows are hidden/shown client-side based on which item IDs are saved.
- `[data-favorites-list-all]` — mentioned in a code comment as the pattern for "full list, hearts fill when saved" (not the primary path exercised by this file).
- `[data-empty-state]` — shown when the saved list is empty.
- `[data-fav-count]` — item count label ("1 Item" / "N Items").

On click of a favorite button: if already saved, deletes the Data Table record; if not, creates one. Button `is-saved` state and the list are refreshed from a single fetch of all the member's records (no per-button extra API calls).

## Memberstack Data Table: `favorites`

Pre-existing table, predates a strict schema.

| Field | Type | Notes |
|---|---|---|
| `member` | MEMBER_REFERENCE | |
| `item` | TEXT | a Webflow CMS item ID |
| `item_member` | TEXT | this is where the item's display name is actually written |

**Gotcha:** there is no `item_name` field on this table — a field once created under the name `item_member` got repurposed for display labels, and since Memberstack locks a field's key at creation, that mismatch can't be renamed. The code targets `item_member`, not `item_name`.

The create call also has a fallback: it first tries writing `item: itemId` as a bare string, and if that throws, retries with `item: { id: itemId }` — accommodating whichever shape the Data Records API expects for that field.

## Config block

Top of the file has a `CONFIG` object (`tableName`, `pageSize`, `savedColor`, `favoritesListItemSelector`, count labels) meant to be edited in place rather than passed in — `savedColor` is written to a CSS custom property (`--ms215-saved-color`) on `documentElement`.
