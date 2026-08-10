# Nav menu

**File:** `js/menu.js` (export: `navBarMenu`)

## What it does

Site-wide header/nav behavior, loaded on every page via `script-loader.js`. Three independent pieces in one function:

### Mobile menu drawer

`#menu-trigger` toggles `.mobile-dropdown-menu` open/closed:
- **Open**: locks body scroll (fixed position + top offset trick, preserves scroll position), animates the drawer and its links in with a GSAP timeline (staggered fade/slide).
- **Close**: reverses the scroll lock, restores scroll position via `window.scrollTo`, fades the drawer out with GSAP and hides it (`display: none`) on completion.

### Header accordion (`PBAccordionMenu`)

A generic accordion driven entirely by `pb-*` data attributes (`pb-component-menu="accordion"`, `pb-accordion-element-menu="group|accordion|trigger|content|arrow|plus"`), independent of the FAQ accordion in `faqs.js`. On init, resets every accordion item closed, then re-opens whichever one `pb-accordion-initial` on the group points to (1-indexed, or `"none"`). Supports `pb-accordion-single-menu="true"` to auto-close sibling items when one opens. Open/close animate `max-height`/`opacity` via `requestAnimationFrame` + a `transitionend` listener that snaps `max-height` to `none` once open (so content isn't clipped if it later grows) or `visibility: hidden` once closed.

### Scroll hide/reveal + submenu image crossfade

- On scroll, `.navbar_component` slides up out of view (`top: -{navHeight}px`) when scrolling down past 10px, and back into view when scrolling up — skipped entirely while the mobile menu is open. Also toggles a `scrolled` class past 50px of scroll.
- Hovering a `.item_list_dropdown` link crossfades `#submenu-image`'s visible layer (two stacked `.col_img` elements, alternated by index) to that link's `data-img` URL. Uses `img.decode()` when available for a tear-free swap, falling back to a `load` listener. No-ops if there are fewer than 2 image layers or no dropdown links.
