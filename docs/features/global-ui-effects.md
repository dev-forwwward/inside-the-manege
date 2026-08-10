# Global UI effects

**File:** `js/main.js` (export: `mainInit`)

## What it does

Site-wide, always-loaded miscellany run on every page via `script-loader.js`:

- **Smooth scroll** — instantiates Lenis (`window.lenis`, globally available to other scripts) and syncs it with GSAP's `ScrollTrigger` on every Lenis scroll tick. Lenis's own `raf` is driven from GSAP's ticker (rather than its own `requestAnimationFrame` loop) so both stay in lockstep; `gsap.ticker.lagSmoothing(0)` disables GSAP's lag compensation so scroll-linked animations don't visibly catch up after a stutter.
- **Fancybox** — binds any `[data-fancybox]` element to Fancybox lightbox behavior, pausing/resuming Lenis while a lightbox is open/closed so background scroll doesn't fight the modal.
- **Preloader fade-out** — fades `.preloader` to opacity 0 and removes it from the DOM on completion.
- **Copy-link buttons** — any `.copy-to-clipboard` element copies `location.href` to the clipboard on click and briefly shows a `.tooltip` child (adds/removes a `show` class after 1.5s).
