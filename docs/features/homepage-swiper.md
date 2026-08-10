# Homepage swiper

**File:** `js/swiper.js` (export: `swiperInit`)

## What it does

Initializes a Swiper.js carousel on `.is-slider-instructors` (homepage "works"/instructors slider), delayed 800ms after call (to let Webflow's own render settle first). Config: `slidesPerView: 1.25` scaling up to `2.25`/`3.25` at 500px/768px breakpoints, `loop: true`, `freeMode` with momentum disabled, `autoWidth: true`.

Slides also call `hpWorksSwiper.update()` on `mouseenter`/`mouseleave` to re-measure, since slides expand on hover (changing their width). The carousel also re-measures on window `resize`.

Autoplay is present in the config but commented out.

No-ops if `.is-slider-instructors` or `.swiper-slide` isn't found on the page.
