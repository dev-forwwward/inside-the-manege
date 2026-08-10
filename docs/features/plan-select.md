# Plan / gift amount select

**File:** `js/ms-scripts/plan-select.js` (export: `planSelect`)

## What it does

A "select a card, then hit one Continue button" pattern shared by two pages: `/plans` (choosing a subscription price) and `/gift/purchase` (choosing a gift amount).

- Each option card is a `[data-plan-select]` button carrying `data-price-id`. Clicking one just toggles which card is visually highlighted (`is-selected` class, label text swapped between "Select"/"Selected" via `[data-select-label]`) — no Memberstack call happens on the card click itself.
- The actual Memberstack action lives only on the single `[data-plan-continue]` button. This script keeps that button's Memberstack attribute pointed at whichever option is currently selected.
- Which Memberstack attribute to drive is read off the continue button's own `data-ms-attr` (e.g. `price:update` for a plan checkout vs. `price:add` for a gift amount), defaulting to `price:update` — so `/plans` doesn't need to set it explicitly.
- The middle card (assumed to be the recommended plan) is pre-selected on load.

No-ops if there are no `[data-plan-select]` buttons or no `[data-plan-continue]` button on the page.
