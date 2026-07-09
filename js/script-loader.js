// Cache-busted dynamic imports: jsdelivr/browsers cache static `import` specifiers
// hard (branch-alias staleness even after purge). A fresh query param per load
// forces a real fetch every time, so pushes to main show up immediately.
const v = Date.now();
const [
    { mainInit },
    { navBarMenu },
    { swiperInit },
    { works },
    { form },
    { footerDate },
] = await Promise.all([
    import(`./main.js?v=${v}`),
    import(`./menu.js?v=${v}`),
    import(`./swiper.js?v=${v}`),
    import(`./works.js?v=${v}`),
    import(`./form.js?v=${v}`),
    import(`./footer-date.js?v=${v}`),
]);

// not all script files are being loaded by default (example: faqs...)

mainInit();
navBarMenu();
swiperInit();
works();
form();
footerDate();

console.log("Loading main scripts loader");