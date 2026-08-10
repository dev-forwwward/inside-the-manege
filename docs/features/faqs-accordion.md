# FAQs accordion

**File:** `js/faqs.js` (export: `faqs`)

## What it does

A generic accordion (`PBAccordionFAQS`, based on a public "PageBlock accordion with plus" pattern) driven by `pb-*` data attributes: `pb-component="accordion-faqs"`, `pb-accordion-element="group|accordion|trigger|content|arrow|plus"`.

Behaviorally identical to the `PBAccordionMenu` class in [nav-menu.md](nav-menu.md) — same `pb-accordion-initial` (1-indexed open-on-load index) and `pb-accordion-single` (auto-close siblings) attributes, same `max-height`/`opacity` animation via `requestAnimationFrame` + `transitionend` — but scoped to a different attribute namespace (`pb-component`/`pb-accordion-element` vs. `pb-component-menu`/`pb-accordion-element-menu`) so the two accordions never target each other's markup. Kept as a fully separate class/file rather than a shared one; if both need a fix, apply it in both places.
